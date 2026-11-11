// Consultas de runas activas (lógica pura). run.runes = ids de runas.
export const hasRune = (run, id) => run.runes.includes(id);

/** Slots extra de joker por runas: Algiz +1, Othala +1. */
export const runeJokerSlots = (run) => (hasRune(run, 'algiz') ? 1 : 0) + (hasRune(run, 'othala') ? 1 : 0);
export const runeExtraHands = (run) => (hasRune(run, 'othala') ? 1 : 0);
/** Interés: Jera cobra por cada $4 en vez de $5. */
export const interestUnit = (run) => (hasRune(run, 'jera') ? 4 : run.cfg.interestPer);
/** Fehu: +$1 al terminar cada dealer. */
export const runeCoins = (run) => (hasRune(run, 'fehu') ? 1 : 0);
/** Hagalaz: la victoria por multi paga 65 % en vez de 50 %. */
export const multiWinFactor = (run) => (hasRune(run, 'hagalaz') ? 0.65 : run.cfg.multiWinFactor);
