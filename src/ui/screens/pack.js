import { asset } from '../dom.js';
import { stage, sideBtns, bindActs } from './common.js';
import { game, go } from '../router.js';
import { jokerSlotCount } from '../../core/run.js';
import { jokerSprite, cardSprite, tarotSprite, runeSprite, runeTile, deckCardSprite, esc, coin, fmt, $, jokerDesc, jokerDescHTML, $$ } from '../dom.js';
import { JOKER_BY_ID } from '../../data/jokers.js';
import { TAROT_BY_ID } from '../../data/tarots.js';
import { RUNE_BY_ID } from '../../data/runes.js';
import { sellJoker, jokerSellPrice, consumableSlots } from '../../core/shop.js';
import { validateTarot, useTarot, validateRune, useRune, takeJoker, takeRune, finishPack } from '../../core/packs.js';
import { t } from '../../i18n/index.js';
import { pop, shake } from '../anim.js';
import { store } from '../store.js';
import { devlog } from '../devlog.js';

const PACK_NAME = { jokers: 'pack.title.jokers', tarot: 'pack.title.tarot', megaTarot: 'pack.title.megaTarot', runes: 'pack.title.runes', megaRunes: 'pack.title.megaRunes' };
const PACK_INFO = {
  jokers: (p) => t('pack.status.choose_one', { n: p.picksLeft, m: p.options.length + (p.log?.filter((x) => x.kind === 'joker').length ?? 0) }),
  tarot: (p) => t('pack.status.choose', { n: p.picksLeft, m: p.options.length + (p.log?.filter((x) => x.kind === 'tarot').length ?? 0) }),
  megaTarot: (p) => t('pack.status.choose', { n: p.picksLeft, m: p.options.length + (p.log?.filter((x) => x.kind === 'tarot').length ?? 0) }),
  runes: (p) => t('pack.status.choose_one', { n: p.picksLeft, m: p.options.length + (p.log?.filter((x) => x.kind === 'rune').length ?? 0) }),
  megaRunes: (p) => t('pack.status.choose_one', { n: p.picksLeft, m: p.options.length + (p.log?.filter((x) => x.kind === 'rune').length ?? 0) }),
};

