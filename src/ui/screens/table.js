import { asset } from '../dom.js';
import { stage, sideBtns, bindActs } from './common.js';
import { game, go, openModal } from '../router.js';
import { currentDealer, beginHand, actions, finishDealerTurn, settleHand, endDealer, gameOver, canFarm, clampBet, minBet, maxBet, jokerSlotCount, peekNext } from '../../core/run.js';
import { dealerVisibleTotal } from '../../core/round.js';
import { runEffects } from '../../core/scoring.js';
import { comboEffect } from '../../core/combos.js';
import { handTotal } from '../../core/deck.js';
import { jokerEffects, JOKER_BY_ID } from '../../data/jokers.js';
import { pickLine } from '../../data/dealers.js';
import { $, $$, esc, fmt, chip, cardSprite, backSprite, jokerSprite, tarotSprite, runeSprite, cardName, pips, coin, jokerDesc, jokerDescHTML } from '../dom.js';
import { store } from '../store.js';
import { autosave } from '../savegame.js';
import { makeSortable } from '../sortable.js';
import { moveCard } from '../../core/round.js';
import { moveJoker } from '../../core/shop.js';
import { t, tl } from '../../i18n/index.js';
import { flyIn, sleep, shake, pop, countTo } from '../anim.js';
import { openTarotUse, useTarot, finishPack } from '../../core/packs.js';
import { TAROT_BY_ID } from '../../data/tarots.js';
import { RUNE_BY_ID } from '../../data/runes.js';
import { consumableSlots } from '../../core/shop.js';

const RESULT_KIND = { win: 'win', blackjack: 'win', multiWin: 'win', push: 'push', lose: 'lose', bust: 'lose' };
const fmtMult = (m) => `${Math.round(m * 100) / 100}`;

