import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHand, runEffects } from '../src/core/scoring.js';
import { handTotal, makeCard } from '../src/core/deck.js';
import { mulberry32, hashSeed } from '../src/core/rng.js';

const c = (rank, suit = 'hearts') => makeCard(rank, suit);

test('ejemplo 1: yo 7, dealer 9, x1.5 → 10.5 > 9, gano por multi (50%)', () => {
  const r = resolveHand({ T: 7, D: 9, bet: 100, M: 1.5 });
  assert.equal(r.result, 'multiWin');
  assert.equal(r.net, 50);
});

test('ejemplo 2: yo 4, dealer 9, x1.5 → 6 < 9, pierdo y el multi no sirve', () => {
  const r = resolveHand({ T: 4, D: 9, bet: 100, M: 1.5 });
  assert.equal(r.result, 'lose');
  assert.equal(r.net, -100);
});

test('ejemplo 3: yo 14 (2 cartas), dealer 16, x1.5 → 21, blackjack por multi reducido', () => {
  const r = resolveHand({ T: 14, D: 16, bet: 100, M: 1.5, twoCards: true });
  assert.equal(r.result, 'multiWin');
  assert.equal(r.net, 75); // 0.5 × (100×1.5)
});

test('multi que pasa de 21 no se aplica', () => {
  const r = resolveHand({ T: 15, D: 17, bet: 100, M: 2 }); // 30 > 21 → ignora
  assert.equal(r.result, 'lose');
  const w = resolveHand({ T: 18, D: 17, bet: 100, M: 2, F: 20 }); // gana normal, M ignorado
  assert.equal(w.result, 'win');
  assert.equal(w.net, 120);
});

test('victoria normal: (apuesta + F) × M si T×M ≤ 21', () => {
  const r = resolveHand({ T: 10, D: 8, bet: 100, F: 20, M: 2 });
  assert.equal(r.result, 'win');
  assert.equal(r.net, 240);
});

test('bust pierde siempre; dealer bust gana normal; empate devuelve', () => {
  assert.equal(resolveHand({ T: 22, D: 10, bet: 50, M: 3 }).net, -50);
  assert.equal(resolveHand({ T: 12, D: 25, dealerBust: true, bet: 50 }).net, 50);
  assert.equal(resolveHand({ T: 18, D: 18, bet: 50 }).result, 'push');
});

test('blackjack natural paga 3:2', () => {
  const r = resolveHand({ T: 21, D: 20, bet: 100, twoCards: true });
  assert.equal(r.result, 'blackjack');
  assert.equal(r.net, 150);
});

test('orden de efectos: fichas primero y multi al final vale más', () => {
  const chips = { apply: (a) => (a.F += 30) };
  const mult = { apply: (a) => (a.M *= 2) };
  // En este modelo F y M se acumulan por separado; el orden importa para efectos dependientes.
  const scaled = { apply: (a) => (a.M *= 1 + a.F / 100) }; // multi que depende de fichas acumuladas
  const a = runEffects([chips, scaled], {});
  const b = runEffects([scaled, chips], {});
  assert.ok(a.M > b.M);
  assert.equal(runEffects([mult, mult], {}).M, 4);
});

test('Ases bajan de 11 a 1', () => {
  assert.equal(handTotal([c('A'), c('K')]), 21);
  assert.equal(handTotal([c('A'), c('A'), c('9')]), 21);
  assert.equal(handTotal([c('K'), c('Q'), c('5')]), 25);
});

test('misma semilla → misma secuencia; streams independientes', () => {
  const a = mulberry32(hashSeed('2026-11-05:deck'));
  const b = mulberry32(hashSeed('2026-11-05:deck'));
  assert.deepEqual([a.next(), a.next(), a.next()], [b.next(), b.next(), b.next()]);
  assert.notEqual(hashSeed('x:deck'), hashSeed('x:shop'));
});
