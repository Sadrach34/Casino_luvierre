// Metas de fichas por mesa y dealer (estilo Balatro: ×1, ×1.5, ×2 de una base que crece por mesa).
import { CONFIG } from './config.js';

const round5 = (x) => Math.round(x / 5) * 5;

/** Meta total de fichas del dealer `idx` (0..2) de la mesa `mesa` (1..). */
export function dealerGoal(mesa, idx, cfg = CONFIG) {
  return round5(cfg.mesaBaseGoal * cfg.dealerMultipliers[idx] * cfg.mesaGrowth ** (mesa - 1));
}

export const mesaGoals = (mesa, cfg = CONFIG) => [0, 1, 2].map((i) => dealerGoal(mesa, i, cfg));

/** Monedas base por vencer a un dealer (README §4). El jefe da +3 extra. */
export function dealerCoins(idx, cfg = CONFIG) {
  return cfg.coinsPerDealer + (idx === 2 ? cfg.bossCoins : 0);
}