export default function table() {
  const run = game.run;
  const dealer = currentDealer(run);
  const dn = t(`dealer.${dealer.id}.name`);
  const el = stage();
  let phase = (run.hand && run.hand.phase === 'done') ? 'resolved' : 'bet'; // bet | player | busy | resolved
  let bet = clampBet(run, run.lastBet ?? run.cfg.minBet);
  let discarding = false;
  let alive = true;
  let bannerTimer = null;
  let langDirty = false;

  const slots = jokerSlotCount(run);
  const jokerHTML = () => Array.from({ length: slots }, (_, i) => {
    const j = run.jokers[i];
    if (!j) return `<span class="jempty tj">${t('common.free')}</span>`;
    const def = JOKER_BY_ID[j.id];
    const jn = t(`joker.${j.id}.name`), jd = jokerDesc(j.id, run);
    return `<span class="tj has" data-i="${i}" tabindex="0" title="${esc(jn)} — ${esc(jd)}${j.edition ? ` · ${t(`edition.${j.edition}`)}` : ''}" aria-label="${i + 1}. ${esc(jn)}, ${esc(jd)}">${jokerSprite(def.art, { s: 1.5, edition: j.edition })}</span>`;
  }).join('');

  el.innerHTML += `
  <aside style="position:absolute;z-index:6;top:36px;left:24px;width:212px;display:flex;flex-direction:column;gap:14px">
    <div class="panel" style="height:220px;overflow:hidden;background:radial-gradient(ellipse at 50% 85%,#9a6f26 0,#5a3f14 45%,#15100a 90%);display:flex;align-items:flex-end;justify-content:center">
      <img id="dealer-img" src="${asset(dealer.img.table)}" alt="${esc(t('table.dealer_alt', { name: dn }))}" style="height:208px;width:auto;display:block">
    </div>
    <div class="panel-q" id="bubble" style="position:relative;height:92px;padding:10px 12px 12px;display:flex;flex-direction:column;gap:2px" ${store.settings.dialogs ? '' : 'hidden'}>
      <span style="position:absolute;top:-10px;left:44px;width:14px;height:14px;background:#15100a;border-left:3px solid #7a5a1e;border-top:3px solid #7a5a1e;transform:rotate(45deg)"></span>
      <span class="label" style="color:#ecc062">${esc(dn)}</span>
      <p id="bubble-text" style="font-size:16px;line-height:1.2"></p>
    </div>
    <div class="panel-q" style="padding:12px 14px 14px;display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:baseline;justify-content:space-between"><span style="font-size:17px;white-space:nowrap">${t('table.goal')}</span><span style="display:flex;align-items:center;gap:6px;font-size:28px;font-weight:400;color:#ecc062;line-height:1">${chip(20)}${fmt(run.goal)}</span></div>
      <div style="display:flex;align-items:baseline;justify-content:space-between"><span style="font-size:17px;white-space:nowrap">${t('table.chips')}</span><span style="display:flex;align-items:center;gap:6px;font-size:28px;font-weight:400;line-height:1">${chip(20)}<span id="fichas">${fmt(run.fichas)}</span></span></div>
      <span id="falta" style="font-size:14px;color:#b9a780;line-height:1.15"></span>
      <div style="display:flex;align-items:center;justify-content:space-between;border-top:2px dashed #3a2c18;padding-top:10px;margin-top:2px">
        <span id="wins" style="display:flex;align-items:center;gap:6px"></span>
        <span style="display:flex;align-items:center;gap:8px">${coin()}<span id="coins" style="font-size:28px;font-weight:400;color:#ecc062">${fmt(run.coins)}</span></span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;color:#b9a780"><span>${t('table.hands')}: <b id="hands" style="color:#dfeae4"></b></span><span>${t('table.discards')}: <b id="discards" style="color:#dfeae4"></b></span></div>
    </div>
  </aside>

  <div style="position:absolute;z-index:5;top:36px;left:260px;right:24px;display:flex;align-items:flex-start;gap:16px">
    <div id="jokers-panel" class="panel-q" role="group" aria-label="${t('table.jokers_aria', { n: run.jokers.length, max: slots })}" style="position:relative;flex:1;min-width:0;height:128px;display:flex;align-items:center;padding:8px 34px 8px 18px">
      <span aria-hidden="true" style="position:absolute;top:4px;right:6px;font-size:12px;line-height:1;color:#ecc062">${run.jokers.length}/${slots}</span>
      <div id="jokers-row" style="flex:1;display:flex;justify-content:space-evenly">${jokerHTML()}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;flex:none">
      <div class="panel-q" role="group" aria-label="${t('table.consumables_aria')}" style="height:128px;display:flex;align-items:center;justify-content:center;padding:8px 14px"><div style="display:flex;gap:10px">${Array.from({ length: consumableSlots(run) }, (_, i) => {
        const id = run.consumables[i];
        if (!id) return `<span class="cempty">${t('common.free')}</span>`;
        return `<span class="conslot"><button type="button" data-act="use-consumable" data-i="${i}" title="${esc(t(`tarot.${id}.name`))}">${tarotSprite(id, { s: 0.85 })}</button></span>`;
      }).join('')}</div></div>
      <div class="panel-q" role="group" aria-label="${t('table.runes_aria')}" style="display:flex;align-items:center;gap:10px;padding:6px 14px 6px 16px;min-height:50px"><span class="label">${t('table.runes')}</span>${run.runes.length ? `<span class="runestrip">${run.runes.map((id) => `<span class="runechip" title="${esc(t(`rune.${id}.desc`))}">${runeSprite(id, { s: 1.25 })}</span>`).join('')}</span>` : `<span style="font-size:14px;color:#7a5a1e">${t('table.runes_none')}</span>`}</div>
    </div>
  </div>

  <main style="position:absolute;z-index:4;top:226px;left:268px;width:744px;display:flex;flex-direction:column;gap:8px">
    <section style="display:flex;align-items:center;height:160px">
      <div style="width:150px;display:flex;flex-direction:column;gap:2px"><span class="label">${t('table.dealer')}</span><span id="dealer-total" style="font-size:40px;font-weight:400;line-height:1;white-space:nowrap">—</span><span id="dealer-sub" style="font-size:13px;color:#b9a780;line-height:1.1"></span></div>
      <div id="dealer-cards" class="tcs"></div><div style="width:60px"></div>
    </section>
    <section aria-label="${t('table.calc_aria')}" style="display:flex;flex-direction:column;align-items:center;gap:6px;height:72px">
      <div style="display:flex;align-items:center;justify-content:center;gap:14px">
        <div class="box" style="background:#211910;border:3px solid #dfeae4"><span class="label" style="font-size:12px;line-height:1.1">${t('table.calc.chips')}</span><span id="calc-f" style="font-size:32px;font-weight:400;line-height:1">—</span></div>
        <span style="font-size:32px;font-weight:400;color:#b9a780">×</span>
        <div class="box" style="background:#7b2536;border:3px solid #e8705f"><span class="label" style="font-size:12px;line-height:1.1;color:#f3c9c2">${t('table.calc.mult')}</span><span id="calc-m" style="font-size:32px;font-weight:400;line-height:1">—</span></div>
        <span style="font-size:32px;font-weight:400;color:#b9a780">=</span>
        <div class="box" id="calc-res" style="background:#211910;border:3px dashed #7a5a1e;min-width:170px"><span class="label" id="calc-res-l" style="font-size:12px;line-height:1.1">${t('table.calc.pending')}</span><span id="calc-res-v" style="font-size:32px;font-weight:400;line-height:1;color:#b9a780">???</span></div>
      </div>
      <p id="calc-note" style="font-size:15px;color:#b9a780;text-align:center;min-height:18px"></p>
    </section>
    <section style="display:flex;align-items:center;height:160px">
      <div style="width:150px;display:flex;flex-direction:column;gap:2px"><span class="label">${t('table.you')}</span><span id="player-total" style="font-size:44px;font-weight:400;line-height:1">—</span><span id="player-sub" style="font-size:13px;color:#b9a780;line-height:1.1"></span></div>
      <div id="player-cards" class="tcs"></div><div style="width:60px"></div>
    </section>
  </main>

  <aside style="position:absolute;z-index:4;top:300px;left:1050px;width:210px;height:240px">
    <button id="pile" class="pile" type="button" data-act="deck" aria-label="${t('table.pile_aria')}" style="position:absolute;left:0;top:10px;border:0;background:none;padding:0">
      <span class="spr bk lay" style="--s:2;left:10px;top:6px;filter:brightness(.84)"></span><span class="spr bk lay" style="--s:2;left:12px;top:4px;filter:brightness(.9)"></span><span class="spr bk lay" style="--s:2;left:14px;top:2px"></span>
    </button>
    <div style="position:absolute;left:128px;bottom:6px;display:flex;flex-direction:column"><span class="label">${t('table.pile')}</span><span id="pile-count" style="font-size:34px;font-weight:400;line-height:1"></span><span style="font-size:13px;color:#b9a780;line-height:1.1;margin-top:4px">${t('table.pile_hint')}</span></div>
    <div id="ansuz-peek" style="position:absolute;left:0;top:150px"></div>
  </aside>

  <footer style="position:absolute;z-index:4;left:24px;right:260px;bottom:10px;height:90px;display:flex;align-items:flex-end;justify-content:center;gap:12px">
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
      <div class="betquick"><button class="btn btn-ghost bbetq" type="button" data-act="bet-min">${t('table.bet_min')} ${run.cfg.minBet}</button><button class="btn btn-wine bbetq" type="button" data-act="bet-allin">${t('table.bet_allin')}</button></div>
      <div class="panel-q" style="display:flex;align-items:center;gap:12px;height:56px;padding:0 10px 0 16px">
        <span class="label">${t('table.bet')}</span>
        <button class="btn bbtn" type="button" data-act="bet-" aria-label="${t('table.bet_down')}">−</button>
        <span style="display:flex;align-items:center;gap:8px;font-size:30px;font-weight:400;min-width:84px;justify-content:center">${chip()}<span id="bet">${bet}</span></span>
        <button class="btn bbtn" type="button" data-act="bet+" aria-label="${t('table.bet_up')}">+</button>
      </div>
    </div>
    <button class="btn" id="b-bet" type="button" data-act="deal" style="width:160px;height:56px;margin-bottom:0">${t('table.deal')}</button>
    <span style="width:3px;height:40px;background:#4a3a1c;margin-bottom:8px"></span>
    <button class="btn" id="b-hit" type="button" data-act="hit" style="width:124px;height:56px">${t('table.hit')}</button>
    <button class="btn btn-ghost" id="b-stand" type="button" data-act="stand" style="width:140px;height:56px;font-size:20px">${t('table.stand')}</button>
    <button class="btn btn-ghost" id="b-double" type="button" data-act="double" style="width:114px;height:56px;font-size:20px">${t('table.double')}</button>
    <button class="btn btn-ghost" id="b-discard" type="button" data-act="discard" style="width:144px;height:56px;font-size:20px">${t('table.discard', { n: run.discardsLeft })}</button>
  </footer>
  <button class="btn btn-ghost cobrar" id="b-cash" type="button" data-act="cash" hidden>${t('table.cash')}</button>
  <div id="banner" class="banner" hidden></div>
  <div id="beaten" class="beaten panel" hidden>
    <span class="label">${t('table.beaten.kicker')}</span>
    <h2 style="font-size:44px;line-height:1;color:#cf9b38;text-shadow:0 4px 0 #7a5a1e,5px 7px 0 #000">${esc(t('table.beaten.title', { name: dn }))}</h2>
    <p style="font-size:18px;color:#b9a780;line-height:1.25">${t('table.beaten.text', { n: run.cfg.winsRequired })}</p>
    <div style="display:flex;gap:14px;margin-top:6px"><button class="btn" type="button" data-act="cash" style="flex:1;height:56px;font-size:22px">${t('table.cash')}</button><button class="btn btn-ghost" id="b-farm" type="button" data-act="farm" style="flex:1;height:56px;font-size:22px">${t('table.keep')}</button></div>
  </div>
  ${sideBtns()}`;

  const q = (id) => $('#' + id, el);
  const btn = { bet: q('b-bet'), hit: q('b-hit'), stand: q('b-stand'), dbl: q('b-double'), dis: q('b-discard') };

  // ---------- Dibujo ----------
  function say(kind) {
    if (!store.settings.dialogs) return;
    const lines = tl(`dealer.${dealer.id}.lines.${kind}`);
    $('#bubble-text', el).textContent = pickLine(lines, run.streams.boss);
    const b = $('#bubble', el);
    b.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
  }

  function statusPanel() {
    const falta = Math.max(0, run.goal - run.fichas);
    q('fichas').textContent = fmt(run.fichas);
    q('falta').textContent = run.beaten ? t('table.reached') : t('table.left', { n: fmt(falta) });
    q('wins').innerHTML = `${pips(Math.min(run.wins, run.cfg.winsRequired), run.cfg.winsRequired)}<span style="font-size:13px;color:#b9a780;margin-left:2px;white-space:nowrap">${t('table.wins_label', { w: run.wins, n: run.cfg.winsRequired })}</span>`;
    q('hands').textContent = `${run.handsLeft}/${run.cfg.handsPerDealer}`;
    q('discards').textContent = run.discardsLeft;
    q('pile-count').textContent = run.pile.length;
    q('coins').textContent = fmt(run.coins);
    const peek = peekNext(run);
    const peekEl = q('ansuz-peek');
    if (peekEl) peekEl.innerHTML = peek ? `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span class="label" style="font-size:12px">${t('table.next_card')}</span>${cardSprite(peek, { s: 1.2 })}</div>` : '';
  }

  function controls() {
    const h = run.hand;
    const inHand = phase === 'player' && h && h.phase === 'player';
    const canBet = phase === 'bet' || phase === 'resolved';
    btn.bet.disabled = !canBet;
    btn.bet.textContent = phase === 'resolved' ? t('table.next_hand') : t('table.deal');
    btn.hit.disabled = !inHand;
    btn.stand.disabled = !inHand;
    btn.dbl.disabled = !(inHand && actions.canDouble(run));
    btn.dis.disabled = !(inHand && actions.canDiscard(run)) && !discarding;
    btn.dis.textContent = discarding ? t('table.cancel') : t('table.discard', { n: run.discardsLeft });
    $$('.bbtn', el).forEach((b) => { b.disabled = !canBet; });
    $$('.bbetq', el).forEach((b) => { b.disabled = !canBet; });
    q('bet').textContent = bet;
    $$('#player-cards .tc', el).forEach((c) => c.classList.toggle('pick', discarding));
    q('b-cash').hidden = !(run.beaten && q('beaten').hidden && phase !== 'busy');
    if (langDirty && (phase === 'bet' || phase === 'resolved') && q('beaten').hidden) { langDirty = false; setTimeout(() => go('table'), 0); }
  }

  const cardEl = (card, { up, s }) => {
    const d = document.createElement('div');
    d.className = `tc${up ? ' up' : ''}`;
    d.style.cssText = `width:${48 * s}px;height:${64 * s}px`;
    d.dataset.id = card.id;
    d.innerHTML = `<div class="tc-in">${backSprite(s, 'tc-back')}${cardSprite(card, { s, cls: 'tc-front' })}</div>`;
    d.setAttribute('aria-label', cardName(card));
    return d;
  };
  const cardScale = (n) => (n <= 3 ? 2.5 : n === 4 ? 2.2 : 1.9);

  function rescale(container) {
    const n = container.children.length;
    const s = cardScale(n);
    [...container.children].forEach((c, i) => {
      c.style.width = `${48 * s}px`; c.style.height = `${64 * s}px`;
      $$('.spr', c).forEach((sp) => sp.style.setProperty('--s', s));
      c.style.marginLeft = i === 0 ? '0' : n > 3 ? `${-(n - 3) * 12 + 6}px` : '14px';
    });
  }

  async function addCard(container, card, { up = true, fromPile = true } = {}) {
    const c = cardEl(card, { up: false, s: cardScale(container.children.length + 1) });
    container.append(c);
    rescale(container);
    const from = fromPile ? q('pile').getBoundingClientRect() : null;
    const fly = flyIn(c, from);
    await fly;
    if (up) { c.classList.add('up'); await sleep(180); }
    return c;
  }

  function totals() {
    const h = run.hand;
    if (!h) { q('dealer-total').textContent = '—'; q('player-total').textContent = '—'; q('dealer-sub').textContent = ''; q('player-sub').textContent = ''; return; }
    const pt = handTotal(h.player);
    q('player-total').textContent = pt;
    q('player-total').style.color = pt > 21 ? '#e8705f' : '';
    q('player-sub').textContent = h.phase === 'player' ? t('table.drawing') : h.busted ? t('table.busted') : '';
    if (h.hiddenRevealed) { const dt = handTotal(h.dealer); q('dealer-total').textContent = dt; q('dealer-total').style.color = dt > 21 ? '#e8705f' : ''; q('dealer-sub').textContent = dt > 21 ? t('table.dealer_bust') : t('table.cards_n', { n: h.dealer.length }); }
    else { q('dealer-total').textContent = `???+${dealerVisibleTotal(h)}`; q('dealer-total').style.color = ''; q('dealer-sub').textContent = t('table.hidden_info'); }
  }

  /** Vista previa del cálculo con las cartas actuales (se aplica al plantarte). */
  function calc() {
    const h = run.hand;
    if (!h || h.busted) { q('calc-f').textContent = h ? '—' : '—'; q('calc-m').textContent = '—'; q('calc-note').textContent = ''; return; }
    const combo = comboEffect(h.player);
    const { F, M } = runEffects([combo, ...jokerEffects(run.jokers, run)], { hand: h.player, T: handTotal(h.player) });
    q('calc-f').textContent = fmt(h.bet + F);
    q('calc-m').textContent = fmtMult(M);
    const parts = [t('table.calc.bet', { n: h.bet })];
    if (combo.combo) parts.push(`${t(`combo.${combo.combo.id}`)} +${combo.combo.F} · ×${combo.combo.M}`);
    for (const j of run.jokers) {
      const probe = { F: 0, M: 1, hand: h.player, run };
      JOKER_BY_ID[j.id].apply(probe);
      if (probe.F || probe.M !== 1) parts.push(`${t(`joker.${j.id}.name`)} ${probe.F ? `+${probe.F}` : `×${fmtMult(probe.M)}`}`);
    }
    q('calc-note').textContent = parts.join(' · ');
  }

  const showBanner = (text, kind, sub = '', ms = 1700) => {
    const b = q('banner');
    b.className = `banner ${kind}`;
    b.innerHTML = `<span class="bt">${text}</span>${sub ? `<span class="bs">${sub}</span>` : ''}`;
    b.hidden = false;
    clearTimeout(bannerTimer);
    if (ms) bannerTimer = setTimeout(() => { b.hidden = true; }, ms);
    b.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,1.4,.4,1)' });
  };

  function refresh() { statusPanel(); totals(); calc(); controls(); }

  // ---------- Flujo de una mano ----------
  async function deal() {
    if (phase !== 'bet' && phase !== 'resolved') return;
    q('banner').hidden = true;
    phase = 'busy'; controls();
    $('#player-cards', el).innerHTML = ''; $('#dealer-cards', el).innerHTML = '';
    discarding = false;
    const h = beginHand(run, bet);
    bet = run.lastBet;
    q('pile-count').textContent = run.pile.length;
    q('calc-res-l').textContent = t('table.calc.pending'); q('calc-res-v').textContent = '???'; q('calc-res-v').style.color = '';
    q('calc-res').style.borderStyle = 'dashed';
    const pc = $('#player-cards', el), dc = $('#dealer-cards', el);
    await addCard(pc, h.player[0]);
    await addCard(dc, h.dealer[0], { up: false });
    await addCard(pc, h.player[1]);
    await addCard(dc, h.dealer[1]);
    totals(); calc(); statusPanel();
    say('idle');
    if (h.phase === 'dealer') return dealerTurn(); // 21 natural
    phase = 'player'; controls();
  }

  async function drawPlayer() {
    const h = run.hand;
    const pc = $('#player-cards', el);
    await addCard(pc, h.player.at(-1));
    totals(); calc(); statusPanel();
  }

  async function onHit() {
    phase = 'busy'; controls();
    actions.hit(run);
    await drawPlayer();
    afterPlayerAction();
  }
  async function onDouble() {
    phase = 'busy'; controls();
    actions.double(run);
    q('bet').textContent = run.hand.bet;
    pop(q('bet'));
    await drawPlayer();
    afterPlayerAction();
  }
  function afterPlayerAction() {
    const h = run.hand;
    if (h.busted) return resolveFlow();
    if (h.phase === 'dealer') return dealerTurn();
    phase = 'player'; controls();
  }
  function onStand() { phase = 'busy'; controls(); actions.stand(run); dealerTurn(); }

  async function onDiscardPick(cardEl) {
    const pc = $('#player-cards', el);
    const idx = $$('.tc', pc).indexOf(cardEl);
    if (idx < 0) return;
    discarding = false; phase = 'busy'; controls();
    await cardEl.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-60px) rotate(12deg)', opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.catch(() => {});
    actions.discard(run, idx);
    const fresh = cardElFor(run.hand.player[idx]);
    cardEl.replaceWith(fresh);
    rescale(pc);
    await flyIn(fresh, q('pile').getBoundingClientRect());
    fresh.classList.add('up');
    await sleep(200);
    totals(); calc(); statusPanel();
    afterPlayerAction();
  }
  const cardElFor = (card) => cardEl(card, { up: false, s: cardScale($$('#player-cards .tc', el).length) });

  async function dealerTurn() {
    phase = 'busy'; controls();
    const h = run.hand;
    const dc = $('#dealer-cards', el);
    await sleep(350);
    // El dealer revela su carta y pide hasta su límite
    let step = actions.dealerStep(run); // 'reveal'
    $('.tc', dc)?.classList.add('up');
    totals(); await sleep(520);
    while ((step = actions.dealerStep(run)) === 'draw') {
      await addCard(dc, h.dealer.at(-1));
      totals(); await sleep(260);
    }
    resolveFlow();
  }

  async function resolveFlow() {
    phase = 'busy'; controls();
    const h = run.hand;
    if (h.phase !== 'done') finishDealerTurn(run);
    const before = run.fichas;
    const res = settleHand(run);
    totals(); calc();
    const text = t(`table.res.${res.result}`);
    const kind = RESULT_KIND[res.result] ?? 'push';
    const net = res.net;
    q('calc-res-l').textContent = t('table.calc.result');
    q('calc-res-v').textContent = `${net >= 0 ? '+' : ''}${fmt(net)}`;
    q('calc-res-v').style.color = net > 0 ? '#ecc062' : net < 0 ? '#e8705f' : '#b9a780';
    q('calc-res').style.borderStyle = 'solid';
    const sub = res.combo ? `${t(`combo.${res.combo.id}`)} · ` : '';
    showBanner(text, kind, `${sub}${t('table.res.chips', { sign: net > 0 ? '+' : '', n: fmt(net) })}`, 0);
    if (kind === 'lose') shake(q('player-cards')); else if (kind === 'win') pop(q('fichas'));
    countTo(q('fichas'), before, run.fichas, 700);
    say(res.result === 'bust' ? 'bust' : res.result === 'blackjack' ? 'blackjack' : net > 0 ? 'win' : net < 0 ? 'lose' : 'idle');
    statusPanel();
    await sleep(1500);
    q('banner').hidden = true;

    const st = res.status;
    if (st === 'lost') { gameOver(run); await sleep(400); return finishRun(); }
    if (run.beaten && !run.beatenShown) {
      run.beatenShown = true;
      say('defeated');
      if (run.handsLeft <= 0 || run.fichas < run.cfg.minBet) return cash();
      q('beaten').hidden = false; phase = 'resolved'; controls(); autosave(run);
      return;
    }
    if (run.beaten && (run.handsLeft <= 0 || run.fichas < run.cfg.minBet)) return cash();
    bet = clampBet(run, bet);
    phase = 'resolved'; controls(); autosave(run);
  }

  function finishRun() { go('over'); }
  function cash() { endDealer(run); say('defeated'); go('result'); }

  // ---------- Eventos ----------
  bindActs(el, {
    'bet-': () => { bet = clampBet(run, bet - 10); controls(); },
    'bet+': () => { bet = clampBet(run, bet + 10); controls(); },
    'bet-min': () => { bet = clampBet(run, run.cfg.minBet); controls(); },
    'bet-allin': () => { bet = clampBet(run, run.fichas); controls(); },
    deal, hit: onHit, stand: onStand, double: onDouble,
    discard: () => {
      if (discarding) { discarding = false; controls(); return; }
      if (!actions.canDiscard(run)) return;
      discarding = true; controls();
    },
    'use-consumable': (btn) => {
      if (phase !== 'bet' && phase !== 'resolved') return;
      const ci = Number(btn.dataset.i);
      const id = run.consumables[ci];
      if (!id) return;
      const tdef = TAROT_BY_ID[id];
      const noSel = tdef && !tdef.needs?.cards && !tdef.needs?.joker;
      openTarotUse(run, id, ci, 'table');
      if (noSel) { useTarot(run, 0, {}); finishPack(run); go('table'); return; }
      go('pack');
    },
    cash, farm: () => { q('beaten').hidden = true; q('b-cash').hidden = false; phase = 'resolved'; controls(); },
  });
  el.addEventListener('click', (e) => {
    const c = e.target.closest('#player-cards .tc');
    if (c && discarding && phase === 'player') onDiscardPick(c);
  });

  const onKey = (e) => {
    if (e.target.tagName === 'INPUT' || e.repeat) return;
    const k = e.key.toLowerCase();
    const press = (b) => { if (!b.disabled && !document.querySelector('.mlayer')) b.click(); };
    if (k === 'p' || k === 'h') press(btn.hit);
    else if (k === 's') press(btn.stand);
    else if (k === 'd') press(btn.dbl);
    else if (k === 'x') press(btn.dis);
    else if (k === 'enter' || k === ' ') { if (document.activeElement === document.body) press(btn.bet); }
  };
  addEventListener('keydown', onKey);

  // ---- Reordenar arrastrando (README §3 y §5): jokers (el orden es el orden de aplicación) y cartas de tu mano ----
  const jokersRow = q('jokers-row');
  const sortJokers = makeSortable(jokersRow, {
    items: () => $$('.tj.has', jokersRow),
    enabled: () => phase !== 'busy',
    onReorder: (from, to) => { moveJoker(run, from, to); jokersRow.innerHTML = jokerHTML(); calc(); autosave(run); },
  });
  const handRow = q('player-cards');
  const sortHand = makeSortable(handRow, {
    items: () => $$('.tc', handRow),
    enabled: () => phase === 'player' && !discarding && run.hand?.phase === 'player',
    onReorder: (from, to) => { if (moveCard(run.hand, from, to)) { rescale(handRow); calc(); totals(); } },
  });

  // ---- Ver qué hace un joker: clic en él (otro clic o clic fuera lo cierra) ----
  const jokersPanel = q('jokers-panel');
  function closeJokerInfo() { jokersPanel.querySelector('.jinfo')?.remove(); }
  function showJokerInfo(node) {
    const i = Number(node.dataset.i);
    const same = jokersPanel.querySelector(`.jinfo[data-i="${i}"]`);
    closeJokerInfo();
    if (same) return;
    const j = run.jokers[i];
    if (!j) return;
    const pr = jokersPanel.getBoundingClientRect(); const nr = node.getBoundingClientRect(); const k = pr.width / jokersPanel.offsetWidth || 1;
    const pop = document.createElement('div');
    pop.className = 'panel-q jpop jinfo';
    pop.dataset.i = i;
    pop.style.cssText = `left:${(nr.left - pr.left + nr.width / 2) / k}px;top:${(nr.bottom - pr.top) / k + 8}px`;
    pop.innerHTML = `<span style="font-size:18px;font-weight:700;line-height:1.05">${esc(t(`joker.${j.id}.name`))}</span><span style="font-size:14px;color:#ecc062;line-height:1.15">${jokerDescHTML(j.id, run)}</span>${j.edition ? `<span class="ed">${t(`edition.${j.edition}`)} · ${esc(t(`edition.${j.edition}.desc`))}</span>` : ''}<span style="font-size:12px;color:#b9a780">${t('table.joker_hint')}</span>`;
    jokersPanel.append(pop);
  }
  jokersRow.addEventListener('click', (e) => { const n = e.target.closest('.tj.has'); if (n) { e.stopPropagation(); showJokerInfo(n); } });
  el.addEventListener('click', (e) => { if (!e.target.closest('.jinfo')) closeJokerInfo(); });

  refresh();
  say('idle');
  q('b-cash').hidden = true;
  // Cambio de idioma: si hay una mano en curso se espera a que termine para redibujar la mesa.
  const relabel = () => { if (phase === 'bet' || phase === 'resolved') return true; langDirty = true; return false; };
  return { relabel, el, destroy: () => { sortJokers.destroy(); sortHand.destroy(); alive = false; removeEventListener('keydown', onKey); clearTimeout(bannerTimer); }, refresh };
}
