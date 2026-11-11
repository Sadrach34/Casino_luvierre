import { asset } from '../dom.js';
import { stage, gearBtn, bindActs, startRun, dailyDone, todayKey } from './common.js';
import { go } from '../router.js';
import { store, save } from '../store.js';
import { $ } from '../dom.js';
import { infoOf } from '../savegame.js';
import { resumeSave } from '../resume.js';
import { t, tl } from '../../i18n/index.js';

export default function menu() {
  const el = stage();
  const d = todayKey().split('-').reverse().join('·');
  const done = dailyDone();
  const slotBtn = (slot, key) => { const i = infoOf(slot); return i ? `<button class="btn btn-ghost savebtn" type="button" data-act="load-${slot}"><span style="font-size:20px">${t(key)}</span><span class="msub2">${t('menu.save.info', { mesa: i.mesa, n: i.dealer, fichas: i.fichas })}</span></button>` : ''; };
  const saveRow = `<div style="display:flex;gap:24px;width:460px">${slotBtn('auto', 'menu.continue')}${slotBtn('manual', 'menu.load')}</div>`;
  el.innerHTML += `
  <div style="position:relative;z-index:4;width:660px;height:100%;padding:84px 0 48px 88px;display:flex;flex-direction:column;justify-content:space-between">
    <div style="display:flex;flex-direction:column;gap:14px">
      <span class="label">${t('menu.tagline')}</span>
      <h1 style="font-weight:700;line-height:1;display:flex;flex-direction:column;gap:6px">
        <span style="display:block;font-size:40px;color:#dfeae4;letter-spacing:.28em;text-shadow:0 4px 0 #7b2536,5px 7px 0 #000">${t('menu.title.small')}</span>
        <span class="title-big">${t('menu.title.big')}</span>
      </h1>
    </div>
    <nav aria-label="${t('menu.modes')}" style="display:flex;flex-direction:column;gap:24px">
      <button class="btn menu-main" type="button" data-act="daily" ${done ? 'disabled' : ''}>
        <span style="font-size:28px;line-height:1.1">${t('menu.daily')}</span>
        <span class="msub">${done ? t('menu.daily.done', { n: store.daily.dealers }) : t('menu.daily.sub', { date: d })}</span>
      </button>
      <button class="btn menu-main" type="button" data-act="infinite">
        <span style="font-size:28px;line-height:1.1">${t('menu.infinite')}</span>
        <span class="msub">${t('menu.infinite.sub')}</span>
      </button>
      ${saveRow}
      <div style="display:flex;gap:24px;width:460px">
        <button class="btn btn-ghost" type="button" data-go="seed" style="flex:1;height:64px;justify-content:flex-start;padding:0 20px;gap:12px"><span style="font-size:24px">${t('menu.seed')}</span></button>
        <button class="btn btn-ghost" type="button" data-act="records" style="flex:1;height:64px;justify-content:flex-start;padding:0 20px"><span style="font-size:24px">${t('menu.records')}</span></button>
      </div>
    </nav>
    <div style="height:48px"></div>
  </div>

  <div style="position:absolute;left:660px;top:0;right:0;bottom:0;z-index:2">
    <div style="position:absolute;left:-10px;top:60px;width:660px;height:660px;background:radial-gradient(circle,#9a6f26 0,#5a3f14 38%,rgba(20,16,10,0) 68%)"></div>
    <div class="spr cd fan1" style="--s:4;--col:0;--row:2"></div>
    <div class="spr cd fan2" style="--s:4;--col:12;--row:1"></div>
    <div class="spr jk fan3" style="--s:4;--col:0"></div>
    <img class="luv" src="${asset('luvierre.png')}" alt="${t('menu.luv_alt')}">
    <div class="panel-q talk bubble" id="bubble" ${store.settings.dialogs ? '' : 'hidden'}>
      <span class="tail"></span><span class="label" style="color:#ecc062">${t('menu.speaker')}</span>
      <p id="bubble-text" style="font-size:17px;line-height:1.2"></p>
    </div>
  </div>
  ${gearBtn()}`;

  let i = 0;
  const text = $('#bubble-text', el);
  const set = () => { const lines = tl('luvierre.menu'); text.textContent = lines[i % lines.length]; i++; };
  set();
  $('#bubble', el).addEventListener('animationiteration', set);

  bindActs(el, {
    daily: () => {
      store.daily = { date: todayKey(), done: false, dealers: 0 };
      save();
      startRun({ seed: todayKey(), mode: 'daily' });
    },
    infinite: () => go('seed'),
    'load-auto': () => resumeSave('auto'),
    'load-manual': () => resumeSave('manual'),
  });
  return { el };
}
