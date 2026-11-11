import { asset } from '../dom.js';
import { stage, sideBtns, bindActs } from './common.js';
import { game, go, openModal } from '../router.js';
import { advanceDealer, jokerSlotCount } from '../../core/run.js';
import { buy, buyVoucher, buyPack, reroll, rerollPrice, sellJoker, jokerSellPrice, leaveShop, moveJoker, consumableSlots, PACKS } from '../../core/shop.js';
import { JOKER_BY_ID } from '../../data/jokers.js';
import { TAROT_BY_ID } from '../../data/tarots.js';
import { RUNE_BY_ID } from '../../data/runes.js';
import { VOUCHERS } from '../../data/vouchers.js';
import { pickLine } from '../../data/dealers.js';
import { jokerSprite, cardSprite, tarotSprite, runeSprite, esc, coin, fmt, $, jokerDesc, jokerDescHTML, $$ } from '../dom.js';
import { store } from '../store.js';
import { makeSortable } from '../sortable.js';
import { autosave } from '../savegame.js';
import { t, tl } from '../../i18n/index.js';
import { pop, shake } from '../anim.js';
import { openPack, openTarotUse, openRuneUse, useTarot, finishPack } from '../../core/packs.js';

const PK_SPRITE = { jokers: [0, 6], tarot: [0, 5], megaTarot: [1, 5], runes: [0, 12], megaRunes: [1, 12] };

