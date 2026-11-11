// Tienda (README §6). Cifras de precios provisionales. Los mensajes de error son CLAVES i18n (shop.err.*).
import { makeCard, SUITS, RANKS } from './deck.js';
import { JOKERS } from '../data/jokers.js';
import { VOUCHERS } from '../data/vouchers.js';
import { jokerSlotCount } from './run.js';
import { TAROTS } from '../data/tarots.js';
import { RUNES, RUNE_BY_ID, RUNE_WEIGHT } from '../data/runes.js';
import { hasRune } from './runes.js';

const WEIGHT = { common: 6, uncommon: 3, rare: 1 };
const EDITION_ODDS = { poly: 0.05, negative: 0.03 };
const CARD_PRICE = 2;

function pickJoker(rng) {
  const total = JOKERS.reduce((a, j) => a + WEIGHT[j.rarity], 0);
  let r = rng.next() * total;
  for (const j of JOKERS) { r -= WEIGHT[j.rarity]; if (r <= 0) return j; }
  return JOKERS[0];
}

function makeJokerOffer(rng) {
  const def = pickJoker(rng);
  const roll = rng.next();
  const edition = roll < EDITION_ODDS.negative ? 'negative' : roll < EDITION_ODDS.negative + EDITION_ODDS.poly ? 'poly' : null;
  const price = def.price + (edition ? 3 : 0);
  return { kind: 'joker', id: def.id, edition, price, sold: false };
}

function makeCardOffer(rng) {
  const rank = RANKS[rng.int(RANKS.length)];
  const suit = SUITS[rng.int(SUITS.length)];
  return { kind: 'card', card: makeCard(rank, suit), price: CARD_PRICE, sold: false };
}

const TAROT_PRICE = 3;
const RUNE_PRICE = 8;
// Probabilidad de que un slot de joker se reemplace por un tarot (baja) o una runa (muy muy baja). README §6.
const TAROT_SLOT_ODDS = 0.12;
const RUNE_SLOT_ODDS = 0.02;

function makeTarotOffer(rng) {
  const t = TAROTS[rng.int(TAROTS.length)];
  return { kind: 'tarot', id: t.id, price: TAROT_PRICE, sold: false };
}
function makeRuneOffer(run, rng) {
  const pool = RUNES.filter((r) => !run.runes.includes(r.id));
  if (!pool.length) return makeJokerOffer(rng);
  const total = pool.reduce((a, r) => a + RUNE_WEIGHT[r.rarity], 0);
  let x = rng.next() * total;
  let pick = pool[0];
  for (const r of pool) { x -= RUNE_WEIGHT[r.rarity]; if (x <= 0) { pick = r; break; } }
  return { kind: 'rune', id: pick.id, price: RUNE_PRICE, sold: false };
}
/** Un slot de joker: casi siempre joker; con baja probabilidad un tarot, con muy muy baja una runa. */
function makeSlotOffer(run, rng) {
  const r = rng.next();
  if (r < RUNE_SLOT_ODDS) return makeRuneOffer(run, rng);
  if (r < RUNE_SLOT_ODDS + TAROT_SLOT_ODDS) return makeTarotOffer(rng);
  return makeJokerOffer(rng);
}
const makeItems = (run, rng) => [makeCardOffer(rng), makeSlotOffer(run, rng), makeSlotOffer(run, rng), makeSlotOffer(run, rng)];

/** Paquetes (README §6): precio, qué muestran y cuántos eliges. */
export const PACKS = {
  jokers: { kind: 'jokers', price: 4, show: 3, pick: 1, weight: 10 },
  tarot: { kind: 'tarot', price: 4, show: 4, pick: 1, weight: 10 },
  megaTarot: { kind: 'tarot', price: 7, show: 6, pick: 2, weight: 3, mega: true },
  runes: { kind: 'runes', price: 6, show: 2, pick: 1, weight: 1.2 },
  megaRunes: { kind: 'runes', price: 9, show: 4, pick: 2, weight: 0.4, mega: true },
};
function pickPackType(rng, exclude = []) {
  const pool = Object.entries(PACKS).filter(([k]) => !exclude.includes(k));
  const total = pool.reduce((a, [, p]) => a + p.weight, 0);
  let x = rng.next() * total;
  for (const [k, p] of pool) { x -= p.weight; if (x <= 0) return k; }
  return pool[0][0];
}
/** 3 paquetes por visita: siempre uno de jokers y uno de tarot (los 2 "siempre disponibles"); el tercero al azar. */
function makePacks(rng) {
  return [{ type: 'jokers', sold: false }, { type: 'tarot', sold: false }, { type: pickPackType(rng), sold: false }];
}

/** Genera el inventario de la tienda: 1 carta + 3 slots (jokers, a veces tarot/runa), el vale y 3 paquetes. */
export function openShop(run) {
  const rng = run.streams.shop;
  const owned = new Set(run.vouchers);
  const voucher = VOUCHERS.find((v) => !owned.has(v.id)) ?? null;
  run.shop = {
    items: makeItems(run, rng),
    packs: makePacks(rng),
    voucher: voucher ? { id: voucher.id, price: voucher.price, sold: false } : null,
    rerolls: 0,
    soldCardThisVisit: false,
    message: null,
  };
  run.phase = 'shop';
  return run.shop;
}

/** Nauthiz: el primer reroll de cada tienda es gratis. */
export const rerollPrice = (run) => (hasRune(run, 'nauthiz') && run.shop.rerolls === 0 ? 0 : run.cfg.rerollBase + run.shop.rerolls * run.cfg.rerollStep);

