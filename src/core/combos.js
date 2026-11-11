import { handTotal } from './deck.js';
import { COMBOS } from '../data/combos.js';
import { sameSuit } from './cards.js';

const ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function isStraight(hand) {
  if (hand.length < 3) return false;
  const idx = hand.map((c) => ORDER.indexOf(c.rank));
  if (new Set(idx).size !== idx.length) return false;
  const run = (vals) => {
    const s = [...vals].sort((a, b) => a - b);
    return s.every((v, i) => i === 0 || v === s[i - 1] + 1);
  };
  // El As cuenta como bajo (A-2-3) o alto (Q-K-A).
  return run(idx) || (idx.includes(0) && run(idx.map((v) => (v === 0 ? 13 : v))));
}

/** Devuelve el id del combo de la mano final, o null. */
export function detectComboId(hand) {
  const total = handTotal(hand);
  if (total > 21) return null;
  const counts = {};
  for (const c of hand) counts[c.rank] = (counts[c.rank] ?? 0) + 1;
  const groups = Object.values(counts).sort((a, b) => b - a);

  const checks = {
    sevens: () => (counts['7'] ?? 0) >= 3,
    five: () => hand.length >= 5,
    straight: () => isStraight(hand),
    flush: () => hand.length >= 3 && sameSuit(hand),
    trips: () => groups[0] >= 3,
    twoPair: () => groups[0] >= 2 && groups[1] >= 2,
    pair: () => groups[0] >= 2,
    twentyOne: () => total === 21 && hand.length >= 3, // el 21 natural ya paga 3:2
  };
  for (const combo of COMBOS) if (checks[combo.id]()) return combo.id;
  return null;
}

/** { id, name, F, M } del combo de la mano, o null. */
export function detectCombo(hand) {
  const id = detectComboId(hand);
  return id ? COMBOS.find((c) => c.id === id) : null;
}

/** Efecto para runEffects: va el primero, antes de jokers y cartas. */
export function comboEffect(hand) {
  const combo = detectCombo(hand);
  return { combo, apply: (acc) => { if (combo) { acc.F += combo.F; acc.M *= combo.M; } } };
}
