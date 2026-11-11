import '../style/base.css';
import '../style/design.css';
import '../style/game.css';
import { devlog } from './devlog.js';
import { $ } from './dom.js';
import { fit, go, openModal, closeModal, hasModal, isModalOpen, closeModalByName, game, onScreen } from './router.js';
import { autosave, clearAuto, hasSave } from './savegame.js';
import { resumeSave } from './resume.js';
import { store, save } from './store.js';
import { setLang, detectLang } from '../i18n/index.js';
import './screens/index.js';
import { DEV_ENABLED } from './devmenu.js';

if (!store.settings.lang) { store.settings.lang = detectLang(); save(); }
setLang(store.settings.lang);
fit();
addEventListener('resize', fit);
export const applyAnimSetting = () => document.documentElement.classList.toggle('noanim', !store.settings.anim);
applyAnimSetting();

// Esc: cierra el modal abierto o abre la configuración.
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (hasModal()) closeModal(); else openModal('config');
});

if (DEV_ENABLED) {
  addEventListener('keydown', (e) => {
    if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA' || e.target?.isContentEditable) return;
    if (e.key === 'F9' || e.key === '`') {
      e.preventDefault();
      if (isModalOpen('dev')) closeModalByName('dev'); else openModal('dev');
    }
  });
  devlog('info', 'dev menu enabled', { mode: import.meta.env?.MODE });
}

// Mostrar un error visible si algo falla al arrancar (en vez de pantalla negra).
addEventListener('error', (e) => { const d = document.createElement('pre'); d.style.cssText = 'position:fixed;left:8px;bottom:8px;color:#e8705f;font:12px monospace;z-index:99;white-space:pre-wrap'; d.textContent = String(e.message); document.body.append(d); });

// Si falta el sprite de la moneda o de las fichas (public/assets se genera con `npm run dev`/`npm run assets`),
// se usan formas dibujadas con CSS para que nunca desaparezcan, y se avisa en el log.
for (const [file, cls] of [['coin-anim.png', 'noart-coin'], ['chip-red.png', 'noart-chip']]) {
  const img = new Image();
  img.onerror = () => { document.documentElement.classList.add(cls); devlog('warn', `falta el asset ${file}: ejecuta npm run assets (revisa assets-raw/)`); };
  img.src = `${import.meta.env.BASE_URL}assets/${file}`;
}

devlog('info', 'app start', { lang: store.settings.lang, dev: !!import.meta.env?.DEV });
// Autoguardado: en cada pantalla reanudable; al terminar la partida se borra.
onScreen((name) => { if (name === 'over') clearAuto(); else if (game.run && ['dealers', 'table', 'result', 'shop', 'pack'].includes(name)) autosave(game.run); });

// En desarrollo, al recargar por un cambio de código se retoma la partida donde estaba (usa ?fresh para empezar en el menú).
if (!(import.meta.env?.DEV && !location.search.includes('fresh') && hasSave('auto') && resumeSave('auto'))) go('menu');
window.__luvierre = { game, store, go, log: devlog }; // para depurar y para las capturas
