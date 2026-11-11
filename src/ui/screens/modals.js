// Modales: configuración, estadísticas, próximos dealers, agradecimientos, mazo y récords.
import { asset } from '../dom.js';
import { store, save } from '../store.js';
import { game, go, closeModal, openModal, refreshScreen, retranslate } from '../router.js';
import { syncVolume } from '../audio.js';
import { $, $$, esc, fmt, chip, coin, cardSprite, deckCardSprite, cardEffectSummary, cardName, SUIT_ORDER, SUIT_SYMBOL, deckClasses, jokerSprite } from '../dom.js';
import { DEALERS } from '../../data/dealers.js';
import { dealerGoal, dealerCoins } from '../../core/goals.js';
import { sellCard, suitValue } from '../../core/shop.js';
import { RANKS } from '../../core/deck.js';
import { saveManual } from '../savegame.js';
import { CREDITS, CREATOR } from '../../data/credits.js';
import { knownUsedIds } from '../../core/run.js';
import { t, tl, getLang, setLang, LANGS, LANG_NAMES } from '../../i18n/index.js';

function layer(inner, { wide } = {}) {
  const el = document.createElement('div');
  el.className = `stage mlayer ${deckClasses(store.settings)}`;
  el.innerHTML = `<div class="dim" data-act="close" aria-hidden="true"></div>${inner}`;
  el.addEventListener('click', (e) => {
    const target = e.target.closest('[data-act="close"]');
    if (target) closeModal(handle);
  });
  const handle = { el };
  void wide;
  return handle;
}

const closeBtn = (label = t('common.close')) => `<button class="btn btn-ghost" type="button" data-act="close" style="min-height:48px;font-size:18px;padding:0 16px">${label} <span class="kbd">${t('common.esc')}</span></button>`;
const title = (small, big, id) => `<div style="display:flex;flex-direction:column;gap:2px"><span class="label">${small}</span><h1 id="${id}" style="font-size:40px;line-height:1;font-weight:700;color:#cf9b38;text-shadow:0 4px 0 #7a5a1e,5px 7px 0 #000">${big}</h1></div>`;

function applyDeckClasses() {
  $$('#app > .stage').forEach((s) => {
    s.classList.toggle('oscuro', store.settings.deck === 'oscuro');
    for (let i = 0; i < 5; i++) s.classList.toggle(`r${i}`, store.settings.back === i);
  });
}

