export const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function cardValue(rank) {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
}

let nextId = 1;
/** Tras cargar una partida: los ids nuevos deben ser mayores que los de las cartas guardadas. */
export const ensureIdAbove = (n) => { if (nextId <= n) nextId = n + 1; };
export function makeCard(rank, suit, extra = {}) {
  return { id: nextId++, rank, suit, value: cardValue(rank), ...extra };
}

export function createDeck() {
  const cards = [];
  for (const suit of SUITS) for (const rank of RANKS) cards.push(makeCard(rank, suit));
  return cards;
}

/** Total de blackjack: los Ases (valor 11) bajan a 1 mientras haya bust. Una carta con valor fijo 10 no baja. */
export function handTotal(hand) {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    total += c.value;
    if (c.value === 11) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export const isNaturalBlackjack = (hand) => hand.length === 2 && handTotal(hand) === 21;

/** Mazo de robo: copia barajada del mazo del jugador. */
export function drawPile(deck, rng) {
  return rng.shuffle(deck.slice());
}
