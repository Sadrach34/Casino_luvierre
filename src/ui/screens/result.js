import { asset } from '../dom.js';
import { stage, sideBtns, bindActs } from './common.js';
import { game, go } from '../router.js';
import { currentDealer } from '../../core/run.js';
import { openShop } from '../../core/shop.js';
import { JOKER_BY_ID } from '../../data/jokers.js';
import { jokerSprite, esc, coin, fmt, pips } from '../dom.js';
import { countTo, sleep } from '../anim.js';
import { pickLine } from '../../data/dealers.js';
import { store } from '../store.js';
import { t, tl } from '../../i18n/index.js';

export default function result() {
  const run = game.run;
  const dealer = currentDealer(run);
  const rw = run.reward;
  const el = stage();
  const slots = run.cfg.maxJokers + run.jokers.filter((j) => j.edition === 'negative').length;
  const img = dealer.id === 'pip' ? dealer.img.defeated : dealer.img.table;
  const dn = t(`dealer.${dealer.id}.name`);
  const line = store.settings.dialogs ? pickLine(tl(`dealer.${dealer.id}.lines.defeated`), run.streams.boss) : '';

  el.innerHTML += `
  <div class="panel-q jbar" role="group" aria-label="${t('result.jokers_aria')}"><span class="jcount">${run.jokers.length}/${slots}</span>
    <div class="jslots">${Array.from({ length: slots }, (_, i) => {
      const j = run.jokers[i];
      return j ? `<div class="js" title="${esc(t(`joker.${j.id}.name`))}">${jokerSprite(JOKER_BY_ID[j.id].art, { s: 1.25, edition: j.edition })}</div>` : `<div class="js"><span class="jempty">${t('common.free')}</span></div>`;
    }).join('')}</div></div>
  <div style="position:absolute;z-index:2;left:60px;top:150px;width:480px;height:570px">
    <div style="position:absolute;left:0;top:10px;width:480px;height:560px;background:radial-gradient(ellipse at 55% 60%,#9a6f26 0,#5a3f14 40%,rgba(20,16,10,0) 70%)"></div>
    <img class="fade-in" src="${asset(img)}" alt="${esc(t('result.alt', { name: dn }))}" style="position:absolute;left:40px;bottom:0;height:540px;width:auto;display:block">
    ${line ? `<div class="panel-q" style="position:absolute;right:-10px;top:30px;width:230px;padding:10px 12px 12px;display:flex;flex-direction:column;gap:4px;border-color:#ecc062"><span class="label" style="color:#ecc062">${esc(dn)}</span><p style="font-size:16px;line-height:1.2">${esc(line)}</p></div>` : ''}
  </div>
  <section class="panel" style="position:absolute;z-index:4;left:680px;top:36px;width:560px;padding:30px 36px 34px;display:flex;flex-direction:column;gap:6px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px"><span class="label">${t('result.mesa_dealer', { mesa: run.mesa, n: run.dealerIdx + 1 })}</span>${pips(run.dealerIdx + 1, 3).replace(/class="pip"/g, 'class="pp"')}</div>
    <h1 style="font-size:52px;line-height:1;font-weight:700;color:#cf9b38;text-shadow:0 4px 0 #7a5a1e,5px 7px 0 #000">${esc(t('result.beaten', { name: dn }))}</h1>
    <div style="display:flex;align-items:center;gap:10px;margin:8px 0 14px"><span class="label">${t('result.wins')}</span><span style="font-size:20px;color:#b9a780">${t('result.summary', { wins: run.wins, fichas: fmt(run.fichas), goal: fmt(run.goal) })}</span></div>
    ${rw.lines.map((l) => `<div class="row"><div style="display:flex;flex-direction:column"><span style="font-size:24px;font-weight:600">${esc(t(`reward.${l.id}`))}</span>${l.params ? `<span style="font-size:15px;color:#b9a780">${esc(t(`reward.${l.id}.note`, l.params))}</span>` : ''}</div><span class="amt">${coin()}+${l.coins}</span></div>`).join('')}
    <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:14px">
      <div style="display:flex;flex-direction:column"><span class="label">${t('result.total')}</span><span style="display:flex;align-items:center;gap:12px;font-size:56px;line-height:1;font-weight:400;color:#ecc062">${coin(34)}<span id="total">+0</span></span></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end"><span class="label">${t('result.coins')}</span><span style="font-size:30px;font-weight:400"><span>${rw.before}</span> → <span id="after">${rw.before}</span></span></div>
    </div>
    <button class="btn" type="button" data-act="shop" style="margin-top:22px;width:100%;height:64px;font-size:26px">${t('result.shop')}</button>
  </section>
  ${sideBtns()}`;

  bindActs(el, { shop: () => { openShop(run); go('shop'); } });
  return {
    el,
    mounted: async () => {
      await sleep(250);
      countTo(el.querySelector('#total'), 0, rw.total, 900, (n) => `+${Math.round(n)}`);
      countTo(el.querySelector('#after'), rw.before, rw.after, 900);
    },
  };
}