// ---------------- Configuración ----------------
export function configModal() {
  const s = store.settings;
  const inGame = !!game.run && game.screen !== 'menu' && game.screen !== 'seed';
  const fan = (cls) => {
    const spr = cls === 'oscuro' ? `--spr:url('${asset('cartas-oscuro.png')}')` : `--spr:url('${asset('cartas-claro.png')}')`;
    return `<span class="fan ${cls}" aria-hidden="true"><span class="spr cd" style="--s:1.25;--col:0;--row:2;left:0;transform:rotate(-8deg);${spr}"></span><span class="spr cd" style="--s:1.25;--col:12;--row:1;left:42px;transform:rotate(1deg);${spr}"></span><span class="spr jk" style="--s:1.25;--col:0;left:84px;transform:rotate(9deg)"></span></span>`;
  };
  const REV = [0, 1, 2, 3, 4].map((i) => t(`cfg.back.${i}`));
  const m = layer(`
  <section class="panel modal cfg" role="dialog" aria-modal="true" aria-labelledby="cfg-title" style="top:14px">
    <header style="display:flex;align-items:center;justify-content:space-between">${title(t('cfg.small'), t('cfg.title'), 'cfg-title')}${closeBtn()}</header>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:36px">
      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="sec"><span class="label">${t('cfg.cards')}</span>
          <div style="display:flex;gap:14px">
            <button type="button" class="opt" data-deck="claro">${fan('')}<span style="display:flex;flex-direction:column"><span style="font-size:20px;font-weight:700">${t('cfg.classic')}</span><span style="font-size:14px;color:#b9a780">${t('cfg.classic.sub')}</span></span></button>
            <button type="button" class="opt" data-deck="oscuro">${fan('oscuro')}<span style="display:flex;flex-direction:column"><span style="font-size:20px;font-weight:700">${t('cfg.night')}</span><span style="font-size:14px;color:#b9a780">${t('cfg.night.sub')}</span></span></button>
          </div></div>
        <div class="sec"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="label">${t('cfg.back')}</span><span id="revname" style="font-size:15px;color:#ecc062"></span></div>
          <div style="display:flex;gap:10px">${REV.map((n, i) => `<button type="button" class="back" data-back="${i}" aria-label="${t('cfg.back.aria', { name: n })}"><span class="spr bk" style="--s:1.25;--col:${i}"></span></button>`).join('')}</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="sec"><span class="label">${t('cfg.audio')}</span>
          <div class="row"><label for="cfg-music" style="font-size:19px">${t('cfg.music')}</label><span style="display:flex;align-items:center;gap:12px"><input id="cfg-music" class="rng" type="range" min="0" max="100" value="${s.music}"><span id="v-music" style="width:36px;text-align:right;color:#ecc062;font-size:18px">${s.music}</span></span></div>
          <div class="row"><label for="cfg-sfx" style="font-size:19px">${t('cfg.sfx')}</label><span style="display:flex;align-items:center;gap:12px"><input id="cfg-sfx" class="rng" type="range" min="0" max="100" value="${s.sfx}"><span id="v-sfx" style="width:36px;text-align:right;color:#ecc062;font-size:18px">${s.sfx}</span></span></div>
          <span style="font-size:13px;color:#7a5a1e">${t('cfg.audio_note')}</span></div>
        <div class="sec"><span class="label">${t('cfg.game')}</span>
          <div class="row"><span style="font-size:19px">${t('cfg.language')}</span><div class="seg" role="group" aria-label="${t('cfg.language.aria')}">${Object.keys(LANGS).map((k) => `<button type="button" class="sg" data-lang="${k}">${LANG_NAMES[k]}</button>`).join('')}</div></div>
          <div class="row"><span style="font-size:19px">${t('cfg.speed')}</span><div class="seg" role="group" aria-label="${t('cfg.speed.aria')}">${['normal', 'rapida', 'turbo'].map((k) => `<button type="button" class="sg" data-speed="${k}">${t(`cfg.speed.${k}`)}</button>`).join('')}</div></div>
          <div class="row"><span id="t-dlg" style="font-size:19px">${t('cfg.dialogs')}</span><button type="button" role="switch" class="sw" data-tog="dialogs" aria-labelledby="t-dlg"></button></div>
          <div class="row"><span id="t-anim" style="font-size:19px">${t('cfg.anim')}</span><button type="button" role="switch" class="sw" data-tog="anim" aria-labelledby="t-anim"></button></div>
          <div class="row"><span id="t-full" style="font-size:19px">${t('cfg.full')}</span><button type="button" role="switch" class="sw" data-tog="full" aria-labelledby="t-full"></button></div>
        </div>
      </div>
    </div>
    <footer style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;padding-top:18px;border-top:2px dashed #3a2c18">
      ${inGame ? `<span style="display:flex;gap:14px"><button class="btn btn-wine" type="button" data-act="quit" style="height:52px;font-size:19px">${t('cfg.quit')}</button><button class="btn btn-ghost" type="button" data-act="save" style="height:52px;font-size:19px">${t('cfg.save')}</button></span>` : '<span></span>'}
      <button class="btn btn-ghost" type="button" data-act="credits" style="height:52px;font-size:19px">${t('cfg.credits')}</button>
      <button class="btn" type="button" data-act="close" style="height:56px;width:260px;font-size:24px">${t('cfg.resume')}</button>
    </footer>
  </section>`);

  const sync = () => {
    $$('[data-deck]', m.el).forEach((b) => b.classList.toggle('on', b.dataset.deck === s.deck));
    $$('[data-back]', m.el).forEach((b) => b.classList.toggle('on', Number(b.dataset.back) === s.back));
    $$('[data-speed]', m.el).forEach((b) => b.classList.toggle('on', b.dataset.speed === s.speed));
    $$('[data-lang]', m.el).forEach((b) => b.classList.toggle('on', b.dataset.lang === s.lang));
    $$('[data-tog]', m.el).forEach((b) => { const on = b.dataset.tog === 'full' ? !!document.fullscreenElement : s[b.dataset.tog]; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    $('#revname', m.el).textContent = REV[s.back];
    m.el.className = `stage mlayer ${deckClasses(s)}`;
    document.documentElement.classList.toggle('noanim', !s.anim);
    applyDeckClasses();
  };
  let quitArmed = false;
  m.el.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.deck) s.deck = btn.dataset.deck;
    else if (btn.dataset.back) s.back = Number(btn.dataset.back);
    else if (btn.dataset.speed) s.speed = btn.dataset.speed;
    else if (btn.dataset.lang) {
      s.lang = btn.dataset.lang; setLang(s.lang); save();
      closeModal(m);
      retranslate();
      openModal('config');
      return;
    }
    else if (btn.dataset.tog) {
      if (btn.dataset.tog === 'full') { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => {}); setTimeout(sync, 150); return; }
      s[btn.dataset.tog] = !s[btn.dataset.tog];
    } else if (btn.dataset.act === 'credits') { openModal('credits'); return; }
    else if (btn.dataset.act === 'save') { btn.textContent = saveManual(game.run) ? t('cfg.saved') : t('cfg.save.fail'); return; }
    else if (btn.dataset.act === 'quit') {
      if (!quitArmed) { quitArmed = true; btn.textContent = t('cfg.quit.confirm'); return; }
      closeModal(m); go('menu'); return;
    } else return;
    save(); sync();
  });
  for (const k of ['music', 'sfx']) $(`#cfg-${k}`, m.el).addEventListener('input', (e) => { s[k] = Number(e.target.value); $(`#v-${k}`, m.el).textContent = s[k]; save(); if (k === 'music') syncVolume(); });
  m.mounted = sync;
  m.destroy = () => { save(); refreshScreen(); };
  return m;
}

