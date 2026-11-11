import { CONFIG } from './config.js';

/**
 * Aplica efectos EN ORDEN sobre un acumulador { F, M }.
 * Cada efecto es { apply(ctx) } y modifica ctx.F (fichas, suman) y/o ctx.M (multi, multiplica).
 * El orden importa: multi antes de fichas rinde poco; fichas primero y multi al final rinde mucho.
 * Un efecto con `after` (ej. edición Policromo) se aplica justo después de su efecto base.
 */
export function runEffects(effects, ctx) {
  const acc = { ...ctx, F: 0, M: 1 };
  for (const e of effects) {
    e.apply?.(acc);
    e.after?.(acc);
  }
  return { F: acc.F, M: acc.M };
}

/**
 * Resuelve una mano contra el dealer.
 *
 * T = total de cartas del jugador, D = total del dealer, F/M del acumulador de efectos.
 * - T > 21 → bust, pierdes (el multi no sirve).
 * - T×M ≤ 21 → el multi se aplica al total; si T×M > 21 se ignora.
 * - Victoria normal (T > D o dealer bust): pago = (base + F) × M aplicado.
 * - Victoria por multi (T ≤ D pero T×M > D): pago = multiWinFactor × (base + F).
 * - Si T×M == 21 con 2 cartas cuenta como blackjack natural.
 *
 * Devuelve { result, net, tEff, mApplied }. `net` = cambio de fichas (negativo si pierdes).
 */
export function resolveHand({ T, D, dealerBust = false, bet, F = 0, M = 1, twoCards = false, cfg = CONFIG }) {
  if (T > 21) return { result: 'bust', net: -bet, tEff: T, mApplied: 1 };

  const tm = Math.floor(T * M); // los puntos nunca son .5: se redondea hacia abajo
  const mUsable = M > 1 && tm <= 21;
  const tEff = mUsable ? tm : T;
  const mApplied = mUsable ? M : 1;
  const dealerTotal = dealerBust ? 0 : D;

  // Blackjack = 21 con 2 cartas, también si el 21 se logra gracias al multi.
  const bjNatural = twoCards && tEff === 21;
  const base = bjNatural ? bet * cfg.blackjackPays : bet;

  if (T > dealerTotal) {
    return { result: bjNatural ? 'blackjack' : 'win', net: Math.floor((base + F) * mApplied), tEff, mApplied };
  }
  if (mUsable && tEff > dealerTotal) {
    return { result: 'multiWin', net: Math.floor((base + F) * cfg.multiWinFactor), tEff, mApplied };
  }
  if (tEff === dealerTotal) return { result: 'push', net: 0, tEff, mApplied };
  return { result: 'lose', net: -bet, tEff, mApplied };
}