export function reroll(run) {
  const price = rerollPrice(run);
  if (run.coins < price) return fail(run, 'shop.err.coins');
  run.coins -= price; run.stats.coinsSpent += price; run.stats.rerolls++;
  run.shop.rerolls++;
  const rng = run.streams.shop;
  run.shop.items = makeItems(run, rng);
  return { ok: true };
}

function fail(run, message) { run.shop.message = message; return { ok: false, message }; }

/**
 * Comprar el artículo `index`. Para tarots: `mode` = 'keep' (guardar en consumibles) o 'use' (se usa ahora: lo abre la UI).
 * Devuelve { ok, use?: tarotId } cuando hay que usarlo en el momento.
 */
export function buy(run, index, mode = 'use') {
  const item = run.shop.items[index];
  if (!item || item.sold) return fail(run, 'shop.err.gone');
  if (run.coins < item.price) return fail(run, 'shop.err.coins');
  if (item.kind === 'tarot' && mode === 'keep' && run.consumables.length >= consumableSlots(run)) return fail(run, 'shop.err.noconsumable');
  if (item.kind === 'tarot') {
    run.coins -= item.price; run.stats.coinsSpent += item.price; item.sold = true; run.shop.message = null;
    if (mode === 'keep') { run.consumables.push(item.id); return { ok: true }; }
    return { ok: true, use: item.id };
  }
  if (item.kind === 'rune') {
    run.coins -= item.price; run.stats.coinsSpent += item.price; item.sold = true; run.shop.message = null;
    const rdef = RUNE_BY_ID[item.id];
    if (rdef?.active) return { ok: true, useRune: item.id }; // se usa como tarot: seleccionar carta(s)
    run.runes.push(item.id); // las runas pasivas se usan al instante y duran toda la partida
    return { ok: true, rune: item.id };
  }
  if (item.kind === 'joker') {
    if (run.jokers.length >= jokerSlotCount(run)) return fail(run, 'shop.err.nospace');
    run.jokers.push({ id: item.id, edition: item.edition });
  } else {
    run.deck.push(item.card);
  }
  run.coins -= item.price; run.stats.coinsSpent += item.price;
  item.sold = true;
  run.shop.message = null;
  return { ok: true };
}

export const consumableSlots = (run) => run.cfg.maxConsumables;

/** Compra el paquete `i` de la tienda: devuelve la descripción para abrirlo (ver packs.js). */
export function buyPack(run, i) {
  const pk = run.shop.packs[i];
  if (!pk || pk.sold) return fail(run, 'shop.err.gone');
  const def = PACKS[pk.type];
  if (run.coins < def.price) return fail(run, 'shop.err.coins');
  run.coins -= def.price; run.stats.coinsSpent += def.price;
  pk.sold = true; run.shop.message = null;
  return { ok: true, type: pk.type };
}

export function buyVoucher(run) {
  const v = run.shop.voucher;
  if (!v || v.sold) return fail(run, 'shop.err.bought');
  if (run.coins < v.price) return fail(run, 'shop.err.coins');
  run.coins -= v.price; run.stats.coinsSpent += v.price;
  run.vouchers.push(v.id);
  VOUCHERS.find((x) => x.id === v.id).apply(run);
  v.sold = true;
  return { ok: true };
}

/** Precio de venta de un joker: la mitad de su precio base (mínimo $1). */
export function jokerSellPrice(joker) {
  const def = JOKERS.find((j) => j.id === joker.id);
  return Math.max(1, Math.floor((def.price + (joker.edition ? 3 : 0)) / 2));
}

export function sellJoker(run, index) {
  const j = run.jokers[index];
  if (!j) return { ok: false };
  run.coins += jokerSellPrice(j); run.stats.coinsEarned += jokerSellPrice(j); run.stats.jokersSold++;
  run.jokers.splice(index, 1);
  return { ok: true };
}

/** Reordenar jokers (el orden es el orden de aplicación). */
export function moveJoker(run, from, to) {
  if (from === to || from < 0 || to < 0 || from >= run.jokers.length || to >= run.jokers.length) return;
  const [j] = run.jokers.splice(from, 1);
  run.jokers.splice(to, 0, j);
}

/** Vender cartas del mazo: máx. 1 por visita. Valor por palo: 3 → 2 → 1 → 0; sube un poco cada visita que no vendes ese palo. */
export function suitValue(run, suit) { return Math.floor(run.suitValues?.[suit] ?? 3); }
export function sellCard(run, cardId) {
  if (run.shop.soldCardThisVisit) return fail(run, 'shop.err.onesell');
  const idx = run.deck.findIndex((c) => c.id === cardId);
  if (idx < 0 || run.deck.length <= 12) return fail(run, 'shop.err.nosell');
  if (run.deck[idx].nosell) return fail(run, 'shop.err.nosellcard');
  const card = run.deck[idx];
  run.suitValues ??= { hearts: 3, diamonds: 3, spades: 3, clubs: 3 };
  const value = suitValue(run, card.suit);
  run.deck.splice(idx, 1);
  run.coins += value; run.stats.coinsEarned += value;
  run.suitValues[card.suit] = Math.max(0, run.suitValues[card.suit] - (hasRune(run, 'gebo') ? 0.5 : 1)); // Gebo: baja a la mitad de velocidad
  run.shop.soldCardThisVisit = true;
  run.shop.soldSuit = card.suit;
  return { ok: true, value };
}

/** Al salir de la tienda: los palos que NO vendiste recuperan un poco de valor. */
export function leaveShop(run) {
  run.suitValues ??= { hearts: 3, diamonds: 3, spades: 3, clubs: 3 };
  for (const s of Object.keys(run.suitValues)) {
    if (run.shop?.soldSuit !== s) run.suitValues[s] = Math.min(3, run.suitValues[s] + 0.34);
  }
}