// ---------------- Estadísticas ----------------
export function statsModal() {
  const run = game.run;
  const st = run?.stats;
  const tile = (label, big, sub) => `<div class="tile"><span class="label">${label}</span><span class="big">${big}</span><span class="sub">${sub}</span></div>`;
  const topCard = st && Object.entries(st.cardPlays).sort((a, b) => b[1] - a[1])[0];
  let topHTML = `<div class="tile" style="flex-direction:row;align-items:center"><span class="sub">${t('stats.none')}</span></div>`;
  if (topCard) {
    const [rank, suit] = [topCard[0].replace(/(hearts|diamonds|spades|clubs)$/, ''), topCard[0].match(/(hearts|diamonds|spades|clubs)$/)[1]];
    topHTML = `<div class="tile" style="flex-direction:row;align-items:center;gap:16px">${cardSprite({ rank, suit }, { s: 1 })}<div style="display:flex;flex-direction:column;gap:4px"><span class="label">${t('stats.top')}</span><span style="font-size:22px;font-weight:700">${cardName({ rank, suit })}</span><span class="sub">${t('stats.top.sub', { n: topCard[1] })}</span></div></div>`;
  }
  const m = layer(`
  <section class="panel modal" role="dialog" aria-modal="true" aria-labelledby="st-title" style="top:44px">
    <header style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;flex-direction:column;gap:2px"><span class="label">${t('stats.seed_line', { seed: esc(run?.seed ?? '—'), mesa: run?.mesa ?? 1, n: (run?.dealerIdx ?? 0) + 1 })}</span><h1 id="st-title" style="font-size:40px;line-height:1;font-weight:700;color:#cf9b38;text-shadow:0 4px 0 #7a5a1e,5px 7px 0 #000">${t('stats.title')}</h1></div>${closeBtn()}</header>
    ${st ? `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">
      ${tile(t('stats.best'), `${chip(22)}${fmt(st.bestNet)}`, t('stats.best.sub'))}
      ${tile(t('stats.hands'), st.hands, t('stats.hands.sub', { n: st.pushes }))}
      ${tile(t('stats.wl'), `<span style="color:#ecc062">${st.wins}</span><span style="color:#b9a780">·</span><span style="color:#e8705f">${st.losses}</span>`, t('stats.wl.sub'))}
      ${tile(t('stats.bj'), st.blackjacks, t('stats.bj.sub'))}
      ${tile(t('stats.busts'), `<span style="color:#e8705f">${st.busts}</span>`, t('stats.busts.sub'))}
      ${tile(t('stats.streak'), st.bestStreak, t('stats.streak.sub'))}
      ${tile(t('stats.coins'), `<span style="color:#ecc062">${coin(22)}${st.coinsEarned}</span>`, t('stats.coins.sub', { n: st.coinsSpent }))}
      ${tile(t('stats.rerolls'), st.rerolls, t('stats.rerolls.sub'))}
      ${tile(t('stats.deck'), run.deck.length, t('stats.deck.sub', { d: st.discards, x: st.doubles }))}
      ${tile(t('stats.dealers'), st.dealersBeaten, t('stats.dealers.sub', { mesa: run.mesa }))}
      ${tile(t('stats.jokers'), run.jokers.length, t('stats.jokers.sub', { n: st.jokersSold }))}
      ${tile(t('stats.chips'), fmt(run.fichas), t('stats.chips.sub', { n: fmt(run.goal || dealerGoal(run.mesa, run.dealerIdx)) }))}
    </div>${topHTML}` : `<p style="font-size:20px;color:#b9a780">${t('stats.nogame')}</p>`}
  </section>`);
  return m;
}