export default function shop() {
  const run = game.run;
  const el = stage();
  let selected = -1;
  let sorter = null;
  let tarotPick = -1; // index of tarot item showing use/keep choice
  const line = () => (store.settings.dialogs ? pickLine(tl('luvierre.shop'), run.streams.shop) : '');
  let talk = line();

  function draw() {
    const sh = run.shop;
    if (!sh) return;
    const slots = jokerSlotCount(run);
    const full = run.jokers.length >= slots;

    const jokersHTML = Array.from({ length: slots }, (_, i) => {
      const j = run.jokers[i];
      if (!j) return `<div class="js"><span class="jempty">${t('common.free')}</span></div>`;
      const def = JOKER_BY_ID[j.id];
      const jname = t(`joker.${j.id}.name`);
      const price = jokerSellPrice(j);
      return `<div class="js" data-slot="${i}">
        <button type="button" class="jb ${selected === i ? 'sel' : ''}" data-act="pick-joker" data-i="${i}" aria-label="${esc(t('shop.sell_aria', { name: jname }))}">${jokerSprite(def.art, { s: 1.25, edition: j.edition })}</button>
        ${selected === i ? `<div class="panel-q jpop"><span style="font-size:18px;font-weight:700;line-height:1.05">${esc(jname)}</span><span style="font-size:14px;color:#ecc062;line-height:1.15">${jokerDescHTML(j.id, run)}</span>${j.edition ? `<span class="ed">${t(`edition.${j.edition}`)}</span>` : ''}<button class="btn btn-wine" type="button" data-act="sell-joker" data-i="${i}" style="min-height:40px;height:40px;font-size:17px;padding:0 12px">${t('shop.sell')} ${coin(16)}+${price}</button></div>` : ''}
      </div>`;
    }).join('');

    const nameOf = (kind, id) => t(`${kind}.${id}.name`);
    const descOf = (kind, id) => t(`${kind}.${id}.desc`);

    const item = (it, idx) => {
      if (!it) return '';
      if (it.kind === 'card') {
        return `<article class="sc"><div class="art">${it.sold ? `<span class="soldtag">${t('shop.sold')}</span>` : cardSprite(it.card, { s: 2 })}</div><span class="nm">${cardNameSafe(it.card)}</span><span class="fx">${t('shop.card_for_deck')}</span>
        <button class="btn buy" type="button" data-act="buy" data-i="${idx}" ${it.sold || run.coins < it.price ? 'disabled' : ''}>${it.sold ? t('shop.sold') : `${coin(20)}${it.price}`}</button></article>`;
      }
      if (it.kind === 'tarot') {
        const name = nameOf('tarot', it.id);
        const desc = descOf('tarot', it.id);
        const canKeep = run.consumables.length < consumableSlots(run);
        const choosing = tarotPick === idx && !it.sold;
        const buyRow = choosing
          ? `<div style="display:flex;gap:6px;width:100%;margin-top:auto"><button class="btn buy" type="button" data-act="buy-tarot-use" data-i="${idx}" ${run.coins < it.price ? 'disabled' : ''} style="flex:1;font-size:15px;padding:0 4px">${t('shop.use_now')}</button><button class="btn btn-ghost buy" type="button" data-act="buy-tarot-keep" data-i="${idx}" ${!canKeep || run.coins < it.price ? 'disabled' : ''} style="flex:1;font-size:15px;padding:0 4px">${t('shop.keep')}</button></div>`
          : `<button class="btn buy" type="button" data-act="buy-tarot-ask" data-i="${idx}" ${it.sold || run.coins < it.price ? 'disabled' : ''}>${it.sold ? t('shop.sold') : `${coin(20)}${it.price}`}</button>`;
        return `<article class="sc"><div class="art">${it.sold ? `<span class="soldtag">${t('shop.sold')}</span>` : tarotSprite(it.id, { s: 1.5 })}</div><span class="nm">${esc(name)}</span><span class="fx" style="min-height:34px">${esc(desc)}</span>${buyRow}</article>`;
      }
      if (it.kind === 'rune') {
        const name = nameOf('rune', it.id);
        const desc = descOf('rune', it.id);
        return `<article class="sc"><div class="art">${it.sold ? `<span class="soldtag">${t('shop.sold')}</span>` : `<div style="width:96px;height:128px;display:flex;align-items:center;justify-content:center">${runeSprite(it.id, { s: 4 })}</div>`}</div><span class="nm">${esc(name)}</span><span class="fx">${esc(desc)}</span>
        <button class="btn buy" type="button" data-act="buy" data-i="${idx}" ${it.sold || run.coins < it.price ? 'disabled' : ''}>${it.sold ? t('shop.sold') : `${coin(20)}${it.price}`}</button></article>`;
      }
      const def = JOKER_BY_ID[it.id];
      if (!def) return `<article class="sc"><span class="nm">?</span><button class="btn buy" type="button" disabled>${t('shop.sold')}</button></article>`;
      return `<article class="sc"><div class="art">${it.sold ? `<span class="soldtag">${t('shop.sold')}</span>` : jokerSprite(def.art, { s: 2, edition: it.edition })}</div><span class="nm">${esc(t(`joker.${it.id}.name`))}</span><span class="fx">${esc(t(`joker.${it.id}.desc`))}${it.edition ? ` · ${t(`edition.${it.edition}`)}` : ''}</span>
      <button class="btn buy" type="button" data-act="buy" data-i="${idx}" ${it.sold || run.coins < it.price || full ? 'disabled' : ''}>${it.sold ? t('shop.sold') : `${coin(20)}${it.price}`}</button></article>`;
    };

    const v = sh.voucher;
    const vdef = v && VOUCHERS.find((x) => x.id === v.id);
    const voucherHTML = `<article class="sc sc2">
      <div style="width:65px;height:117px;flex:none;display:flex;align-items:center;justify-content:center"><div class="vale"><span style="font-size:18px;font-weight:700;letter-spacing:.06em">VALE</span><span style="width:40px;height:4px;background:#0a0806"></span></div></div>
      <div style="flex:1;align-self:stretch;display:flex;flex-direction:column;gap:4px;min-width:0"><span class="nm">${vdef ? esc(t(`voucher.${vdef.id}.name`)) : t('shop.no_vouchers')}</span><span class="fx">${vdef ? esc(t(`voucher.${vdef.id}.desc`)) : t('shop.all_vouchers')}</span>
      ${vdef ? `<button class="btn buy" type="button" data-act="voucher" ${v.sold || run.coins < v.price ? 'disabled' : ''}>${v.sold ? t('shop.bought') : `${coin(20)}${v.price}`}</button>` : ''}</div></article>`;

    const packCard = (pk, i) => {
      if (!pk) return `<article class="sc sc2"></article>`;
      const def = PACKS[pk.type];
      const sp = PK_SPRITE[pk.type] ?? [0, 0];
      const titleKey = pk.type === 'megaTarot' ? 'pack.title.megaTarot' : pk.type === 'megaRunes' ? 'pack.title.megaRunes' : def.kind === 'jokers' ? 'pack.title.jokers' : def.kind === 'tarot' ? 'pack.title.tarot' : 'pack.title.runes';
      const sub = def.kind === 'jokers' ? t('shop.pack.jokers.sub') : def.kind === 'tarot' ? (def.pick > 1 ? `Elige ${def.pick} de ${def.show}` : t('shop.pack.tarot.sub')) : (def.pick > 1 ? `Elige ${def.pick} de ${def.show}` : t('shop.pack.runes.sub'));
      return `<article class="sc sc2"><div class="pkw" role="img" aria-label="${esc(t(titleKey))}"><div class="pkin"><span class="pk" style="--c:${sp[0]};--r:${sp[1]}"></span></div></div>
        <div style="flex:1;align-self:stretch;display:flex;flex-direction:column;gap:4px;min-width:0"><span class="nm" style="font-size:17px;line-height:1.05">${esc(t(titleKey))}</span><span class="fx">${esc(sub)}</span>
        <button class="btn buy" type="button" data-act="buy-pack" data-i="${i}" ${pk.sold || run.coins < def.price ? 'disabled' : ''}>${pk.sold ? t('shop.sold') : `${coin(20)}${def.price}`}</button></div></article>`;
    };

    const consHTML = Array.from({ length: consumableSlots(run) }, (_, i) => {
      const id = run.consumables[i];
      if (!id) return `<span class="cempty" style="width:60px;height:80px">${t('common.free')}</span>`;
      return `<span class="conslot"><button type="button" data-act="use-consumable" data-i="${i}" title="${esc(t(`tarot.${id}.name`))}">${tarotSprite(id, { s: 0.85 })}</button></span>`;
    }).join('');

    const runesHTML = run.runes.length ? `<div class="runestrip" style="margin-top:4px">${run.runes.map((id) => `<span class="runechip" title="${esc(t(`rune.${id}.desc`))}">${runeSprite(id, { s: 1.5 })}</span>`).join('')}</div>` : '';

    el.innerHTML = `<div class="bunting"></div>
    <div class="panel-q jbar" role="group" aria-label="${t('shop.jokers_aria')}"><span class="jcount">${run.jokers.length}/${slots}</span><div class="jslots" id="jslots">${jokersHTML}</div></div>
    <div class="panel-q cbar" role="group" aria-label="${t('shop.consumables_aria')}">${consHTML}</div>
    <header style="position:absolute;z-index:4;top:40px;left:616px;width:300px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between"><h1 style="font-size:36px;line-height:1;font-weight:700;color:#cf9b38;text-shadow:0 4px 0 #7a5a1e,5px 7px 0 #000">${t('shop.title')}</h1>
      <div class="panel" style="display:flex;align-items:center;gap:10px;padding:0 18px;height:48px">${coin(24)}<span id="coins" style="font-size:30px;font-weight:400;color:#ecc062">${fmt(run.coins)}</span></div></div>
      ${sh.message ? `<p style="font-size:15px;line-height:1.2;color:#e8705f">${esc(t(sh.message))}</p>` : full ? `<p style="font-size:15px;line-height:1.2;color:#e8705f">${t('shop.noroom')}</p>` : ''}
      ${runesHTML}
    </header>
    <section class="panel-q shelf" aria-label="${t('shop.items_aria')}">
      <div class="srow" style="height:290px;grid-template-columns:repeat(4,minmax(0,1fr))">${sh.items.map(item).join('')}</div>
      <div class="srow" style="flex:1;grid-template-columns:repeat(4,minmax(0,1fr))">${voucherHTML}${sh.packs.map(packCard).join('')}</div>
    </section>
    <aside style="position:absolute;z-index:4;top:36px;left:940px;width:316px;display:flex;flex-direction:column;gap:16px">
      <div class="panel" style="height:170px;overflow:hidden;background:radial-gradient(ellipse at 50% 85%,#9a6f26 0,#5a3f14 45%,#15100a 90%);display:flex;align-items:flex-end;justify-content:center"><img src="${asset('tendero.png')}" alt="${t('shop.tendero_alt')}" style="height:160px;width:auto;display:block"></div>
      <div class="panel-q" ${talk ? '' : 'hidden'} style="position:relative;height:84px;padding:8px 12px 10px;display:flex;flex-direction:column;gap:2px;border-color:#ecc062"><span style="position:absolute;top:-10px;left:60px;width:14px;height:14px;background:#15100a;border-left:3px solid #ecc062;border-top:3px solid #ecc062;transform:rotate(45deg)"></span><span class="label" style="color:#ecc062">${t('shop.speaker')}</span><p style="font-size:16px;line-height:1.2">${esc(talk)}</p></div>
      <button class="btn btn-wine" type="button" data-act="reroll" style="height:56px;justify-content:space-between;padding:0 22px"><span>${t('shop.reroll')}</span><span style="display:flex;align-items:center;gap:8px">${coin()}${rerollPrice(run)}</span></button>
      <button class="panel-q deckbtn" type="button" data-act="deck-sell" aria-label="${t('shop.deck.aria', { n: run.deck.length })}"><div class="mini" aria-hidden="true"><span class="spr bk lay" style="--s:1.5;left:0;top:12px;filter:brightness(.55)"></span><span class="spr bk lay" style="--s:1.5;left:6px;top:6px;filter:brightness(.8)"></span><span class="spr bk" style="--s:1.5;left:12px;top:0"></span></div>
        <div style="display:flex;flex-direction:column;gap:2px;text-align:left"><span class="label">${t('shop.deck')}</span><span style="font-size:40px;font-weight:400;line-height:1">${run.deck.length}</span><span style="font-size:15px;color:#ecc062;line-height:1.15">${t('shop.deck.sub')}</span></div></button>
      <button class="btn" type="button" data-act="next" style="height:56px;font-size:24px">${t('shop.next')}</button>
    </aside>
    ${sideBtns()}`;

    // reordenar jokers arrastrando (el orden es el orden de aplicación)
    sorter?.destroy();
    const row = $('#jslots', el);
    sorter = makeSortable(row, {
      items: () => $$('.js[data-slot]', row),
      onReorder: (from, to) => { moveJoker(run, from, to); selected = -1; draw(); autosave(run); },
    });
  }

  function cardNameSafe(c) { return `${c.rank}${SUIT_SHORT[c.suit] ?? ''}`; }
  const SUIT_SHORT = { clubs: '♣', hearts: '♥', spades: '♠', diamonds: '♦' };

  const flashFail = (r) => { if (!r.ok) { run.shop.message = r.message; shake($('#coins', el)); } else { pop($('#coins', el)); } draw(); return r; };

  bindActs(el, {
    buy: (tbtn) => {
      tarotPick = -1;
      const r = buy(run, Number(tbtn.dataset.i));
      if (r.ok && r.useRune) { openRuneUse(run, r.useRune, 'shop'); go('pack'); return; }
      flashFail(r);
    },
    'buy-tarot-ask': (tbtn) => { tarotPick = tarotPick === Number(tbtn.dataset.i) ? -1 : Number(tbtn.dataset.i); run.shop.message = null; draw(); },
    'buy-tarot-use': (tbtn) => {
      const idx = Number(tbtn.dataset.i);
      const it = run.shop.items[idx];
      const tdef = it && TAROT_BY_ID[it.id];
      const noSel = tdef && !tdef.needs?.cards && !tdef.needs?.joker;
      if (noSel) {
        const r = buy(run, idx, 'use');
        if (r.ok && r.use) { openTarotUse(run, r.use, null, 'shop'); useTarot(run, 0, {}); finishPack(run); draw(); return; }
        flashFail(r); return;
      }
      const r = buy(run, idx, 'use');
      if (!r.ok) { flashFail(r); return; }
      if (r.use) { openTarotUse(run, r.use, null, 'shop'); go('pack'); }
    },
    'buy-tarot-keep': (tbtn) => {
      const r = buy(run, Number(tbtn.dataset.i), 'keep');
      tarotPick = -1; flashFail(r);
    },
    'use-consumable': (tbtn) => {
      const ci = Number(tbtn.dataset.i);
      const id = run.consumables[ci];
      if (!id) return;
      const tdef = TAROT_BY_ID[id];
      const noSel = tdef && !tdef.needs?.cards && !tdef.needs?.joker;
      openTarotUse(run, id, ci, 'shop');
      if (noSel) { useTarot(run, 0, {}); finishPack(run); draw(); return; }
      go('pack');
    },
    'buy-pack': (tbtn) => {
      const i = Number(tbtn.dataset.i);
      const r = buyPack(run, i);
      if (!r.ok) { flashFail(r); return; }
      openPack(run, r.type, 'shop');
      go('pack');
    },
    voucher: () => flashFail(buyVoucher(run)),
    reroll: () => { const r = reroll(run); if (!r.ok) run.shop.message = r.message; talk = line(); draw(); },
    'pick-joker': (tbtn) => { selected = selected === Number(tbtn.dataset.i) ? -1 : Number(tbtn.dataset.i); draw(); },
    'sell-joker': (tbtn) => { sellJoker(run, Number(tbtn.dataset.i)); selected = -1; run.shop.message = null; draw(); },
    'deck-sell': () => openModal('deck', { sell: true, onChange: draw }),
    next: () => { leaveShop(run); advanceDealer(run); go('dealers'); },
  });

  draw();
  return { el, refresh: draw, destroy: () => sorter?.destroy() };
}
