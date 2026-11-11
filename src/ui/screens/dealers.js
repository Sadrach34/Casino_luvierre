import { asset } from '../dom.js';
import { stage, sideBtns, bindActs } from './common.js';
import { DEALERS } from '../../data/dealers.js';
import { dealerGoal, dealerCoins } from '../../core/goals.js';
import { game, go } from '../router.js';
import { startDealer, skipDealer, canSkip } from '../../core/run.js';
import { fmt, coin, chip, esc } from '../dom.js';
import { store } from '../store.js';
import { t } from '../../i18n/index.js';
import { openModal } from '../router.js';

export default function dealers() {
  const run = game.run;
  const el = stage();
  const cfg = run.cfg;

  const card = (d, i) => {
    const state = i < run.dealerIdx ? (run.skipped.includes(d.id) ? 'skipped' : 'beaten') : i === run.dealerIdx ? 'current' : 'locked';
    const goal = dealerGoal(run.mesa, i, cfg);
    const reward = dealerCoins(i, cfg);
    const cur = state === 'current';
    const dim = state === 'beaten' || state === 'skipped';
    const dname = (x) => t(`dealer.${x.id}.name`);
    const prevName = dname(DEALERS[Math.max(0, i - 1)]);
    const bossTxt = d.hasEffect
      ? `<div class="boss-fx"><span class="label" style="color:#e8705f">${t('dealers.effect')}</span><span style="font-size:17px;line-height:1.2">${esc(t(`dealer.${d.id}.effect`))}</span></div>` : '';
    const buttons = cur
      ? `<button class="btn" type="button" data-act="play" style="margin-top:auto;width:100%;height:56px">${t('dealers.play')}</button>
         ${canSkip(run) ? `<button class="btn btn-ghost" type="button" data-act="skip" style="width:100%;height:56px;flex-direction:column;gap:0;padding:0 12px"><span style="font-size:19px;line-height:1.1">${t('dealers.skip')}</span><span style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:500;letter-spacing:.02em;text-transform:none;color:#ecc062"><span class="ticket" aria-hidden="true"></span>${t('dealers.skip.sub', { n: cfg.skipReward })}</span></button>` : `<span style="font-size:15px;color:#b9a780;text-align:center;line-height:1">${t('dealers.boss_noskip')}</span>`}`
      : state === 'locked'
        ? `<button class="btn" type="button" disabled style="margin-top:auto;width:100%;height:56px">${esc(t('dealers.after', { name: prevName }))}</button>${d.boss ? `<span style="font-size:15px;color:#b9a780;text-align:center;line-height:1">${t('dealers.boss_noskip')}</span>` : ''}`
        : `<div class="done-tag" style="margin-top:auto">${state === 'beaten' ? t('dealers.beaten') : t('dealers.skipped')}</div>`;
    return `
    <article class="${cur ? 'panel' : 'panel-q'} dcard" style="height:540px;${dim ? 'opacity:.65' : ''}">
      ${cur ? `<span class="ribbon" style="position:absolute;top:-17px;left:20px;z-index:2">${t('dealers.next')}</span>` : ''}
      <div class="dpic" style="${cur ? '' : 'background:radial-gradient(ellipse at 50% 80%,#5a4118 0,#2c200d 50%,#15100a 85%)'}">
        <img src="${asset(d.img.card)}" alt="${esc(d.boss ? t('dealers.alt_boss', { name: dname(d) }) : t('dealers.alt', { name: dname(d), n: i + 1 }))}" style="${cur ? '' : 'filter:saturate(.7) brightness(.85)'}">
      </div>
      <div style="flex:1;display:flex;flex-direction:column;padding:14px 22px 20px;gap:10px">
        <div style="display:flex;align-items:baseline;justify-content:space-between"><h2 style="font-size:34px;line-height:1;font-weight:700;${d.boss ? 'color:#e8705f' : ''}">${esc(dname(d))}</h2><span class="label">${d.boss ? t('dealers.boss') : t('dealers.label', { n: i + 1, tier: t(`dealer.${d.id}.tier`) })}</span></div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
          <div style="display:flex;flex-direction:column;gap:4px"><span class="label">${t('dealers.goal')}</span><span style="display:flex;align-items:center;gap:10px;font-size:40px;line-height:1;font-weight:400">${chip()}${fmt(goal)}</span></div>
          <div style="display:flex;flex-direction:column;gap:4px"><span class="label">${t('dealers.reward')}</span><span style="display:flex;align-items:center;gap:10px;font-size:40px;line-height:1;font-weight:400;color:#ecc062">${coin()}${reward}</span></div>
        </div>
        <div style="font-size:16px;color:#b9a780;line-height:1.2">${t('dealers.rule', { wins: cfg.winsRequired, hands: cfg.handsPerDealer })}</div>
        ${bossTxt}${buttons}
      </div>
    </article>`;
  };

  el.innerHTML += `
  <header style="position:absolute;z-index:4;top:42px;left:80px;right:96px;display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;flex-direction:column;gap:2px">
      <span class="label">${t('dealers.pick')}</span>
      <h1 style="font-size:56px;line-height:1;font-weight:700;color:#cf9b38;text-shadow:0 4px 0 #7a5a1e,5px 7px 0 #000">${t('dealers.mesa', { n: run.mesa })}</h1>
    </div>
    <div style="display:flex;align-items:center;gap:22px">
      <button class="panel-q seedchip" type="button" data-act="seedinfo" aria-label="${t('dealers.seed')}: ${esc(run.seed)}" title="${t('dealers.seed')}"><span class="label" style="font-size:12px;line-height:1.1">${t('dealers.seed')}</span><span style="font-size:20px;font-weight:700;letter-spacing:.1em;line-height:1.1;color:#ecc062">${esc(run.seed)}</span></button>
      <button class="btn btn-ghost" type="button" data-act="deck" style="min-height:48px;font-size:18px;padding:0 20px">${t('dealers.deck')}</button>
      <div class="panel" style="display:flex;align-items:center;gap:10px;padding:8px 18px;height:48px"><span class="coin" aria-hidden="true"></span><span id="coins" style="font-size:28px;font-weight:400;color:#ecc062" aria-label="${t('common.coins_aria', { n: run.coins })}">${fmt(run.coins)}</span></div>
    </div>
  </header>
  <div style="position:absolute;z-index:4;top:150px;left:80px;right:110px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:36px">${DEALERS.map(card).join('')}</div>
  ${sideBtns()}`;

  bindActs(el, {
    play: () => { startDealer(run); go('table'); },
    skip: () => { skipDealer(run); go('dealers'); },
    seedinfo: (btn) => { navigator.clipboard?.writeText(run.seed).catch(() => {}); btn.title = t('seed.copied'); },
  });
  return { el };
}
