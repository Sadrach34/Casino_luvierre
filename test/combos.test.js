import test from 'node:test';
import assert from 'node:assert/strict';
import { detectComboId, comboEffect } from '../src/core/combos.js';
import { runEffects } from '../src/core/scoring.js';
import { makeCard } from '../src/core/deck.js';

const h = (...cards) => cards.map(([r, s = 'hearts']) => makeCard(r, s));

test('sin combo: cartas sueltas de palos distintos', () => {
  assert.equal(detectComboId(h(['2'], ['9', 'spades'])), null);
});
test('par', () => assert.equal(detectComboId(h(['9'], ['9', 'spades'])), 'pair'));
test('doble par', () => assert.equal(detectComboId(h(['2'], ['2', 'spades'], ['3'], ['3', 'clubs'])), 'twoPair'));
test('tercia', () => assert.equal(detectComboId(h(['4'], ['4', 'spades'], ['4', 'clubs'])), 'trips'));
test('color: 3 cartas del mismo palo', () => assert.equal(detectComboId(h(['2'], ['5'], ['9'])), 'flush'));
test('escalera 4-5-6 (palos distintos)', () =>
  assert.equal(detectComboId(h(['4'], ['5', 'spades'], ['6', 'clubs'])), 'straight'));
test('escalera con As bajo y alto', () => {
  assert.equal(detectComboId(h(['A'], ['2', 'spades'], ['3', 'clubs'])), 'straight');
  assert.equal(detectComboId(h(['Q'], ['K', 'spades'], ['A', 'clubs'])), 'straight'); // Q-K-A, el As baja a 1 (total 21)
});
test('triple siete', () => assert.equal(detectComboId(h(['7'], ['7', 'spades'], ['7', 'clubs'])), 'sevens'));
test('cinco cartas sin pasarse', () =>
  assert.equal(detectComboId(h(['A'], ['2', 'spades'], ['3', 'clubs'], ['4', 'hearts'], ['5', 'spades'])), 'five'));
test('21 con 3 cartas', () => assert.equal(detectComboId(h(['5'], ['6', 'spades'], ['K', 'clubs'])), 'twentyOne'));
test('bust no tiene combo', () => assert.equal(detectComboId(h(['K'], ['K', 'spades'], ['5', 'clubs'])), null));
test('21 natural de 2 cartas no cuenta como combo', () => assert.equal(detectComboId(h(['A'], ['K', 'spades'])), null));
test('comboEffect suma F y multiplica M antes de otros efectos', () => {
  const hand = h(['9'], ['9', 'spades']);
  const r = runEffects([comboEffect(hand), { apply: (a) => { a.F += 5; } }], {});
  assert.equal(r.F, 15);
  assert.equal(r.M, 1.2);
});
