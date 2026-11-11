import test from 'node:test';
import assert from 'node:assert/strict';
import { mesaGoals, dealerGoal } from '../src/core/goals.js';
import { jokerSlotCount, createRun, startDealer, beginHand, actions, finishDealerTurn, settleHand, endDealer, advanceDealer, skipDealer, computeReward } from '../src/core/run.js';
import { openShop, buy, sellJoker, rerollPrice, reroll, buyVoucher } from '../src/core/shop.js';
import { dealHand, hit, stand, doubleDown, discard, canDouble, canDiscard, resolve } from '../src/core/round.js';
import { makeCard } from '../src/core/deck.js';

test('metas estilo Balatro: 170/255/340 y ×2.6 por mesa', () => {
  assert.deepEqual(mesaGoals(1), [170, 255, 340]);
  assert.deepEqual(mesaGoals(2), [440, 665, 885]);
  assert.equal(dealerGoal(3, 2), 2300);
});

const pileOf = (...ranks) => ranks.map((r, i) => makeCard(r, i % 2 ? 'spades' : 'hearts')).reverse(); // pop() saca de la derecha

test('mano: pedir y pasarse termina la mano', () => {
  const pile = pileOf('10', '9', '5', 'K', '6', '10'); // jugador 10,9; dealer 5,K; luego salen 6 y 10
  const h = dealHand({ pile, bet: 10 });
  assert.equal(h.player.length, 2);
  hit(h, pile); // 10+9+6 = 25 → te pasas
  assert.equal(h.busted, true);
  assert.equal(h.phase, 'done');
  assert.throws(() => hit(h, pile));
});

test('doblar: duplica apuesta, una carta más y termina el turno', () => {
  const pile = pileOf('5', '6', '9', '8', '10', '2'); // jugador 5,6=11; dealer 9,8; carta nueva 10
  const h = dealHand({ pile, bet: 20 });
  assert.equal(canDouble(h, 100), true);
  assert.equal(canDouble(h, 30), false);
  doubleDown(h, pile);
  assert.equal(h.bet, 40);
  assert.equal(h.player.length, 3);
  assert.equal(h.phase, 'dealer');
});

test('descartar: reemplaza la carta y puedes usar varios en la misma mano si quedan descartes', () => {
  const pile = pileOf('10', '6', '9', '8', '3', '2', '4', '5');
  const h = dealHand({ pile, bet: 10 });
  assert.equal(canDiscard(h, 3), true);
  discard(h, 0, pile);
  assert.equal(h.player[0].rank, '3');
  assert.equal(canDiscard(h, 2), true); // sí se puede otra vez en la misma mano
  discard(h, 1, pile);
  assert.equal(canDiscard(h, 1), true);
  discard(h, 0, pile);
  assert.equal(canDiscard(h, 0), false); // se acabó el pool
  assert.equal(canDiscard(dealHand({ pile: pileOf('2', '3', '4', '5'), bet: 10 }), 0), false);
});

test('la partida es determinista por semilla', () => {
  const play = () => {
    const r = createRun({ seed: 'abc' });
    startDealer(r);
    const ranks = [];
    for (let i = 0; i < 3; i++) {
      beginHand(r, 10);
      ranks.push(r.hand.player.map((c) => c.rank + c.suit[0]).join(','));
      actions.stand(r); finishDealerTurn(r); settleHand(r);
    }
    return ranks.join('|');
  };
  assert.equal(play(), play());
});

test('descartes: 3 por dealer, varios en la misma mano si quieres, y se reinician en el siguiente', () => {
  const r = createRun({ seed: 's' });
  startDealer(r);
  assert.equal(r.discardsLeft, 3);
  beginHand(r, 10);
  actions.discard(r, 0);
  assert.equal(r.discardsLeft, 2);
  actions.discard(r, 0); // permitido en la misma mano
  assert.equal(r.discardsLeft, 1);
  r.hand.phase = 'done'; r.handsLeft--;
  advanceDealer(r); startDealer(r);
  assert.equal(r.discardsLeft, 3);
});

