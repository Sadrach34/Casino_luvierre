import { store } from '../store.js';
import { deckClasses, ICON } from '../dom.js';
import { go, game, openModal } from '../router.js';
import { createRun } from '../../core/run.js';
import { dailySeed, randomSeed } from '../../core/rng.js';
import { t } from '../../i18n/index.js';

export function stage(extra = '') {
  const el = document.createElement('div');
  el.className = `stage ${deckClasses(store.settings)} ${extra}`.trim();
  el.innerHTML = '<div class="bunting"></div>';
  return el;
}

const sidePanelHTML = (extraStyle = '') => `
  <div class="sidepanel" style="position:absolute;z-index:30;right:24px;bottom:22px;display:flex;flex-direction:column-reverse;align-items:flex-end;gap:10px;${extraStyle}">
    <button class="btn btn-ghost sidedots" type="button" data-act="side-toggle" aria-label="Menú" title="Menú"><span class="dotsv"></span></button>
    <button class="btn btn-ghost sidebtn" type="button" data-act="config" aria-label="${t('common.config_aria')}">${ICON.gear}<span class="k">${t('cfg.title')}</span></button>
    <button class="btn btn-ghost sidebtn" type="button" data-act="stats" aria-label="${t('common.stats_aria')}">${ICON.stats}<span class="k">${t('common.stats')}</span></button>
    <button class="btn btn-ghost sidebtn" type="button" data-act="upcoming" aria-label="${t('common.upcoming_aria')}">${ICON.dealers}<span class="k">${t('common.dealers')}</span></button>
  </div>`;
export const gearBtn = (style = '') => sidePanelHTML(style);
export const sideBtns = () => sidePanelHTML();

/** Delegación común: data-act="config|upcoming|stats|deck|go:<pantalla>". */
export function bindActs(el, handlers = {}) {
  el.addEventListener('click', (e) => {
    const panel = e.target.closest('.sidepanel');
    if (!panel) el.querySelector('.sidepanel.open')?.classList.remove('open');
    const btn = e.target.closest('[data-act],[data-go]');
    if (!btn || btn.disabled) return;
    if (btn.dataset.go) { el.querySelector('.sidepanel.open')?.classList.remove('open'); return go(btn.dataset.go); }
    const act = btn.dataset.act;
    if (act === 'side-toggle') { (btn.closest('.sidepanel') || el.querySelector('.sidepanel'))?.classList.toggle('open'); return; }
    if (handlers[act]) { el.querySelector('.sidepanel.open')?.classList.remove('open'); return handlers[act](btn, e); }
    if (['config', 'upcoming', 'stats', 'deck', 'records', 'credits'].includes(act)) { el.querySelector('.sidepanel.open')?.classList.remove('open'); openModal(act); }
  });
}

export const todayKey = () => dailySeed();
export const dailyDone = () => store.daily.date === todayKey() && store.daily.done;

/** Crea la partida y va a la selección de dealer. */
export function startRun({ seed, mode }) {
  game.run = createRun({ seed, mode });
  game.mode = mode;
  go('dealers');
}
export { randomSeed };

/** Código de semilla corto y legible tipo 7KQ2-M9XD. */
export function newSeedCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join('');
  return `${part()}-${part()}`;
}
