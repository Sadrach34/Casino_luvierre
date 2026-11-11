// Una mano de blackjack como máquina de estados pura (sin UI).
// fases: 'player' → (plantarse / doblar / pasarse) → 'dealer' → 'done'
import { CONFIG } from './config.js';
import { handTotal, isNaturalBlackjack } from './deck.js';
import { resolveHand, runEffects } from './scoring.js';
import { comboEffect } from './combos.js';

/** Reparte: 2 cartas al jugador y 2 al dealer (la primera del dealer va oculta). */
export function dealHand({ pile, bet, standAt = CONFIG.dealerStand }) {
  const player = [pile.pop(), pile.pop()];
  const dealer = [pile.pop(), pile.pop()];
  const h = { phase: 'player', player, dealer, bet, standAt, doubled: false, hiddenRevealed: false, busted: false, result: null };
  if (isNaturalBlackjack(player)) h.phase = 'dealer'; // 21 natural: te plantas solo
  return h;
}

export const playerTotal = (h) => handTotal(h.player);
export const dealerTotal = (h) => handTotal(h.dealer);
/** Lo que se ve del dealer mientras la primera carta sigue boca abajo. */
export const dealerVisibleTotal = (h) => (h.hiddenRevealed ? handTotal(h.dealer) : handTotal(h.dealer.slice(1)));

export function hit(h, pile) {
  if (h.phase !== 'player') throw new Error('No se puede pedir carta ahora');
  h.player.push(pile.pop());
  if (handTotal(h.player) > 21) { h.busted = true; h.phase = 'done'; }
  else if (handTotal(h.player) === 21) h.phase = 'dealer';
  return h;
}

export function stand(h) {
  if (h.phase !== 'player') throw new Error('No se puede plantar ahora');
  h.phase = 'dealer';
  return h;
}

/** Doblar: solo con 2 cartas, sin haber doblado, y si las fichas alcanzan para la apuesta doble. */
export const canDouble = (h, fichas, cfg = CONFIG) =>
  cfg.allowDouble && h.phase === 'player' && h.player.length === 2 && !h.doubled && fichas >= h.bet * 2;

export function doubleDown(h, pile) {
  h.bet *= 2;
  h.doubled = true;
  h.player.push(pile.pop());
  if (handTotal(h.player) > 21) { h.busted = true; h.phase = 'done'; } else h.phase = 'dealer';
  return h;
}

/** Descartar: cambias la carta `index` de tu mano por otra. Consume 1 descarte del dealer (pool compartido); puedes usar varios en la misma mano si quedan. No después de doblar. */
export const canDiscard = (h, discardsLeft) => h.phase === 'player' && !h.doubled && discardsLeft > 0;

export function discard(h, index, pile) {
  const out = h.player[index];
  h.player[index] = pile.pop();
  if (handTotal(h.player) > 21) { h.busted = true; h.phase = 'done'; } else if (handTotal(h.player) === 21) h.phase = 'dealer';
  return out;
}

/** Reordenar tu mano (README §3): el orden decide qué carta se activa primero con jokers y efectos. Solo en tu turno. */
export function moveCard(h, from, to) {
  if (h.phase !== 'player') return false;
  if (from === to || from < 0 || to < 0 || from >= h.player.length || to >= h.player.length) return false;
  const [c] = h.player.splice(from, 1);
  h.player.splice(to, 0, c);
  return true;
}

/** Un paso del dealer: revela la carta oculta o pide una carta. Devuelve 'reveal' | 'draw' | 'stand'. */
export function dealerStep(h, pile) {
  if (!h.hiddenRevealed) { h.hiddenRevealed = true; return 'reveal'; }
  if (handTotal(h.dealer) < h.standAt) { h.dealer.push(pile.pop()); return 'draw'; }
  h.phase = 'done';
  return 'stand';
}

/**
 * Resuelve la mano. `effects` = efectos extra (jokers, runas…) que se aplican DESPUÉS del combo base.
 * Devuelve { result, net, combo, F, M, T, D, ... } y lo guarda en h.result.
 */
export function resolve(h, { effects = [], cfg = CONFIG } = {}) {
  h.hiddenRevealed = true;
  const T = handTotal(h.player);
  const D = handTotal(h.dealer);
  const combo = cfg.combos && !h.busted ? comboEffect(h.player) : { combo: null, apply() {} };
  const { F, M } = h.busted ? { F: 0, M: 1 } : runEffects([combo, ...effects], { hand: h.player, T });
  const res = resolveHand({ T, D, dealerBust: D > 21, bet: h.bet, F, M, twoCards: h.player.length === 2, cfg });
  h.result = { ...res, T, D, F, M, combo: combo.combo ?? null, bet: h.bet, doubled: h.doubled };
  h.phase = 'done';
  return h.result;
}