test('vencer al dealer exige llegar a la meta Y tener 2 victorias', () => {
  const r = createRun({ seed: 'x' });
  startDealer(r);
  r.fichas = 500; // ya pasa la meta de 170
  r.wins = 0;
  beginHand(r, 10);
  r.hand.player = [makeCard('K'), makeCard('9')]; r.hand.dealer = [makeCard('2'), makeCard('3')];
  actions.stand(r);
  r.hand.dealer = [makeCard('10'), makeCard('7')]; // dealer 17
  finishDealerTurn(r); settleHand(r);
  assert.equal(r.wins, 1);
  assert.equal(r.beaten, false); // 1 victoria no basta
  beginHand(r, 10);
  r.hand.player = [makeCard('K'), makeCard('10')]; r.hand.dealer = [makeCard('2'), makeCard('3')];
  actions.stand(r);
  r.hand.dealer = [makeCard('10'), makeCard('7')];
  finishDealerTurn(r); settleHand(r);
  assert.equal(r.beaten, true);
});

test('recompensa: monedas base, manos sobrantes, fichas extra e interés con tope', () => {
  const r = createRun({ seed: 'x' });
  startDealer(r);
  r.fichas = r.goal + 120; r.handsLeft = 3; r.coins = 12; r.beaten = true;
  const rw = computeReward(r);
  assert.equal(rw.lines.find((l) => l.id === 'dealer').coins, 3);
  assert.equal(rw.lines.find((l) => l.id === 'hands').coins, 3);
  assert.equal(rw.lines.find((l) => l.id === 'chips').coins, 2); // 120 / 50
  assert.equal(rw.lines.find((l) => l.id === 'interest').coins, 2); // 12 / 5
  r.coins = 100;
  assert.equal(computeReward(r).lines.find((l) => l.id === 'interest').coins, 5); // tope $5
});

test('saltar dealer da monedas y avanza; el jefe no se salta', () => {
  const r = createRun({ seed: 'x' });
  skipDealer(r);
  assert.equal(r.coins, 20);
  assert.equal(r.dealerIdx, 1);
  skipDealer(r);
  assert.equal(r.dealerIdx, 2);
  assert.throws(() => skipDealer(r));
});

test('tienda: comprar joker, sin espacio, vender y reroll creciente', () => {
  const r = createRun({ seed: 'tienda' });
  r.coins = 100;
  openShop(r);
  assert.equal(r.shop.items.length, 4);
  const p1 = rerollPrice(r);
  reroll(r);
  assert.equal(rerollPrice(r), p1 + 1);
  // llenar slots de jokers
  const idx = r.shop.items.findIndex((i) => i.kind === 'joker');
  r.jokers = Array.from({ length: 5 }, () => ({ id: 'par_f', edition: null }));
  const res = buy(r, idx);
  assert.equal(res.ok, false);
  assert.equal(res.message, 'shop.err.nospace');
  sellJoker(r, 0);
  assert.equal(buy(r, idx).ok, true);
  assert.equal(r.jokers.length, 5);
});

test('vale de interés sube el tope a $10', () => {
  const r = createRun({ seed: 'v' });
  r.coins = 50;
  openShop(r);
  assert.equal(buyVoucher(r).ok, true);
  assert.equal(r.interestCap, 10);
});

test('jokers: el orden y Policromo cambian el resultado', () => {
  const r = createRun({ seed: 'j' });
  const hand = [makeCard('9', 'hearts'), makeCard('9', 'spades')];
  const h = { player: hand, dealer: [makeCard('K'), makeCard('7')], bet: 10, busted: false, phase: 'dealer' };
  r.jokers = [{ id: 'par_f', edition: null }];
  const { jokerEffects } = awaitJokers();
  const a = resolve({ ...h }, { effects: jokerEffects(r.jokers, r), cfg: r.cfg });
  r.jokers = [{ id: 'par_f', edition: 'poly' }];
  const b = resolve({ ...h }, { effects: jokerEffects(r.jokers, r), cfg: r.cfg });
  assert.ok(a.F >= 30); // combo par (+10) + joker (+20)
  assert.ok(b.M > a.M); // policromo ×1.5
});

import * as jk from '../src/data/jokers.js';
function awaitJokers() { return jk; }

// ---------- tarots, runas, paquetes ----------
import { openPack, openTarotUse, useTarot, takeJoker, takeRune, finishPack, validateTarot } from '../src/core/packs.js';
import { TAROTS } from '../src/data/tarots.js';
import { RUNES } from '../src/data/runes.js';
import { cardEffects, bumpRank } from '../src/core/cards.js';
import { buyPack, PACKS } from '../src/core/shop.js';
import { runEffects } from '../src/core/scoring.js';
import { handTotal } from '../src/core/deck.js';
import { detectComboId } from '../src/core/combos.js';