// ---------------- Próximos dealers ----------------
export function upcomingModal() {
  const run = game.run;
  const mesa = run?.mesa ?? 1;
  const idx = run?.dealerIdx ?? 0;
  const row = (d, i, mesaN, state) => `<div class="dl"><div class="pic"><img src="${asset(d.img.card)}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:55% 0"></div>
    <div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span style="font-size:26px;font-weight:700;${d.boss ? 'color:#e8705f' : ''}">${esc(t(`dealer.${d.id}.name`))}</span><span class="label">${d.boss ? t('dealers.boss') : t('dealers.label', { n: i + 1, tier: t(`dealer.${d.id}.tier`) })}</span><span style="display:flex;align-items:center;gap:8px;font-size:22px">${chip(20)}${t('up.goal', { n: fmt(dealerGoal(mesaN, i)) })}</span><span style="display:flex;align-items:center;gap:8px;font-size:18px;color:#ecc062">${coin(18)}${t('up.reward', { n: dealerCoins(i, run?.cfg ?? undefined) })}</span>${d.hasEffect ? `<span class="warn">${t('up.effect', { text: esc(t(`dealer.${d.id}.effect`)) })}</span>` : ''}</div>
    ${state ? `<span class="tag" style="background:${state === 'now' ? '#cf9b38' : '#211910'};color:${state === 'now' ? '#0a0806' : '#ecc062'}">${t(`up.${state}`)}</span>` : ''}</div>`;
  const next = Array.from({ length: 3 }, (_, i) => `<div class="dl"><div class="lock">?</div><div style="display:flex;flex-direction:column;gap:4px"><span style="font-size:26px;font-weight:700;color:#7a5a1e">???</span><span class="label">${i === 2 ? t('up.hidden_boss') : t('dealers.label', { n: i + 1, tier: '???' })}</span><span style="font-size:15px;color:#b9a780">${t('up.reveal', { name: esc(t(`dealer.${DEALERS[2].id}.name`)) })}</span></div></div>`).join('');
  const m = layer(`
  <section class="panel modal" role="dialog" aria-modal="true" aria-labelledby="up-title" style="top:34px;height:652px">
    <header style="display:flex;align-items:center;justify-content:space-between">${title(t('up.small'), t('up.title'), 'up-title')}${closeBtn()}</header>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px"><span class="label" style="grid-column:1/-1">${t('up.mesa', { n: mesa })}</span>${DEALERS.map((d, i) => row(d, i, mesa, i === idx ? 'now' : i === idx + 1 ? 'next' : i < idx ? 'done' : '')).join('')}</div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px"><span class="label" style="grid-column:1/-1">${t('up.mesa', { n: mesa + 1 })}</span>${next}</div>
  </section>`);
  return m;
}

// ---------------- Agradecimientos ----------------
export function creditsModal() {
  const card = (c, { me = false } = {}) => {
    const link = `<a class="btn btn-ghost cvisit" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer" title="${esc(c.url)}">${t(me ? 'cr.visit.me' : 'cr.visit')} ↗</a>`;
    return `
    <article class="ccard${me ? ' me' : ''}">
      <span class="av">${esc([...c.name.replace(/[^\p{L}\p{N}]/gu, '')][0]?.toUpperCase() ?? '★')}</span>
      <div class="cbody">
        <span class="cname">${esc(c.name)}</span>
        <span class="crole">${esc(t(`cr.role.${c.id}`))}</span>
        <span class="cfollow">${esc(t(me ? 'cr.me.follow' : 'cr.follow'))}</span>
        ${me ? '' : link}
      </div>
      ${me ? link : ''}
    </article>`;
  };
  const m = layer(`
  <section class="panel modal" role="dialog" aria-modal="true" aria-labelledby="cr-title" style="left:140px;width:1000px;top:16px;gap:12px;padding-top:16px;padding-bottom:16px">
    <header style="display:flex;align-items:center;justify-content:space-between">${title(t('cr.small'), t('cr.title'), 'cr-title')}${closeBtn(t('common.back'))}</header>
    <p style="font-size:19px;color:#b9a780">${t('cr.thanks')}</p>
    <div class="cgrid">${CREDITS.map((c) => card(c)).join('')}</div>
    ${card(CREATOR, { me: true })}
    <p style="font-size:17px;color:#ecc062;text-align:center">${t('cr.you')}</p>
  </section>`);
  return m;
}

