// Estado de una partida completa (lógica pura, sin UI).
// Flujo: menú → dealers → mesa (manos) → resultado → tienda → siguiente dealer … hasta perder.
import { CONFIG } from './config.js';
import { createDeck, makeCard, handTotal } from './deck.js';
import { makeStreams } from './rng.js';
import { dealerGoal, dealerCoins } from './goals.js';
import { dealHand, hit, stand, doubleDown, discard, canDouble, canDiscard, dealerStep, resolve } from './round.js';
import { DEALERS } from '../data/dealers.js';
import { jokerEffects } from '../data/jokers.js';
import { cardEffects } from './cards.js';
import { hasRune, runeJokerSlots, runeExtraHands, interestUnit, runeCoins, multiWinFactor } from './runes.js';

export function createRun({ seed, mode = 'infinite', cfg = CONFIG } = {}) {
  const streams = makeStreams(seed);
  return {
    seed, mode, cfg, streams,
    phase: 'dealers', // dealers | table | result | shop | over
    mesa: 1,
    dealerIdx: 0,
    fichas: cfg.startFichas,
    coins: cfg.startCoins,
    interestCap: cfg.interestCap,
    deck: createDeck(), // mazo del jugador (se modifica con la tienda y los tarots)
    pile: [], // mazo de robo de este dealer
    discardPile: [],
    jokers: [], consumables: [], runes: [], vouchers: [],
    // estado del dealer actual
    handsLeft: 0, wins: 0, discardsLeft: 0, beaten: false, goal: 0, hand: null, handsThisDealer: 0,
    reward: null,
    shop: null,
    skipped: [], // ids de dealers saltados en esta mesa
    stats: {
      hands: 0, wins: 0, losses: 0, pushes: 0, busts: 0, blackjacks: 0, bestNet: 0, streak: 0, bestStreak: 0,
      coinsEarned: 0, coinsSpent: 0, rerolls: 0, tarotsUsed: 0, jokersSold: 0, dealersBeaten: 0, doubles: 0, discards: 0,
      cardPlays: {}, jokerGain: {},
    },
  };
}

export const currentDealer = (run) => DEALERS[run.dealerIdx];
export const currentGoal = (run) => dealerGoal(run.mesa, run.dealerIdx, run.cfg);
export const dealerStandAt = (run) => currentDealer(run).standAt ?? run.cfg.dealerStand;

function shufflePile(run) {
  run.pile = run.streams.deck.shuffle(run.deck.slice());
  run.discardPile = [];
}

/** Empieza la pelea contra el dealer actual. */
export function startDealer(run) {
  run.phase = 'table';
  run.goal = currentGoal(run);
  run.handsLeft = run.cfg.handsPerDealer + runeExtraHands(run);
  run.eihwazUsed = false;
  run.handsThisDealer = 0;
  run.wins = 0;
  run.discardsLeft = run.cfg.discardsPerDealer;
  run.beaten = false;
  run.hand = null;
  shufflePile(run);
  return run;
}

export const minBet = (run) => Math.min(run.cfg.minBet, run.fichas);
export const maxBet = (run) => run.fichas;
export const clampBet = (run, bet) => Math.max(minBet(run), Math.min(maxBet(run), bet));

/** Reparte una mano nueva. */
export function beginHand(run, bet) {
  if (run.hand && run.hand.phase !== 'done') throw new Error('Ya hay una mano en curso');
  if (run.handsLeft <= 0) throw new Error('No quedan manos');
  if (run.pile.length < run.cfg.reshuffleBelow) shufflePile(run); // se rebaraja al quedar pocas
  bet = clampBet(run, bet);
  run.hand = dealHand({ pile: run.pile, bet, standAt: dealerStandAt(run) });
  run.lastBet = bet;
  return run.hand;
}