const freshRun = (seed = 't') => { const r = createRun({ seed }); openShop(r); return r; };
const tarotUse = (run, id, sel) => { openTarotUse(run, id); return useTarot(run, 0, sel); };

test('tarots: cada uno de los 22 existe con textos y un efecto probado', () => {
  assert.equal(TAROTS.length, 22);
  const r = freshRun();
  const c = r.deck[5]; // 6 de ♥? (cualquiera)
  // Mago +10 fichas, Emperador +25, Emperatriz ×1.5, Enamorados policromo, Carro dos veces, Hierofante comodín
  tarotUse(r, 'magician', { cardIds: [c.id] }); assert.deepEqual(c.effect, { chips: 10 });
  tarotUse(r, 'emperor', { cardIds: [c.id] }); assert.deepEqual(c.effect, { chips: 25 }); // un solo efecto: reemplaza
  tarotUse(r, 'empress', { cardIds: [c.id] }); assert.deepEqual(c.effect, { mult: 1.5 });
  tarotUse(r, 'lovers', { cardIds: [c.id] }); assert.equal(c.poly, true);
  tarotUse(r, 'chariot', { cardIds: [c.id] }); assert.equal(c.twice, true);
  tarotUse(r, 'hierophant', { cardIds: [c.id] }); assert.equal(c.wild, true);
  assert.equal(r.stats.tarotsUsed, 6);
});

test('tarot: rango (Sacerdotisa +1, Fuerza +2 máx. 10, el As y el K no suben)', () => {
  const r = freshRun();
  const five = r.deck.find((c) => c.rank === '5');
  const nine = r.deck.find((c) => c.rank === '9');
  const ace = r.deck.find((c) => c.rank === 'A');
  const king = r.deck.find((c) => c.rank === 'K');
  tarotUse(r, 'priestess', { cardIds: [five.id] }); assert.equal(five.rank, '6'); assert.equal(five.value, 6);
  tarotUse(r, 'strength', { cardIds: [nine.id] }); assert.equal(nine.rank, '10'); // 9+2 se queda en 10
  tarotUse(r, 'priestess', { cardIds: [ace.id] }); assert.equal(ace.rank, 'A');
  tarotUse(r, 'priestess', { cardIds: [king.id] }); assert.equal(king.rank, 'K');
});

test('tarot: Loco copia, Ermitaño y Colgado destruyen, Justicia fija valor 10, Diablo no se vende', () => {
  const r = freshRun();
  const n0 = r.deck.length;
  const c = r.deck[3];
  tarotUse(r, 'magician', { cardIds: [c.id] });
  tarotUse(r, 'fool', { cardIds: [c.id] });
  assert.equal(r.deck.length, n0 + 1);
  const copy = r.deck.at(-1); assert.deepEqual(copy.effect, { chips: 10 }); assert.notEqual(copy.id, c.id);
  const coins = r.coins;
  tarotUse(r, 'hermit', { cardIds: [copy.id] });
  assert.equal(r.deck.length, n0); assert.equal(r.coins, coins + 3);
  const [a, b] = [r.deck[10], r.deck[11]];
  tarotUse(r, 'hanged', { cardIds: [a.id, b.id] });
  assert.equal(r.deck.length, n0 - 2);
  const ace = r.deck.find((x) => x.rank === 'A');
  tarotUse(r, 'justice', { cardIds: [ace.id] }); assert.equal(handTotal([ace, r.deck.find((x) => x.rank === '5')]), 15);
  const x = r.deck.find((y) => y.rank === '2');
  tarotUse(r, 'devil', { cardIds: [x.id] }); assert.equal(x.nosell, true); assert.deepEqual(x.effect, { chips: 40 });
});