// ---------------- Récords ----------------
export function recordsModal() {
  const r = store.records;
  const tile = (l, b, s) => `<div class="tile"><span class="label">${l}</span><span class="big">${b}</span><span class="sub">${s}</span></div>`;
  return layer(`
  <section class="panel modal" role="dialog" aria-modal="true" aria-labelledby="rc-title" style="left:290px;width:700px;top:110px">
    <header style="display:flex;align-items:center;justify-content:space-between">${title(t('rec.small'), t('rec.title'), 'rc-title')}${closeBtn()}</header>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
      ${tile(t('rec.mesa'), r.bestMesa || '—', t('rec.mesa.sub'))}
      ${tile(t('rec.dealers'), r.bestDealers, t('rec.dealers.sub'))}
      ${tile(t('rec.hand'), `${chip(22)}${fmt(r.bestHand)}`, t('rec.hand.sub'))}
      ${tile(t('rec.games'), r.games, t('rec.games.sub', { n: fmt(r.bestFichas) }))}
    </div>
  </section>`);
}

// ---------------- Mazo completo (y vender cartas en la tienda) ----------------
export function deckModal({ params }) {
  const run = game.run;
  const sell = !!params.sell && run.phase === 'shop';
  const inFight = run.phase === 'table';
  let selId = null;
  const usedIds = knownUsedIds(run); // sin la carta oculta del dealer

  const m = layer('');
  function render() {
    const bySuit = Object.fromEntries(SUIT_ORDER.map((s) => [s, []]));
    for (const c of run.deck) bySuit[c.suit].push(c);
    for (const s of SUIT_ORDER) bySuit[s].sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank));
    const sel = run.deck.find((c) => c.id === selId);
    const sold = run.shop?.soldCardThisVisit;
    m.el.innerHTML = `<div class="dim" data-act="close" aria-hidden="true"></div>
    <section class="panel modal" role="dialog" aria-modal="true" aria-labelledby="dk-title" style="left:120px;width:1040px;top:34px">
      <header style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;flex-direction:column;gap:2px"><span class="label">${inFight ? t('deck.fight') : sell ? t('deck.sell') : t('deck.out')}</span><h1 id="dk-title" style="font-size:40px;line-height:1;font-weight:700;color:#cf9b38;text-shadow:0 4px 0 #7a5a1e,5px 7px 0 #000">${t('deck.title')} <span style="font-size:24px;color:#b9a780">${t('deck.cards', { n: run.deck.length })}</span></h1></div>${closeBtn()}</header>
      ${inFight ? `<div class="lg"><span class="spr cd" style="--s:.5;opacity:.4"></span> ${t('deck.used_legend')}</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:6px">
        ${SUIT_ORDER.map((s) => `<div style="display:flex;align-items:center;gap:14px;min-height:76px"><span style="width:92px;flex:none;font-size:20px;color:${s === 'hearts' || s === 'diamonds' ? '#e8705f' : '#dfeae4'}">${SUIT_SYMBOL[s]} <span style="font-size:15px;color:#b9a780">${bySuit[s].length}${sell ? ` · $${suitValue(run, s)}` : ''}</span></span><div style="display:flex;flex-wrap:wrap;gap:4px">${bySuit[s].map((c) => { const used = usedIds.has(c.id) && inFight; const fx = cardEffectSummary(c); const lbl = `${cardName(c)}${fx ? ` — ${fx}` : ''}`; return `<button type="button" class="dkc ${used ? 'used' : ''} ${selId === c.id ? 'selc' : ''}" data-card="${c.id}" aria-label="${esc(lbl)}" title="${esc(lbl)}">${deckCardSprite(c, { s: used ? 0.72 : 1 })}</button>`; }).join('')}</div></div>`).join('')}
      </div>
      ${sell ? `<footer style="display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:2px dashed #3a2c18"><span style="font-size:17px;color:${sold ? '#e8705f' : '#b9a780'}">${run.shop.message ? esc(t(run.shop.message)) : sold ? t('deck.sold_once') : sel ? t('deck.sell_hint', { name: `${cardName(sel)}${cardEffectSummary(sel) ? ` (${cardEffectSummary(sel)})` : ''}`, n: suitValue(run, sel.suit) }) : t('deck.sell_default')}</span><button class="btn btn-wine" type="button" data-act="sell" ${sel && !sold ? '' : 'disabled'} style="height:48px">${t('deck.sell_btn')} ${sel ? `${coin(16)}+${suitValue(run, sel.suit)}` : ''}</button></footer>` : ''}
    </section>`;
  }
  m.el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-card]');
    if (c && sell) { selId = Number(c.dataset.card); run.shop.message = null; render(); return; }
    if (e.target.closest('[data-act="sell"]') && selId != null) {
      const r = sellCard(run, selId);
      if (!r.ok) run.shop.message = r.message; else selId = null;
      render(); params.onChange?.();
    }
  });
  m.mounted = render;
  return m;
}