export const actions = {
  hit: (run) => {
    const h = hit(run.hand, run.pile);
    // Eihwaz: una vez por dealer, la carta que te haría pasarte se descarta y sigues jugando.
    if (h.busted && hasRune(run, 'eihwaz') && !run.eihwazUsed) {
      run.eihwazUsed = true;
      run.discardPile.push(h.player.pop());
      h.busted = false; h.phase = 'player';
      h.saved = true;
    }
    return h;
  },
  stand: (run) => stand(run.hand),
  double: (run) => { run.stats.doubles++; return doubleDown(run.hand, run.pile); },
  discard: (run, index) => {
    if (!canDiscard(run.hand, run.discardsLeft)) throw new Error('No puedes descartar');
    run.discardsLeft--; run.stats.discards++;
    const out = discard(run.hand, index, run.pile);
    run.discardPile.push(out);
    return out;
  },
  canDouble: (run) => canDouble(run.hand, run.fichas - 0, run.cfg),
  canDiscard: (run) => !!run.hand && canDiscard(run.hand, run.discardsLeft),
  dealerStep: (run) => dealerStep(run.hand, run.pile),
};

/** Juega todo el turno del dealer de golpe (para pruebas y bots). */
export function finishDealerTurn(run) {
  const h = run.hand;
  if (h.phase === 'dealer') { while (dealerStep(h, run.pile) !== 'stand'); }
  return h;
}

/** Cierra la mano: aplica el pago, actualiza estadísticas y revisa si venciste / perdiste. */
/** Efectos de la mano en orden: runas de inicio → jokers (izq→der) → cartas de la mano. */
export function handEffects(run, h) {
  const out = [];
  if (hasRune(run, 'sowilo')) out.push({ apply: (a) => { a.M *= 1.1; } });
  let jk = jokerEffects(run.jokers, run);
  if (hasRune(run, 'kenaz') && jk.length) jk = [jk[0], ...jk]; // Kenaz: el primer joker se activa dos veces
  out.push(...jk);
  if (hasRune(run, 'uruz')) out.push({ apply: (a) => { a.F += 5; } });
  if (hasRune(run, 'ehwaz')) out.push({ apply: (a) => { a.F += 10; } }); // la primera carta de tu mano da +10 fichas
  out.push(...cardEffects(h.player));
  return out;
}

export function settleHand(run) {
  const h = run.hand;
  const first = run.handsThisDealer === 0; // primera mano de este dealer
  const cfg = run.runes.length ? { ...run.cfg, multiWinFactor: multiWinFactor(run) } : run.cfg;
  const res = resolve(h, { effects: handEffects(run, h), cfg });
  // Wunjo: la primera mano de cada dealer nunca pierde más del 50 % de la apuesta.
  if (hasRune(run, 'wunjo') && first && res.net < 0) res.net = Math.max(res.net, -Math.floor(res.bet / 2));
  // Thurisaz: si pierdes con 20 o 21 recuperas el 25 % de la apuesta.
  if (hasRune(run, 'thurisaz') && res.net < 0 && !h.busted && res.T >= 20) res.net += Math.floor(res.bet * 0.25);
  run.fichas += res.net;
  run.handsLeft--;
  run.handsThisDealer++;
  const st = run.stats;
  st.hands++;
  const won = res.net > 0;
  if (h.busted) st.busts++;
  if (res.result === 'blackjack') st.blackjacks++;
  if (won) { st.wins++; run.wins++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); }
  else if (res.net < 0) { st.losses++; st.streak = 0; } else st.pushes++;
  st.bestNet = Math.max(st.bestNet, res.net);
  for (const c of h.player) { const k = `${c.rank}${c.suit}`; st.cardPlays[k] = (st.cardPlays[k] ?? 0) + 1; }
  run.discardPile.push(...h.player, ...h.dealer);
  if (!run.beaten && run.fichas >= run.goal && run.wins >= run.cfg.winsRequired) run.beaten = true;
  res.status = status(run);
  // Dagaz: una vez por partida, si fallas, superas el dealer igual (la runa se consume).
  if (res.status === 'lost' && hasRune(run, 'dagaz')) {
    run.runes = run.runes.filter((r) => r !== 'dagaz');
    run.beaten = true; run.wins = Math.max(run.wins, run.cfg.winsRequired);
    res.status = 'beaten'; res.dagaz = true;
  }
  return res;
}