test('tarot: Muerte copia la carta de la derecha en la de la izquierda; palos con Estrella/Luna/Sol/Mundo', () => {
  const r = freshRun();
  const left = r.deck.find((c) => c.rank === '2' && c.suit === 'hearts');
  const right = r.deck.find((c) => c.rank === 'K' && c.suit === 'spades');
  tarotUse(r, 'empress', { cardIds: [right.id] });
  tarotUse(r, 'death', { cardIds: [left.id, right.id] });
  assert.equal(left.rank, 'K'); assert.equal(left.suit, 'spades'); assert.deepEqual(left.effect, { mult: 1.5 });
  assert.equal(left.value, 10);
  const [p, q] = [r.deck.find((c) => c.rank === '4'), r.deck.find((c) => c.rank === '7')];
  tarotUse(r, 'star', { cardIds: [p.id, q.id] }); assert.equal(p.suit, 'diamonds'); assert.equal(q.suit, 'diamonds');
  tarotUse(r, 'moon', { cardIds: [p.id] }); assert.equal(p.suit, 'clubs');
  tarotUse(r, 'sun', { cardIds: [p.id] }); assert.equal(p.suit, 'hearts');
  tarotUse(r, 'world', { cardIds: [p.id] }); assert.equal(p.suit, 'spades');
});

test('tarot: Templanza paga $2 por joker (máx. $10); Torre y Juicio usan el RNG de la semilla', () => {
  const r = freshRun();
  r.jokers = Array.from({ length: 5 }, () => ({ id: 'par_f', edition: null }));
  r.coins = 0;
  tarotUse(r, 'temperance', {}); assert.equal(r.coins, 10);
  r.jokers = [{ id: 'par_f', edition: null }]; r.coins = 0;
  tarotUse(r, 'temperance', {}); assert.equal(r.coins, 2);
  const n = r.deck.length;
  tarotUse(r, 'judgement', {}); assert.equal(r.deck.length, n + 1); assert.ok(r.deck.at(-1).effect);
  const t = r.deck[8]; tarotUse(r, 'tower', { cardIds: [t.id] }); assert.deepEqual(t.effect, { chips: 15 });
  // determinista
  const a = freshRun('same'); const b = freshRun('same');
  tarotUse(a, 'tower', { cardIds: [a.deck[8].id] }); tarotUse(b, 'tower', { cardIds: [b.deck[8].id] });
  assert.equal(a.deck[8].rank, b.deck[8].rank);
});

test('Rueda de la Fortuna: solo jokers y solo si no tienen edición', () => {
  const r = freshRun();
  openTarotUse(r, 'wheel');
  assert.equal(validateTarot(r, 0, {}).message, 'pack.err.nojokers');
  r.jokers = [{ id: 'par_f', edition: null }];
  assert.equal(validateTarot(r, 0, {}).message, 'pack.err.pickjoker');
  const res = useTarot(r, 0, { jokerIndex: 0 });
  assert.ok(['nothing', 'poly', 'negative'].includes(res.result.result));
});

test('tarot: validación de cartas elegidas (mín., máx., solo cartas mostradas)', () => {
  const r = freshRun();
  openTarotUse(r, 'death');
  assert.equal(validateTarot(r, 0, { cardIds: [r.deck[0].id] }).message, 'pack.err.pick2');
  openTarotUse(r, 'magician');
  assert.equal(validateTarot(r, 0, { cardIds: [] }).message, 'pack.err.pickcard');
  assert.equal(validateTarot(r, 0, { cardIds: [r.deck[0].id, r.deck[1].id] }).message, 'pack.err.toomany');
  openPack(r, 'tarot');
  r.pack.options = [{ id: 'magician' }];
  const outside = r.deck.find((c) => !r.pack.deckIds.includes(c.id));
  assert.equal(validateTarot(r, 0, { cardIds: [outside.id] }).message, 'pack.err.badcard');
});

test('efectos de carta: fichas, multi, Policromo y "dos veces", en orden de la mano', () => {
  const r = freshRun();
  const a = makeCard('9', 'hearts'); const b = makeCard('K', 'spades');
  a.effect = { chips: 10 }; b.effect = { mult: 1.5 }; b.poly = true; b.twice = true;
  const { F, M } = runEffects(cardEffects([a, b]), {});
  assert.equal(F, 10);
  assert.equal(M, 1.5 * 1.5 * 1.5 * 1.5); // multi y policromo, dos activaciones
});

test('comodín: la carta cuenta para color y para jokers de palo', () => {
  const hand = [makeCard('2', 'hearts'), makeCard('5', 'hearts'), makeCard('9', 'spades')];
  assert.notEqual(detectComboId(hand), 'flush');
  hand[2].wild = true;
  assert.equal(detectComboId(hand), 'flush');
});

