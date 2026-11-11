// Paquetes de la tienda y uso de tarots (README §6 y §7). Lógica pura; la pantalla vive en src/ui/screens/pack.js.
// run.pack = { source, type?, kind, options[], picksLeft, deckIds[], consumableIndex?, log[], done }
import { PACKS, consumableSlots } from './shop.js';
import { jokerSlotCount } from './run.js';
import { JOKERS } from '../data/jokers.js';
import { TAROTS, TAROT_BY_ID } from '../data/tarots.js';
import { RUNES, RUNE_BY_ID, RUNE_WEIGHT } from '../data/runes.js';
import { devlog } from '../ui/devlog.js';

const JW = { common: 6, uncommon: 3, rare: 1 };

function sample(rng, list, n) {
  const pool = list.slice();
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(rng.int(pool.length), 1)[0]);
  return out;
}

function weightedSample(rng, list, n, weightOf) {
  const pool = list.slice();
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((a, x) => a + weightOf(x), 0);
    let r = rng.next() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) { r -= weightOf(pool[i]); if (r <= 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** Cartas del mazo que se muestran en un paquete de tarot (7 a 10, README §6.1). */
function deckSample(run, rng) {
  const n = Math.min(run.deck.length, 7 + rng.int(4));
  return sample(rng, run.deck, n).map((c) => c.id);
}

/** Abre un paquete comprado. Devuelve run.pack. */
export function openPack(run, type, returnTo = 'shop') {
  const def = PACKS[type];
  const rng = run.streams.shop;
  let options;
  if (def.kind === 'jokers') {
    options = weightedSample(rng, JOKERS, def.show, (j) => JW[j.rarity]).map((j) => {
      const r = rng.next();
      return { id: j.id, edition: r < 0.03 ? 'negative' : r < 0.08 ? 'poly' : null };
    });
  } else if (def.kind === 'tarot') {
    options = sample(rng, TAROTS, def.show).map((t) => ({ id: t.id }));
  } else {
    // Paquetes de runas: solo runas pasivas (se quedan activas toda la partida). Las runas activas se compran como objetos sueltos.
    const pool = RUNES.filter((r) => !run.runes.includes(r.id) && !r.active);
    if (pool.length) {
      options = weightedSample(rng, pool, def.show, (r) => RUNE_WEIGHT[r.rarity]).map((r) => ({ id: r.id }));
    } else {
      options = [];
    }
  }
  // Tarot packs always show deck cards for targeting; rune packs show them too (runas activas con selección, si las hubiera).
  const needsDeck = def.kind === 'tarot' || def.kind === 'runes';
  run.pack = { source: 'pack', type, kind: def.kind, options, picksLeft: Math.min(def.pick, options.length), deckIds: needsDeck ? deckSample(run, rng) : [], log: [], done: false, returnTo };
  run.phase = 'pack';
  return run.pack;
}

/** Usar una runa activa suelta (recién comprada en la tienda). `returnTo` = a dónde volver al cerrar. */
export function openRuneUse(run, runeId, returnTo = 'shop') {
  const rng = run.streams.shop;
  run.pack = { source: 'use', kind: 'runes', options: [{ id: runeId }], picksLeft: 1, deckIds: deckSample(run, rng), log: [], done: false, returnTo };
  run.phase = 'pack';
  return run.pack;
}

/** Usar un tarot suelto (recién comprado o guardado en consumibles). `consumableIndex` = su slot, si estaba guardado. */
export function openTarotUse(run, tarotId, consumableIndex = null, returnTo = null) {
  const rng = run.streams.shop;
  run.pack = { source: 'use', kind: 'tarot', options: [{ id: tarotId }], picksLeft: 1, deckIds: deckSample(run, rng), consumableIndex, log: [], done: false, returnTo: returnTo ?? (consumableIndex != null ? 'table' : 'shop') };
  run.phase = 'pack';
  return run.pack;
}

const fail = (message) => ({ ok: false, message });

/** ¿Se puede usar el tarot con esta selección? Devuelve { ok } o { ok:false, message }. */
const normId = (id) => { const n = Number(id); return Number.isFinite(n) && String(n) === String(id).trim() ? n : id; };
const normIds = (ids) => [...new Set((ids ?? []).map(normId))];
const hasId = (arr, id) => arr.some((x) => x == id);
const findCard = (deck, id) => deck.find((c) => c.id == id);

export function validateTarot(run, optIndex, { cardIds = [], jokerIndex = null } = {}) {
  const opt = run.pack.options[optIndex];
  if (!opt) return fail('pack.err.gone');
  const t = TAROT_BY_ID[opt.id];
  if (t.needs.joker) {
    if (!run.jokers.length) return fail('pack.err.nojokers');
    if (jokerIndex == null || !run.jokers[jokerIndex]) return fail('pack.err.pickjoker');
  }
  if (t.needs.cards) {
    const [min, max] = t.needs.cards;
    const ids = normIds(cardIds);
    if (ids.length < min) return fail(min === 2 ? 'pack.err.pick2' : 'pack.err.pickcard');
    if (ids.length > max) return fail('pack.err.toomany');
    const allowedList = run.pack.source === 'use' ? run.deck.map((c) => c.id) : (run.pack.deckIds ?? []);
    const bad = ids.filter((id) => !(hasId(allowedList, id) && findCard(run.deck, id)));
    if (bad.length) {
      try { devlog?.('warn', 'tarot badcard', { tarot: opt.id, source: run.pack.source, ids, deckIds: run.pack.deckIds?.slice(0, 5), deckHas: ids.map((id) => !!findCard(run.deck, id)), allowedHas: ids.map((id) => hasId(allowedList, id)) }); } catch {}
      return fail('pack.err.badcard');
    }
  }
  return { ok: true };
}

/** Usa el tarot `optIndex` con la selección dada. Cuenta como una elección del paquete. */
export function useTarot(run, optIndex, sel = {}) {
  const v = validateTarot(run, optIndex, sel);
  if (!v.ok) return v;
  const opt = run.pack.options[optIndex];
  const t = TAROT_BY_ID[opt.id];
  const cards = normIds(sel.cardIds).map((id) => findCard(run.deck, id)).filter(Boolean); // en el orden elegido (izq → der)
  const result = t.apply({ run, cards, jokerIndex: sel.jokerIndex, rng: run.streams.shop }) ?? {};
  run.stats.tarotsUsed++;
  run.pack.log.push({ kind: 'tarot', id: opt.id, cardIds: cards.map((c) => c.id), result });
  run.pack.options.splice(optIndex, 1);
  consume(run);
  if (run.pack.source === 'use' && run.pack.consumableIndex != null) run.consumables.splice(run.pack.consumableIndex, 1);
  return { ok: true, result };
}

/** Elegir un joker del paquete (necesita espacio libre). */
export function takeJoker(run, optIndex) {
  const opt = run.pack.options[optIndex];
  if (!opt) return fail('pack.err.gone');
  if (run.jokers.length >= jokerSlotCount(run)) return fail('shop.err.nospace');
  run.jokers.push({ id: opt.id, edition: opt.edition });
  run.pack.log.push({ kind: 'joker', id: opt.id });
  run.pack.options.splice(optIndex, 1);
  consume(run);
  return { ok: true };
}

/** Valida la selección para usar una runa activa (como un tarot sobre carta(s) del mazo). */
export function validateRune(run, optIndex, { cardIds = [], jokerIndex = null } = {}) {
  const opt = run.pack.options[optIndex];
  if (!opt) return fail('pack.err.gone');
  const r = RUNE_BY_ID[opt.id];
  if (!r?.active) return fail('pack.err.not_active');
  if (r.needs?.joker) {
    if (!run.jokers.length) return fail('pack.err.nojokers');
    if (jokerIndex == null || !run.jokers[jokerIndex]) return fail('pack.err.pickjoker');
  }
  if (r.needs?.cards) {
    const [min, max] = r.needs.cards;
    const ids = normIds(cardIds);
    if (ids.length < min) return fail(min === 2 ? 'pack.err.pick2' : 'pack.err.pickcard');
    if (ids.length > max) return fail('pack.err.toomany');
    const allowedList = run.pack.source === 'use' ? run.deck.map((c) => c.id) : (run.pack.deckIds ?? []);
    const bad = ids.filter((id) => !(hasId(allowedList, id) && findCard(run.deck, id)));
    if (bad.length) {
      try { devlog?.('warn', 'rune badcard', { rune: opt.id, source: run.pack.source, ids }); } catch {}
      return fail('pack.err.badcard');
    }
  }
  return { ok: true };
}

/** Usa una runa activa del paquete con la selección dada. Cuenta como una elección. */
export function useRune(run, optIndex, sel = {}) {
  const v = validateRune(run, optIndex, sel);
  if (!v.ok) return v;
  const opt = run.pack.options[optIndex];
  const r = RUNE_BY_ID[opt.id];
  const cards = normIds(sel.cardIds).map((id) => findCard(run.deck, id)).filter(Boolean);
  const result = r.apply({ run, cards, jokerIndex: sel.jokerIndex, rng: run.streams.shop }) ?? {};
  run.pack.log.push({ kind: 'rune', id: opt.id, cardIds: cards.map((c) => c.id), result, active: true });
  run.pack.options.splice(optIndex, 1);
  consume(run);
  return { ok: true, result };
}

/** Elegir una runa pasiva del paquete: se usa al instante y dura toda la partida. */
export function takeRune(run, optIndex) {
  const opt = run.pack.options[optIndex];
  if (!opt) return fail('pack.err.gone');
  const r = RUNE_BY_ID[opt.id];
  if (r?.active) return fail('pack.err.use_active_rune');
  if (!run.runes.includes(opt.id)) run.runes.push(opt.id);
  run.pack.log.push({ kind: 'rune', id: opt.id });
  run.pack.options.splice(optIndex, 1);
  consume(run);
  return { ok: true };
}

function consume(run) {
  run.pack.picksLeft--;
  if (run.pack.picksLeft <= 0 || !run.pack.options.length) run.pack.done = true;
}

/**
 * Saltar / cerrar el paquete. Un tarot guardado que no se usó vuelve a consumibles (no se toca).
 * Un tarot recién comprado que se salta se pierde (lo dice el README: se usa ahí mismo).
 */
export function finishPack(run) {
  run.pack.done = true;
  const ret = run.pack.returnTo ?? 'shop';
  const log = run.pack.log;
  run.pack = null;
  run.phase = ret;
  return { log, returnTo: ret };
}