/** 'beaten' | 'continue' | 'lost' */
export function status(run) {
  if (run.beaten) return run.handsLeft > 0 && run.fichas >= run.cfg.minBet ? 'beaten' : 'beaten';
  if (run.fichas < run.cfg.minBet || run.handsLeft <= 0) return 'lost';
  return 'continue';
}

export const canFarm = (run) => run.beaten && run.handsLeft > 0 && run.fichas >= run.cfg.minBet;

/** Monedas que cobras al terminar el dealer (README §4). */
export function computeReward(run) {
  const c = run.cfg;
  const extra = Math.max(0, run.fichas - run.goal);
  // Cada línea: id (clave i18n reward.<id>) + parámetros para el texto de apoyo.
  const lines = [
    { id: 'dealer', coins: dealerCoins(run.dealerIdx, c) },
    { id: 'hands', params: { n: run.handsLeft, per: c.coinPerLeftoverHand }, coins: run.handsLeft * c.coinPerLeftoverHand },
    { id: 'chips', params: { n: extra, cap: c.coinPerExtraFichasCap }, coins: Math.min(c.coinPerExtraFichasCap ?? Infinity, Math.floor(extra / c.coinPerExtraFichas)) },
    { id: 'interest', params: { per: interestUnit(run), cap: run.interestCap }, coins: Math.min(run.interestCap, Math.floor(run.coins / interestUnit(run))) },
  ];
  if (runeCoins(run)) lines.push({ id: 'fehu', coins: runeCoins(run) });
  return { lines, total: lines.reduce((a, l) => a + l.coins, 0), before: run.coins };
}

/** Termina la pelea ganada: cobra y pasa a la pantalla de resultado. */
export function endDealer(run) {
  if (!run.beaten) throw new Error('El dealer aún no está vencido');
  const reward = computeReward(run);
  run.coins += reward.total;
  run.stats.coinsEarned += reward.total;
  run.stats.dealersBeaten++;
  run.reward = { ...reward, after: run.coins };
  run.phase = 'result';
  return run.reward;
}

export function gameOver(run) { run.phase = 'over'; return run; }

/** Saltar un dealer (no el jefe): recompensa en monedas y sigue el siguiente. */
export function canSkip(run) { return run.phase === 'dealers' && run.dealerIdx < 2; }
export function skipDealer(run) {
  if (!canSkip(run)) throw new Error('No se puede saltar');
  run.coins += run.cfg.skipReward;
  run.stats.coinsEarned += run.cfg.skipReward;
  run.skipped.push(currentDealer(run).id);
  advanceDealer(run);
  return run;
}

/** Pasa al siguiente dealer (y mesa nueva tras el jefe). */
export function advanceDealer(run) {
  run.dealerIdx++;
  if (run.dealerIdx > 2) { run.dealerIdx = 0; run.mesa++; run.skipped = []; }
  run.phase = 'dealers';
  run.shop = null;
  return run;
}

export const jokerSlotCount = (run) => run.cfg.maxJokers + run.jokers.filter((j) => j.edition === 'negative').length + runeJokerSlots(run);
/**
 * Ids de las cartas que el jugador PUEDE saber que ya salieron en este dealer (vista del mazo, "gastadas").
 * La carta oculta del dealer no cuenta hasta que se revela: si no, el mazo delataría cuál es.
 */
export function knownUsedIds(run) {
  const ids = new Set((run.discardPile ?? []).map((c) => c.id));
  const h = run.hand;
  if (h) {
    for (const c of h.player) ids.add(c.id);
    h.dealer.forEach((c, i) => { if (i > 0 || h.hiddenRevealed) ids.add(c.id); }); // dealer[0] es la carta oculta
  }
  return ids;
}

/** Ansuz: ver la siguiente carta del mazo antes de pedir. */
export const peekNext = (run) => (hasRune(run, 'ansuz') ? run.pile.at(-1) ?? null : null);
export const playerTotalNow = (run) => (run.hand ? handTotal(run.hand.player) : 0);
export { makeCard };