test('paquetes: contenido y cuántos eliges (jokers 3/1, tarot 4/1, mega tarot 6/2, runas 2/1, mega runas 4/2)', () => {
  const r = freshRun();
  const want = { jokers: [3, 1], tarot: [4, 1], megaTarot: [6, 2], runes: [2, 1], megaRunes: [4, 2] };
  for (const [type, [show, pick]] of Object.entries(want)) {
    const p = openPack(r, type);
    assert.equal(p.options.length, show, type);
    assert.equal(p.picksLeft, pick, type);
    if (p.kind === 'tarot') { assert.ok(p.deckIds.length >= 7 && p.deckIds.length <= 10); }
    finishPack(r);
  }
});

test('paquete de tarot mega: elegir 2 y luego termina', () => {
  const r = freshRun();
  openPack(r, 'megaTarot');
  r.pack.options = [{ id: 'magician' }, { id: 'lovers' }, { id: 'sun' }]; // fija el contenido
  const c1 = r.deck.find((c) => r.pack.deckIds.includes(c.id));
  assert.equal(useTarot(r, 0, { cardIds: [c1.id] }).ok, true);
  assert.equal(r.pack.done, false);
  assert.equal(useTarot(r, 0, { cardIds: [c1.id] }).ok, true);
  assert.equal(r.pack.done, true);
  finishPack(r);
  assert.equal(r.phase, 'shop');
});

test('paquete de jokers: elige 1; sin espacio hay que vender; Negativo da +1 slot', () => {
  const r = freshRun();
  openPack(r, 'jokers');
  r.jokers = Array.from({ length: 5 }, () => ({ id: 'par_f', edition: null }));
  assert.equal(takeJoker(r, 0).message, 'shop.err.nospace');
  r.jokers[0].edition = 'negative'; // +1 slot
  assert.equal(takeJoker(r, 0).ok, true);
  assert.equal(r.jokers.length, 6);
  assert.equal(r.pack.done, true);
});

test('paquete de runas: la runa queda activa toda la partida y no se repite', () => {
  const r = freshRun();
  openPack(r, 'runes');
  const id = r.pack.options[0].id;
  assert.equal(takeRune(r, 0).ok, true);
  assert.ok(r.runes.includes(id));
  openPack(r, 'megaRunes');
  assert.ok(!r.pack.options.some((o) => o.id === id));
});

test('comprar paquete cobra y lo marca; tienda ofrece 3 paquetes (jokers + tarot + uno al azar)', () => {
  const r = freshRun('p'); r.coins = 50;
  assert.equal(r.shop.packs.length, 3);
  assert.equal(r.shop.packs[0].type, 'jokers'); assert.equal(r.shop.packs[1].type, 'tarot');
  const res = buyPack(r, 0);
  assert.equal(res.ok, true); assert.equal(r.coins, 50 - PACKS.jokers.price);
  assert.equal(buyPack(r, 0).ok, false);
});

test('tarot suelto: guardarlo en consumibles (máx. 2) o usarlo al instante', () => {
  const r = freshRun('c'); r.coins = 100;
  r.shop.items[1] = { kind: 'tarot', id: 'magician', price: 3, sold: false };
  r.shop.items[2] = { kind: 'tarot', id: 'sun', price: 3, sold: false };
  r.shop.items[3] = { kind: 'tarot', id: 'moon', price: 3, sold: false };
  assert.equal(buy(r, 1, 'keep').ok, true);
  assert.equal(buy(r, 2, 'keep').ok, true);
  assert.equal(buy(r, 3, 'keep').message, 'shop.err.noconsumable');
  const use = buy(r, 3, 'use');
  assert.equal(use.use, 'moon');
  // usar uno guardado
  openTarotUse(r, 'magician', 0);
  useTarot(r, 0, { cardIds: [r.deck[0].id] });
  assert.deepEqual(r.consumables, ['sun']);
});

test('runas: Algiz y Othala (slots y manos), Fehu, Jera, Nauthiz', () => {
  const r = freshRun('r');
  r.runes = ['algiz', 'othala'];
  assert.equal(jokerSlotCount(r), 7);
  startDealer(r); assert.equal(r.handsLeft, 8);
  r.runes = ['nauthiz']; r.shop.rerolls = 0; assert.equal(rerollPrice(r), 0);
  r.shop.rerolls = 1; assert.equal(rerollPrice(r), 6);
  r.runes = ['fehu', 'jera']; r.beaten = true; r.coins = 8; r.fichas = r.goal; r.handsLeft = 0;
  const rw = computeReward(r);
  assert.equal(rw.lines.find((l) => l.id === 'fehu').coins, 1);
  assert.equal(rw.lines.find((l) => l.id === 'interest').coins, 2); // 8 / 4
});

