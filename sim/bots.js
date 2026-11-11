// Bots y mano de blackjack compartidos por los simuladores.
import { createDeck, drawPile, handTotal } from '../src/core/deck.js';
import { resolveHand, runEffects } from '../src/core/scoring.js';
import { comboEffect } from '../src/core/combos.js';

// ---- Estrategias de pedir carta ----
const standOn = (n) => (player) => handTotal(player) < n;
// Estrategia básica simplificada: contra carta baja del dealer (2-6) se planta en 12+, si no, en 17.
const basicHit = (player, dealerUp) => {
  const t = handTotal(player);
  if (dealerUp >= 2 && dealerUp <= 6) return t < 12;
  return t < 17;
};

// Doblar clásico: 11 siempre, 10 salvo contra 10/A, 9 contra 3-6 del dealer.
export const doubleBasic = (p, up) => {
  const t = handTotal(p);
  if (p.length !== 2 || p.some((c) => c.rank === 'A')) return false;
  return t === 11 || (t === 10 && up <= 9) || (t === 9 && up >= 3 && up <= 6);
};

const round5 = (x) => Math.round(x / 5) * 5;

// ---- Bots: bet(state) → apuesta; hit(player, dealerUp) → ¿pide carta? ----
// state = { fichas, goal, handsLeft, last: 'win'|'lose'|'push'|null, lastBet, minBet }
// Descarte simple: con mano rígida (12-16) tira la carta más alta para robar otra.
export const discardStiff = (p) => {
  const t = handTotal(p);
  if (p.length !== 2 || t < 12 || t > 16) return -1;
  return p[0].value >= p[1].value ? 0 : 1;
};
// Descarte hacia combo: con dos cartas del mismo palo o con par ya hecho no descarta; si no, tira la carta más baja con total ≤ 11.
const discardLow = (p) => {
  const t = handTotal(p);
  if (p.length !== 2 || t > 11 || p.some((c) => c.rank === 'A')) return -1;
  return p[0].value <= p[1].value ? 0 : 1;
};

export const BOTS = [
  { name: 'mínimo', hit: standOn(17), bet: (s) => s.minBet },
  { name: 'conservador', hit: standOn(17), bet: (s) => round5(s.fichas * 0.1) },
  { name: 'medio', hit: standOn(16), bet: (s) => round5(s.fichas * 0.2) },
  { name: 'agresivo', hit: standOn(15), bet: (s) => round5(s.fichas * 0.4) },
  { name: 'all-in', hit: standOn(15), bet: (s) => s.fichas },
  {
    // Sube la apuesta cuando gana (×1.5) y vuelve a la base cuando pierde.
    name: 'racha (sube al ganar)',
    hit: standOn(16),
    bet: (s) => (s.last === 'win' ? round5(s.lastBet * 1.5) : round5(s.fichas * 0.15)),
  },
  {
    // Lo contrario: baja al ganar (protege) y duplica al perder (martingala).
    name: 'martingala (sube al perder)',
    hit: standOn(16),
    bet: (s) => (s.last === 'lose' ? s.lastBet * 2 : round5(s.fichas * 0.1)),
  },
  {
    // Apuesta lo que haga falta por mano para llegar a la meta.
    name: 'perseguidor de meta',
    hit: standOn(16),
    bet: (s) => Math.ceil((s.goal - s.fichas) / s.handsLeft / 5) * 5,
  },
  {
    // Aprieta al principio del nivel y se vuelve cauto cuando ya casi llega.
    name: 'cauto cerca de meta',
    hit: standOn(16),
    bet: (s) => (s.fichas >= s.goal * 0.85 ? s.minBet : round5(s.fichas * 0.3)),
  },
  { name: 'estrategia básica', hit: basicHit, bet: (s) => round5(s.fichas * 0.2) },
  {
    // Mismo que 'medio' pero dobla con 10 u 11 (y 9 contra carta baja del dealer).
    name: 'medio + doblar 9-11',
    hit: standOn(16),
    bet: (s) => round5(s.fichas * 0.2),
    double: doubleBasic,
  },
  {
    // Mismo que 'perseguidor' pero dobla con 9-11.
    name: 'perseguidor + doblar 9-11',
    hit: standOn(16),
    bet: (s) => Math.ceil((s.goal - s.fichas) / s.handsLeft / 5) * 5,
    double: doubleBasic,
  },
  {
    // Estrategia básica completa + doblar 9-11.
    name: 'básica + doblar 9-11',
    hit: basicHit,
    bet: (s) => round5(s.fichas * 0.2),
    double: doubleBasic,
  },
  {
    name: 'perseguidor + doblar + descartar rígida',
    hit: standOn(16),
    bet: (s) => Math.ceil((s.goal - s.fichas) / s.handsLeft / 5) * 5,
    double: doubleBasic,
    discard: discardStiff,
  },
  {
    name: 'perseguidor + doblar + descartar baja',
    hit: standOn(16),
    bet: (s) => Math.ceil((s.goal - s.fichas) / s.handsLeft / 5) * 5,
    double: doubleBasic,
    discard: discardLow,
  },
  {
    // All-in en la primera mano de la ronda; después apuesta el 20 %.
    name: 'all-in 1ª mano',
    hit: standOn(16),
    bet: (s) => (s.first ? s.fichas : round5(s.fichas * 0.2)),
  },
];

export function playHand(pile, bot, bet, cfg, fichas = Infinity, st = { discards: 0 }) {
  const player = [pile.pop(), pile.pop()];
  const dealer = [pile.pop(), pile.pop()];
  const dealerUp = dealer[0].value === 11 ? 11 : dealer[0].value;
  // Descartar: quitas una carta de tu mano y robas otra. Máx. 1 por mano; los descartes son del dealer (st.discards).
  if (st.discards > 0 && bot.discard) {
    const i = bot.discard(player, dealerUp);
    if (i >= 0) {
      st.discards--;
      player[i] = pile.pop();
    }
  }
  // Doblar: duplica la apuesta, recibes UNA carta más y te plantas.
  // Solo en la primera decisión (2 cartas) y si te alcanzan las fichas.
  const doubled = cfg.allowDouble && bot.double?.(player, dealerUp) && fichas >= bet * 2;
  if (doubled) {
    bet *= 2;
    player.push(pile.pop());
  } else while (bot.hit(player, dealerUp) && handTotal(player) <= 21) player.push(pile.pop());
  const T = handTotal(player);
  while (T <= 21 && handTotal(dealer) < cfg.dealerStand) dealer.push(pile.pop());
  const D = handTotal(dealer);
  // Combos de mano: fichas y multi base (antes de jokers, que el simulador aún no usa).
  const { F, M } = cfg.combos ? runEffects([comboEffect(player)], {}) : { F: 0, M: 1 };
  return resolveHand({ T, D, dealerBust: D > 21, bet, F, M, twoCards: player.length === 2, cfg });
}

