// Efectos permanentes de las cartas del mazo (los que aplican los tarots, README §5 y §7).
// Una carta puede tener UN efecto (fichas o multi) + edición Policromo; además banderas estructurales
// (comodín de palo, valor fijo 10, se activa dos veces, no se puede vender).
import { RANKS, cardValue, makeCard } from './deck.js';

export const POLY_MULT = 1.5;

export const effectCount = (c) => (c.effect ? 1 : 0) + (c.poly ? 1 : 0);
export const hasAnyFx = (c) => !!(c.effect || c.poly || c.wild || c.value10 || c.twice || c.nosell);

/** Cambia el rango y recalcula el valor (salvo valor fijo 10). */
export function setRank(card, rank) {
  card.rank = rank;
  card.value = card.value10 ? 10 : cardValue(rank);
  return card;
}

/** Sube el rango `n` pasos. El As y el K no suben; `max` limita el rango resultante (índice en RANKS). */
export function bumpRank(card, n, { maxIndex = RANKS.length - 1 } = {}) {
  const i = RANKS.indexOf(card.rank);
  if (card.rank === 'A' || card.rank === 'K') return false;
  const j = Math.min(i + n, maxIndex);
  if (j === i) return false;
  setRank(card, RANKS[j]);
  return true;
}

export const setEffect = (card, effect) => { card.effect = { ...effect }; return card; };

/** Copia exacta (nuevo id) de una carta, con sus efectos. */
export function cloneCard(card) {
  const { id, ...rest } = card;
  return makeCard(card.rank, card.suit, { ...rest, effect: card.effect ? { ...card.effect } : undefined });
}

/** Una carta cuenta como `suit` si es de ese palo o es comodín. */
export const matchesSuit = (card, suit) => card.wild || card.suit === suit;
/** Todas las cartas comparten palo (los comodines valen para cualquiera). Con solo comodines también. */
export function sameSuit(hand) {
  const fixed = hand.filter((c) => !c.wild);
  return fixed.length === 0 || fixed.every((c) => c.suit === fixed[0].suit);
}

/** Efectos de las cartas de la mano, EN ORDEN (izquierda → derecha). Cada carta con `twice` se activa 2 veces. */
export function cardEffects(hand) {
  const out = [];
  for (const c of hand) {
    if (!c.effect && !c.poly) continue;
    const reps = c.twice ? 2 : 1;
    for (let r = 0; r < reps; r++) {
      out.push({ card: c, apply: (acc) => {
        if (c.effect?.chips) acc.F += c.effect.chips;
        if (c.effect?.mult) acc.M *= c.effect.mult;
        if (c.poly) acc.M *= POLY_MULT; // Policromo: efecto extra justo después del de su carta
      } });
    }
  }
  return out;
}