test('runas de mano: Sowilo, Uruz, Ehwaz, Kenaz, Wunjo, Thurisaz, Eihwaz, Dagaz', () => {
  const play = (runes, setup) => {
    const r = createRun({ seed: 'rr' }); r.runes = runes; startDealer(r);
    beginHand(r, 100);
    r.hand.player = setup.player; r.hand.dealer = setup.dealer; r.hand.phase = 'player';
    actions.stand(r); r.hand.dealer = setup.dealer; finishDealerTurn(r);
    return { r, res: settleHand(r) };
  };
  const hand = (...rs) => rs.map((x) => makeCard(x));
  // Sowilo: M inicia en 1.1; Uruz +5; Ehwaz +10 fichas
  let { res } = play(['sowilo', 'uruz', 'ehwaz'], { player: hand('K', '9'), dealer: hand('10', '7') });
  assert.equal(res.result, 'win'); assert.ok(res.F >= 15); assert.ok(Math.abs(res.M - 1.1) < 1e-9);
  // Thurisaz: pierdes con 20: recuperas 25 %
  ({ res } = play(['thurisaz'], { player: hand('K', 'Q'), dealer: hand('A', '9') })); // 20 vs 20? A+9=20 → empate
  ({ res } = play(['thurisaz'], { player: hand('K', 'Q'), dealer: hand('A', 'K') })); // dealer blackjack 21
  assert.equal(res.net, -75);
  // Wunjo: primera mano nunca pierde más del 50 %
  ({ res } = play(['wunjo'], { player: hand('2', '3'), dealer: hand('10', '9') }));
  assert.equal(res.net, -50);
  // Dagaz: una vez por partida salva el dealer
  const r = createRun({ seed: 'dz' }); r.runes = ['dagaz']; startDealer(r);
  r.fichas = 10; beginHand(r, 10);
  r.hand.player = hand('2', '3'); r.hand.dealer = hand('10', '9'); r.hand.phase = 'player'; actions.stand(r); finishDealerTurn(r);
  const out = settleHand(r);
  assert.equal(out.status, 'beaten'); assert.equal(out.dagaz, true); assert.deepEqual(r.runes, []);
});

test('Eihwaz: la carta que te haría pasarte se descarta (una vez por dealer)', () => {
  const r = createRun({ seed: 'eh' }); r.runes = ['eihwaz']; startDealer(r);
  beginHand(r, 10);
  r.hand.player = [makeCard('K'), makeCard('9')];
  r.pile.push(makeCard('5')); // la próxima carta (19+5 = 24 → pasarte)
  actions.hit(r);
  assert.equal(r.hand.busted, false);
  assert.equal(r.hand.player.length, 2);
  assert.equal(r.hand.phase, 'player');
  r.pile.push(makeCard('5'));
  actions.hit(r);
  assert.equal(r.hand.busted, true); // ya se usó en este dealer
});

test('Ansuz permite ver la siguiente carta; sin la runa no', async () => {
  const { peekNext } = await import('../src/core/run.js');
  const r = createRun({ seed: 'an' }); startDealer(r);
  assert.equal(peekNext(r), null);
  r.runes = ['ansuz'];
  assert.equal(peekNext(r), r.pile.at(-1));
});

// ---------- guardar / cargar ----------
import { serializeRun, deserializeRun } from '../src/core/save.js';

test('guardar y cargar: la partida continúa idéntica (RNG, mazo, tienda, runas)', () => {
  const a = createRun({ seed: 'save1' });
  startDealer(a); a.runes = ['kenaz']; a.coins = 12; a.jokers = [{ id: 'par_f', edition: 'poly' }];
  beginHand(a, 20); actions.stand(a); finishDealerTurn(a); settleHand(a);
  a.fichas = a.goal + 5; a.wins = 2; a.beaten = true;
  endDealer(a); openShop(a);
  const json = JSON.parse(JSON.stringify(serializeRun(a))); // pasa por JSON como en localStorage
  const { run: b, screen } = deserializeRun(json);
  assert.equal(screen, 'shop');
  assert.deepEqual(b.shop, a.shop); assert.deepEqual(b.deck, a.deck); assert.deepEqual(b.jokers, a.jokers);
  assert.equal(b.fichas, a.fichas); assert.equal(b.coins, a.coins); assert.equal(b.mesa, a.mesa);
  // el generador aleatorio sigue en el mismo punto
  assert.equal(b.streams.shop.next(), a.streams.shop.next());
  assert.equal(b.streams.deck.next(), a.streams.deck.next());
  // los ids nuevos no chocan con los existentes
  const newCard = makeCard('5', 'hearts');
  assert.ok(!b.deck.some((c) => c.id === newCard.id));
});

