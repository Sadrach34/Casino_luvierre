// Jokers (README §5). Pasivos, se aplican de izquierda a derecha después del combo base.
// Valores PROVISIONALES: el README define el tipo de efecto pero no las cifras. Textos: joker.<id>.name / .desc en src/i18n.
// Cada efecto recibe el acumulador { F, M, hand, run } y lo modifica.
import { detectComboId } from '../core/combos.js';
import { sameSuit as handSameSuit, matchesSuit } from '../core/cards.js';

const allSuit = (hand, suit) => hand.length >= 2 && hand.every((c) => matchesSuit(c, suit));
const sameSuit = (hand) => hand.length >= 2 && handSameSuit(hand);
const hasPair = (hand) => ['pair', 'twoPair', 'trips'].includes(detectComboId(hand));
const hasTwoPair = (hand) => detectComboId(hand) === 'twoPair';
const hasTrips = (hand) => detectComboId(hand) === 'trips';

export const JOKERS = [
  { id: 'par_f', rarity: 'common', price: 4, art: 0, apply: (a) => { if (hasPair(a.hand)) a.F += 20; } },
  { id: 'par_m', rarity: 'common', price: 5, art: 1, apply: (a) => { if (hasPair(a.hand)) a.M *= 1.4; } },
  { id: 'dpar_f', rarity: 'common', price: 5, art: 0, apply: (a) => { if (hasTwoPair(a.hand)) a.F += 40; } },
  { id: 'dpar_m', rarity: 'uncommon', price: 6, art: 1, apply: (a) => { if (hasTwoPair(a.hand)) a.M *= 1.8; } },
  { id: 'tercia_f', rarity: 'common', price: 5, art: 0, apply: (a) => { if (hasTrips(a.hand)) a.F += 50; } },
  { id: 'tercia_m', rarity: 'uncommon', price: 6, art: 1, apply: (a) => { if (hasTrips(a.hand)) a.M *= 2; } },
  { id: 'color_f', rarity: 'common', price: 5, art: 0, apply: (a) => { if (a.hand.length >= 3 && sameSuit(a.hand)) a.F += 40; } },
  { id: 'color_m', rarity: 'uncommon', price: 6, art: 1, apply: (a) => { if (a.hand.length >= 3 && sameSuit(a.hand)) a.M *= 1.8; } },
  { id: 'mono', rarity: 'uncommon', price: 6, art: 1, apply: (a) => { if (sameSuit(a.hand)) a.M *= 1.5; } },
  ...['hearts', 'diamonds', 'spades', 'clubs'].map((suit) => ({
    id: `palo_${suit}`, rarity: 'uncommon', price: 6, art: 0,
    apply: (a) => { if (allSuit(a.hand, suit)) a.M *= 1.75; },
  })),
  // `current`: multi que da AHORA (se muestra en la descripción).
  { id: 'discipulo', rarity: 'rare', price: 8, art: 1, current: (run) => 1 + 0.1 * (run?.stats?.tarotsUsed ?? 0), apply: (a) => { a.M *= 1 + 0.1 * (a.run?.stats?.tarotsUsed ?? 0); } },
];

/** Valor actual de jokers que crecen (o null). Redondeado a 2 decimales. */
export const jokerCurrent = (id, run) => { const c = JOKER_BY_ID[id]?.current?.(run); return c == null ? null : Math.round(c * 100) / 100; };
export const JOKER_BY_ID = Object.fromEntries(JOKERS.map((j) => [j.id, j]));

/** Edición Policromo: efecto extra justo después del joker (×1.5 multi). Negativo: +1 slot de joker. */
export const EDITIONS = {
  poly: { apply: (a) => { a.M *= 1.5; } },
  negative: {},
};

/** Convierte los jokers de la partida en efectos para runEffects (orden izquierda → derecha). */
export function jokerEffects(jokers, run) {
  return jokers.map((j) => ({
    apply: (acc) => {
      acc.run = run;
      JOKER_BY_ID[j.id].apply(acc);
      if (j.edition === 'poly') EDITIONS.poly.apply(acc); // Policromo: justo después del propio efecto
    },
  }));
}

/** Slots de joker: 5 base + 1 por cada joker Negativo. */
export const jokerSlots = (jokers, base = 5) => base + jokers.filter((j) => j.edition === 'negative').length;