export default function packScreen() {
  const run = game.run;
  const el = stage();
  let openOpt = -1;
  let marked = []; // card ids
  let jsel = -1; // joker index for wheel-like tarots
  let msg = '';

  const p = () => run.pack;
  const kind = () => p()?.kind ?? 'tarot';
  const isUse = () => p()?.source === 'use';

  function closeAndGo() {
    const res = finishPack(run);
    go(res?.returnTo ?? 'shop');
  }

  function doneCheck() {
    if (!p()) return;
    if (p().done || (p().picksLeft <= 0 && !p().options.length)) {
      // show finish overlay state; keep drawing but with continue prominent
    }
  }

  function jokerBarHTML() {
    const slots = jokerSlotCount(run);
    return Array.from({ length: slots }, (_, i) => {
      const j = run.jokers[i];
      if (!j) return `<div class="js"><span class="jempty">${t('common.free')}</span></div>`;
      const def = JOKER_BY_ID[j.id];
      const jname = t(`joker.${j.id}.name`);
      const price = jokerSellPrice(j);
      const sel = jsel === i ? ' sel' : '';
      return `<div class="js" data-slot="${i}">
        <button type="button" class="jb${sel}" data-act="pick-joker" data-i="${i}" aria-label="${esc(jname)}">${jokerSprite(def.art, { s: 1.25, edition: j.edition })}</button>
        ${jsel === i ? `<div class="panel-q jpop"><span style="font-size:18px;font-weight:700;line-height:1.05">${esc(jname)}</span><span style="font-size:14px;color:#ecc062;line-height:1.15">${jokerDescHTML(j.id, run)}</span>${j.edition ? `<span class="ed">${t(`edition.${j.edition}`)}</span>` : ''}<button class="btn btn-wine" type="button" data-act="sell-joker" data-i="${i}" style="min-height:40px;height:40px;font-size:17px;padding:0 12px">${t('shop.sell')} ${coin(16)}+${price}</button></div>` : ''}
      </div>`;
    }).join('');
  }

  function consumablesHTML() {
    return Array.from({ length: consumableSlots(run) }, (_, i) => {
      const id = run.consumables[i];
      if (!id) return `<span class="cempty" style="width:60px;height:80px">${t('common.free')}</span>`;
      return `<span class="conslot" title="${esc(t(`tarot.${id}.name`))}">${tarotSprite(id, { s: 0.85 })}</span>`;
    }).join('');
  }

  function activeDef(opt) {
    if (!opt) return null;
    if (kind() === 'tarot') return TAROT_BY_ID[opt.id];
    const r = RUNE_BY_ID[opt.id];
    return r?.active ? r : null;
  }

  const markIndex = (cid) => marked.findIndex((x) => x == cid);
  function deckHTML() {
    if (kind() !== 'tarot' && kind() !== 'runes') return '';
    const pk = p();
    const opt = pk.options[openOpt];
    const tdef = activeDef(opt);
    if (kind() === 'runes' && !tdef?.needs?.cards && !tdef?.needs?.joker) return '';
    const cards = (pk.deckIds || []).map((id) => run.deck.find((c) => c.id == id)).filter(Boolean);
    if (!cards.length) return '';
    const need = tdef?.needs?.cards;
    const max = need ? need[1] : 0;
    const row = cards.map((c, i) => {
      const mi = markIndex(c.id);
      const isMarked = mi >= 0;
      const canMark = !!need;
      return `<button type="button" class="dk${isMarked ? ' mk' : ''}" data-act="mark" data-id="${esc(c.id)}" style="--i:${i};position:relative" ${canMark ? '' : 'disabled'} aria-label="${esc(cardNameSafe(c))}${isMarked ? ', seleccionada' : ''}">${deckCardSprite(c, { s: 2 })}</button>`;
    }).join('');
    return `<section class="pkdeck" aria-label="${t('pack.deck.title')}">
      <div style="display:flex;align-items:center;justify-content:center;gap:16px">
        <span class="label">${t('pack.deck.title')}</span>
        <span style="font-size:18px;color:#ffe08a;font-weight:700">${t('pack.marked', { n: marked.length })}${max ? ` / ${max}` : ''}${need && need[0] === need[1] && need[1] > 1 ? ' · en orden' : ''}</span>
      </div>
      <div class="deck" style="display:flex;justify-content:center;gap:14px;margin-top:14px;flex-wrap:wrap;overflow:visible">${row}</div>
    </section>`;
  }

  function cardNameSafe(c) { try { return `${c.rank} ${c.suit}`; } catch { return 'card'; } }

  function optionHTML(opt, i) {
    const pk = p();
    const open = openOpt === i;
    const fcCls = `fc${open ? ' on' : ''}`;
    if (kind() === 'jokers') {
      const def = JOKER_BY_ID[opt.id];
      const name = t(`joker.${opt.id}.name`);
      const desc = t(`joker.${opt.id}.desc`);
      const noSpace = run.jokers.length >= jokerSlotCount(run);
      return `<div class="cell">
        <button type="button" class="${fcCls}" data-act="open-opt" data-i="${i}" aria-label="${esc(name)}">${jokerSprite(def?.art ?? 0, { s: 2, edition: opt.edition })}</button>
        ${open ? `<div class="panel-q info"><span class="nm">${esc(name)}</span><span class="fx">${esc(desc)}${opt.edition ? ` · ${t(`edition.${opt.edition}`)}` : ''}</span>${noSpace ? `<span class="warn">${esc(t('pack.err.nospace'))}</span>` : ''}<button class="btn ibtn" type="button" data-act="take-joker" data-i="${i}" ${noSpace ? 'disabled' : ''}>${t('pack.apply')}</button></div>` : ''}
      </div>`;
    }
    if (kind() === 'tarot') {
      const name = t(`tarot.${opt.id}.name`);
      const desc = t(`tarot.${opt.id}.desc`);
      const tdef = TAROT_BY_ID[opt.id];
      const needsCards = !!tdef?.needs?.cards;
      const needsJoker = !!tdef?.needs?.joker;
      const v = validateTarot(run, i, { cardIds: marked, jokerIndex: needsJoker ? jsel : null });
      let hint = needsCards ? (tdef.needs.cards[0] === tdef.needs.cards[1] ? t('pack.err.pickcard') : t('pack.err.pick2')) : needsJoker ? t('pack.err.pickjoker') : '';
      if (needsCards && opt.id === 'death') hint = 'Marca 2 cartas en orden: #1 se vuelve copia de #2';
      else if (needsCards && tdef.needs.cards[1] === 2 && tdef.needs.cards[0] === 1) hint = 'Marca 1 o 2 cartas';
      else if (needsCards && tdef.needs.cards[1] === 2 && tdef.needs.cards[0] === 2) hint = 'Marca 2 cartas (en orden)';
      const btnLabel = needsJoker ? t('pack.use_on_joker') : t('pack.use');
      return `<div class="cell">
        <button type="button" class="${fcCls}" data-act="open-opt" data-i="${i}" aria-label="${esc(name)}">${tarotSprite(opt.id, { s: 2 })}</button>
        ${open ? `<div class="panel-q info"><span class="nm">${esc(name)}</span><span class="fx">${esc(desc)}</span>${!v.ok ? `<span class="hint">${esc(t(v.message) !== v.message ? t(v.message) : (marked.length ? t(v.message) : hint || t(v.message)))}</span>` : ''}${v.ok && needsCards ? `<span class="hint" style="color:#a8d8a0">${t('pack.ready')}</span>` : ''}<button class="btn ibtn" type="button" data-act="use-tarot" data-i="${i}" ${v.ok ? '' : 'disabled'}>${btnLabel}</button></div>` : ''}
      </div>`;
    }
    // runes
    const name = `${RUNE_BY_ID[opt.id]?.sym ?? ''} ${t(`rune.${opt.id}.name`)}`.trim();
    const desc = t(`rune.${opt.id}.desc`);
    const rdef = RUNE_BY_ID[opt.id];
    if (rdef?.active) {
      const needsCards = !!rdef.needs?.cards;
      const needsJoker = !!rdef.needs?.joker;
      const v = validateRune(run, i, { cardIds: marked, jokerIndex: needsJoker ? jsel : null });
      let hint = needsCards ? (rdef.needs.cards[0] === rdef.needs.cards[1] ? t('pack.err.pickcard') : t('pack.err.pick2')) : needsJoker ? t('pack.err.pickjoker') : '';
      if (needsCards && rdef.needs.cards[0] === 1 && rdef.needs.cards[1] === 1) hint = t('rune.active.pickcard_hint');
      const btnLabel = needsJoker ? t('pack.use_on_joker') : t('pack.use');
      return `<div class="cell">
        <button type="button" class="${fcCls}" data-act="open-opt" data-i="${i}" aria-label="${esc(name)}">${runeTile(opt.id)}</button>
        ${open ? `<div class="panel-q info"><span class="nm">${esc(name)}</span><span class="fx">${esc(desc)}</span><span class="ed">${t('rune.active')} · ${rdef.rarity ?? ''}</span>${!v.ok ? `<span class="hint">${esc(t(v.message) !== v.message ? t(v.message) : (marked.length ? t(v.message) : hint || t(v.message)))}</span>` : ''}${v.ok && needsCards ? `<span class="hint" style="color:#a8d8a0">${t('pack.ready')}</span>` : ''}<button class="btn ibtn" type="button" data-act="use-rune" data-i="${i}" ${v.ok ? '' : 'disabled'}>${btnLabel}</button></div>` : ''}
      </div>`;
    }
    return `<div class="cell">
      <button type="button" class="${fcCls}" data-act="open-opt" data-i="${i}" aria-label="${esc(name)}">${runeTile(opt.id)}</button>
      ${open ? `<div class="panel-q info"><span class="nm">${esc(name)}</span><span class="fx">${esc(desc)}</span><span class="ed">${rdef?.rarity ?? ''}</span><button class="btn ibtn" type="button" data-act="take-rune" data-i="${i}">${t('pack.apply')}</button></div>` : ''}
    </div>`;
  }

  function draw() {
    const pk = p();
    if (!pk) { go('shop'); return; }
    const done = pk.done || (pk.picksLeft <= 0) || pk.options.length === 0;
    const titleKey = isUse() ? (kind() === 'runes' ? 'pack.title.runes' : 'pack.title.tarot') : (PACK_NAME[pk.type] ?? 'pack.title.tarot');
    const status = done ? t('pack.status.ready') : (PACK_INFO[pk.type] ? PACK_INFO[pk.type](pk) : t('pack.status.choose_one', { n: pk.picksLeft, m: pk.options.length }));
    const n = pk.options.length || 1;
    const ncls = n <= 2 ? 'n2' : n === 3 ? 'n3' : n <= 4 ? 'n4' : 'n6';
    const opts = pk.options.map(optionHTML).join('');

    el.innerHTML = `<div class="bunting"></div>
    <div class="panel-q jbar" role="group" aria-label="${t('shop.jokers_aria')}"><span class="jcount">${run.jokers.length}/${jokerSlotCount(run)}</span><div class="jslots">${jokerBarHTML()}</div></div>
    <div class="panel-q cbar" role="group" aria-label="${t('shop.consumables_aria')}">${consumablesHTML()}</div>
    <header class="pkhead">
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
        <span class="label">${esc(status)}</span>
        <h1 style="font-size:30px;line-height:1.05;font-weight:700;color:#cf9b38;text-shadow:0 4px 0 #7a5a1e,5px 7px 0 #000">${esc(t(titleKey))}</h1>
        ${msg ? `<span class="warn">${esc(t(msg))}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:16px;flex:none">
        <button class="btn btn-ghost" type="button" data-act="skip" style="width:150px;height:48px;min-height:48px;font-size:20px">${done ? t('pack.continue') : t('pack.skip')}</button>
        <div class="panel" style="display:flex;align-items:center;gap:10px;padding:0 18px;height:48px;box-sizing:border-box">${coin(22)}<span style="font-size:28px;font-weight:400;color:#ecc062">${fmt(run.coins)}</span></div>
      </div>
    </header>
    ${deckHTML()}
    <section class="pkopts ${ncls}" aria-label="Opciones">${opts || `<div class="panel-q" style="padding:20px;text-align:center;grid-column:1/-1">${t('shop.pack.empty')}</div>`}</section>
    ${done ? `<div class="pkfin"><div class="panel"><span class="label">${t('pack.fin.title')}</span><h2 style="font-size:34px;color:#cf9b38">${esc(t(titleKey))}</h2><p style="color:#b9a780">${esc(t('pack.fin.desc'))}</p><button class="btn" type="button" data-act="skip" style="height:52px;min-width:200px">${t('pack.continue')}</button></div></div>` : ''}
    ${sideBtns()}`;
  }

  bindActs(el, {
    skip: () => closeAndGo(),
    'open-opt': (btn) => {
      const i = Number(btn.dataset.i);
      const pk = p();
      if (!pk || !pk.options[i]) return;
      // toggle open; reset selection when switching tarot option
      if (openOpt === i) { /* keep */ } else { openOpt = i; marked = []; jsel = -1; msg = ''; }
      draw();
    },
    mark: (btn) => {
      const raw = btn.dataset.id;
      const n = Number(raw);
      const id = Number.isFinite(n) && String(n) === String(raw).trim() ? n : raw;
      const pk = p();
      const opt = pk?.options[openOpt];
      const tdef = activeDef(opt);
      const need = tdef?.needs?.cards;
      if (!need) return;
      const max = need[1];
      const mi = marked.findIndex((x) => x == id);
      if (mi >= 0) {
        marked = marked.filter((x) => x != id);
      } else if (marked.length < max) {
        marked = [...marked, id];
      } else {
        // Límite alcanzado: reemplaza en cola (FIFO) para no obligar a desmarcar.
        marked = [...marked.slice(1), id];
      }
      devlog?.('info', 'pack mark', { id, marked, max, opt: opt?.id, kind: kind() });
      msg = '';
      draw();
    },
    'pick-joker': (btn) => { jsel = jsel === Number(btn.dataset.i) ? -1 : Number(btn.dataset.i); draw(); },
    'sell-joker': (btn) => { sellJoker(run, Number(btn.dataset.i)); jsel = -1; msg = ''; draw(); },
    'use-tarot': (btn) => {
      const i = Number(btn.dataset.i);
      const opt = p()?.options[openOpt >= 0 ? openOpt : i];
      const tdef = opt ? TAROT_BY_ID[opt.id] : null;
      const sel = { cardIds: marked, jokerIndex: tdef?.needs?.joker ? jsel : null };
      devlog?.('info', 'use-tarot click', { opt: opt?.id, optIndex: openOpt >= 0 ? openOpt : i, marked, jsel, source: p()?.source, deckIds: p()?.deckIds?.length });
      const r = useTarot(run, openOpt >= 0 ? openOpt : i, sel);
      if (!r.ok) { devlog?.('warn', 'use-tarot fail', { opt: opt?.id, msg: r.message, sel }); msg = r.message; shake(el); draw(); return; }
      msg = ''; openOpt = -1; marked = []; jsel = -1;
      draw();
      if (p()?.done) { /* overlay shown */ }
    },
    'take-joker': (btn) => {
      const r = takeJoker(run, Number(btn.dataset.i));
      if (!r.ok) { msg = r.message; shake(el); draw(); return; }
      msg = ''; openOpt = -1; draw();
    },
    'use-rune': (btn) => {
      const i = Number(btn.dataset.i);
      const opt = p()?.options[openOpt >= 0 ? openOpt : i];
      const rdef = opt ? RUNE_BY_ID[opt.id] : null;
      const sel = { cardIds: marked, jokerIndex: rdef?.needs?.joker ? jsel : null };
      const r = useRune(run, openOpt >= 0 ? openOpt : i, sel);
      if (!r.ok) { devlog?.('warn', 'use-rune fail', { opt: opt?.id, msg: r.message, sel }); msg = r.message; shake(el); draw(); return; }
      msg = ''; openOpt = -1; marked = []; jsel = -1;
      draw();
    },
    'take-rune': (btn) => {
      const r = takeRune(run, Number(btn.dataset.i));
      if (!r.ok) { msg = r.message; shake(el); draw(); return; }
      msg = ''; openOpt = -1; draw();
    },
  });

  draw();
  return { el, refresh: draw };
}