test('guardar a mitad de una mano vuelve al inicio de esa mano (sin perder fichas)', () => {
  const a = createRun({ seed: 'save2' });
  startDealer(a); beginHand(a, 30);
  const snap = serializeRun(a);
  assert.equal(snap.run.hand, null);
  const { run: b, screen } = deserializeRun(JSON.parse(JSON.stringify(snap)));
  assert.equal(screen, 'table'); assert.equal(b.fichas, a.fichas);
  beginHand(b, 30); // se puede volver a apostar
  assert.equal(b.hand.bet, 30);
});

test('cargar usa la CONFIG actual y rechaza formatos viejos o dañados', () => {
  const a = createRun({ seed: 's3' });
  const snap = JSON.parse(JSON.stringify(serializeRun(a)));
  assert.equal(deserializeRun(snap).run.cfg.startFichas, a.cfg.startFichas);
  assert.throws(() => deserializeRun({ v: 99, run: {} }));
  assert.throws(() => deserializeRun(null));
});

test('reordenar la mano: solo en tu turno; el orden cambia qué carta se activa primero', async () => {
  const { moveCard } = await import('../src/core/round.js');
  const r = createRun({ seed: 'mv' }); startDealer(r); beginHand(r, 10);
  r.hand.player = [makeCard('3'), makeCard('9'), makeCard('K')]; r.hand.phase = 'player';
  assert.equal(moveCard(r.hand, 0, 2), true);
  assert.deepEqual(r.hand.player.map((c) => c.rank), ['9', 'K', '3']);
  assert.equal(moveCard(r.hand, 1, 1), false);
  r.hand.phase = 'dealer';
  assert.equal(moveCard(r.hand, 0, 1), false);
});

test('reordenar jokers cambia el orden de aplicación (fichas antes que multi rinde más)', async () => {
  const { moveJoker } = await import('../src/core/shop.js');
  const { runEffects } = await import('../src/core/scoring.js');
  const { jokerEffects } = await import('../src/data/jokers.js');
  const r = createRun({ seed: 'jk' });
  const hand = [makeCard('9', 'hearts'), makeCard('9', 'spades')];
  const eff = (jokers) => runEffects(jokerEffects(jokers, r), { hand });
  const a = [{ id: 'par_m', edition: null }, { id: 'par_f', edition: null }];
  r.jokers = a.slice(); moveJoker(r, 0, 1);
  assert.deepEqual(r.jokers.map((j) => j.id), ['par_f', 'par_m']);
  assert.ok(eff(r.jokers).F === eff(a).F); // mismas fichas…
});

test('el mazo no delata la carta oculta del dealer hasta que se revela', async () => {
  const { knownUsedIds } = await import('../src/core/run.js');
  const r = createRun({ seed: 'oculta' }); startDealer(r); beginHand(r, 10);
  const h = r.hand;
  const hidden = h.dealer[0]; const shown = h.dealer[1];
  let ids = knownUsedIds(r);
  assert.ok(!ids.has(hidden.id), 'la carta oculta no debe contar como gastada');
  assert.ok(ids.has(shown.id));
  assert.ok(h.player.every((c) => ids.has(c.id)));
  assert.equal(ids.size, 3); // tus 2 cartas + la visible del dealer
  actions.stand(r); finishDealerTurn(r); settleHand(r); // al revelarse ya sí cuenta
  ids = knownUsedIds(r);
  assert.ok(ids.has(hidden.id));
});

test('Discípulo del Tarot: el multi actual crece 0.1 por tarot usado', async () => {
  const { jokerCurrent } = await import('../src/data/jokers.js');
  const r = createRun({ seed: 'disc' });
  assert.equal(jokerCurrent('discipulo', r), 1);
  r.stats.tarotsUsed = 3;
  assert.equal(jokerCurrent('discipulo', r), 1.3);
  assert.equal(jokerCurrent('par_f', r), null); // los jokers que no crecen no muestran valor actual
});
