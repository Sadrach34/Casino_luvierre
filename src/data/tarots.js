// Cartas de tarot (README §7). Efectos PERMANENTES sobre la carta elegida del mazo (salvo la Rueda: jokers).
// `needs`: { cards: [min, max] } cartas del mazo a elegir, { joker: true } un joker, o {} si no pide nada.
// Textos: tarot.<id>.name / .desc en src/i18n.
import { RANKS, SUITS, makeCard } from '../core/deck.js';
import { bumpRank, setEffect, setRank, cloneCard } from '../core/cards.js';

const toSuit = (suit) => (cards) => { for (const c of cards) c.suit = suit; };
const effectOf = (effect) => (cards) => { for (const c of cards) setEffect(c, effect); };

export const TAROTS = [
  { id: 'fool', num: 0, needs: { cards: [1, 1] }, apply: ({ run, cards }) => { run.deck.push(cloneCard(cards[0])); } },
  { id: 'magician', num: 1, needs: { cards: [1, 1] }, apply: ({ cards }) => effectOf({ chips: 10 })(cards) },
  { id: 'priestess', num: 2, needs: { cards: [1, 1] }, apply: ({ cards }) => { bumpRank(cards[0], 1); } },
  { id: 'empress', num: 3, needs: { cards: [1, 1] }, apply: ({ cards }) => effectOf({ mult: 1.5 })(cards) },
  { id: 'emperor', num: 4, needs: { cards: [1, 1] }, apply: ({ cards }) => effectOf({ chips: 25 })(cards) },
  { id: 'hierophant', num: 5, needs: { cards: [1, 1] }, apply: ({ cards }) => { cards[0].wild = true; } },
  { id: 'lovers', num: 6, needs: { cards: [1, 1] }, apply: ({ cards }) => { cards[0].poly = true; } },
  { id: 'chariot', num: 7, needs: { cards: [1, 1] }, apply: ({ cards }) => { cards[0].twice = true; } },
  { id: 'strength', num: 8, needs: { cards: [1, 1] }, apply: ({ cards }) => { bumpRank(cards[0], 2, { maxIndex: RANKS.indexOf('10') }); } },
  { id: 'hermit', num: 9, needs: { cards: [1, 1] }, apply: ({ run, cards }) => { destroy(run, cards); run.coins += 3; run.stats.coinsEarned += 3; } },
  { id: 'wheel', num: 10, needs: { joker: true }, apply: ({ run, jokerIndex, rng }) => {
    const j = run.jokers[jokerIndex];
    if (!j || j.edition) return { result: 'nothing' };
    const r = rng.next();
    if (r < 0.5) return { result: 'nothing' };
    j.edition = r < 0.85 ? 'poly' : 'negative'; // 35 % policromo, 15 % negativo
    return { result: j.edition };
  } },
  { id: 'justice', num: 11, needs: { cards: [1, 1] }, apply: ({ cards }) => { cards[0].value10 = true; cards[0].value = 10; } },
  { id: 'hanged', num: 12, needs: { cards: [1, 2] }, apply: ({ run, cards }) => destroy(run, cards) },
  { id: 'death', num: 13, needs: { cards: [2, 2] }, apply: ({ cards }) => {
    // La carta de la izquierda (la primera elegida) se convierte en copia de la de la derecha (la segunda): rango, palo y efectos.
    const [left, right] = cards;
    const { id, ...rest } = right;
    Object.keys(left).forEach((k) => { if (k !== 'id') delete left[k]; });
    Object.assign(left, rest, { effect: right.effect ? { ...right.effect } : undefined });
  } },
  { id: 'temperance', num: 14, needs: {}, apply: ({ run }) => { const n = Math.min(10, 2 * run.jokers.length); run.coins += n; run.stats.coinsEarned += n; return { coins: n }; } },
  { id: 'devil', num: 15, needs: { cards: [1, 1] }, apply: ({ cards }) => { effectOf({ chips: 40 })(cards); cards[0].nosell = true; } },
  { id: 'tower', num: 16, needs: { cards: [1, 1] }, apply: ({ cards, rng }) => { setRank(cards[0], RANKS[rng.int(RANKS.length)]); setEffect(cards[0], { chips: 15 }); } },
  { id: 'star', num: 17, needs: { cards: [1, 2] }, apply: ({ cards }) => toSuit('diamonds')(cards) },
  { id: 'moon', num: 18, needs: { cards: [1, 2] }, apply: ({ cards }) => toSuit('clubs')(cards) },
  { id: 'sun', num: 19, needs: { cards: [1, 2] }, apply: ({ cards }) => toSuit('hearts')(cards) },
  { id: 'judgement', num: 20, needs: {}, apply: ({ run, rng }) => {
    const c = makeCard(RANKS[rng.int(RANKS.length)], SUITS[rng.int(SUITS.length)]);
    const pool = [{ chips: 10 }, { chips: 25 }, { mult: 1.5 }];
    setEffect(c, pool[rng.int(pool.length)]);
    if (rng.next() < 0.25) c.poly = true;
    run.deck.push(c);
    return { card: c };
  } },
  { id: 'world', num: 21, needs: { cards: [1, 2] }, apply: ({ cards }) => toSuit('spades')(cards) },
];
export const TAROT_BY_ID = Object.fromEntries(TAROTS.map((t) => [t.id, t]));

function destroy(run, cards) {
  const ids = new Set(cards.map((c) => c.id));
  run.deck = run.deck.filter((c) => !ids.has(c.id));
  run.stats.destroyed = (run.stats.destroyed ?? 0) + ids.size;
}
