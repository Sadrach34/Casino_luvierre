// Menú de desarrollo: SOLO activo en desarrollo (Vite DEV + VITE_DEV_MENU=1 + MODE=development).
// Si no se cumple, las acciones no hacen nada aunque se invoquen.
import { game, go, closeModal, refreshScreen } from './router.js';
import { endDealer } from '../core/run.js';
import { openShop } from '../core/shop.js';
import { chip, coin, fmt } from './dom.js';

export const DEV_ENABLED = import.meta.env?.DEV === true
  && String(import.meta.env?.VITE_DEV_MENU ?? '') === '1'
  && import.meta.env?.MODE === 'development';

const guard = () => DEV_ENABLED;

export function devSetFichas(n = 999999) { if (!guard() || !game.run) return false; game.run.fichas = n; return true; }
export function devSetCoins(n = 999) { if (!guard() || !game.run) return false; game.run.coins = n; return true; }
export function devRefillDiscards() { if (!guard() || !game.run) return false; game.run.discardsLeft = game.run.cfg?.discardsPerDealer ?? 3; return true; }
export function devAddHands(n = 7) { if (!guard() || !game.run) return false; game.run.handsLeft = (game.run.handsLeft || 0) + n; return true; }

export function devWinDealer() {
  if (!guard() || !game.run) return false;
  const run = game.run;
  run.fichas = Math.max(run.fichas, (run.goal || 0) + 1);
  run.wins = Math.max(run.wins, run.cfg?.winsRequired ?? 2);
  run.beaten = true;
  run.hand = null;
  try { run.phase = 'table'; endDealer(run); } catch {}
  return true;
}

export function devGoShop() {
  if (!guard() || !game.run) return false;
  openShop(game.run);
  return true;
}

export function devModal() {
  const el = document.createElement('div');
  el.className = 'stage mlayer';
  const handle = { el, name: 'dev' };
  if (!DEV_ENABLED) {
    el.innerHTML = '<div class="dim" data-act="close"></div>';
    el.addEventListener('click', () => closeModal(handle));
    return handle;
  }

  function render(msg = '') {
    const run = game.run;
    const row = (label, act, sub = '') => `<button class="btn btn-ghost" type="button" data-dev="${act}" style="width:100%;height:46px;justify-content:space-between;font-size:17px"><span>${label}</span><span style="font-size:13px;color:#b9a780">${sub}</span></button>`;
    el.innerHTML = `<div class="dim" data-act="close" aria-hidden="true"></div>
    <div class="modal panel cfg" style="position:absolute;z-index:22;left:340px;top:60px;width:600px;gap:8px;padding:16px 20px;max-height:600px;overflow:auto">
      <div style="display:flex;align-items:center;justify-content:space-between"><div><span class="label" style="color:#e8705f">DESARROLLO · DEV</span><h1 style="font-size:30px;color:#cf9b38">Menú de desarrollo</h1></div><button class="btn btn-ghost" type="button" data-act="close" style="min-height:38px;font-size:16px">Cerrar (F9)</button></div>
      <p style="font-size:12px;color:#b9a780;line-height:1.25">Solo con <b>MODE=development</b> y <b>VITE_DEV_MENU=1</b>. Puedes aplicar varios efectos sin cerrar.</p>
      ${msg ? `<p style="font-size:14px;color:#ecc062">${msg}</p>` : ''}
      ${run ? `<div style="display:flex;gap:12px;align-items:center;color:#b9a780;font-size:14px;flex-wrap:wrap">${chip(16)} ${fmt(run.fichas)} · ${coin(16)} ${fmt(run.coins)} · meta ${fmt(run.goal || 0)} · manos ${run.handsLeft ?? 0} · descartes ${run.discardsLeft ?? 0}</div>
      ${row('999,999 fichas', 'fichas', 'run.fichas')}
      ${row('999 monedas', 'coins', 'tienda')}
      ${row('Ganar dealer actual', 'win', 'cobra → resultado')}
      ${row('Rellenar descartes', 'discards', 'al máximo del dealer')}
      ${row('+7 manos', 'hands', 'handsLeft')}
      ${row('Abrir tienda', 'shop', 'forzar tienda')}
      ` : `<p style="color:#b9a780">Sin partida activa.</p>`}
      <button class="btn" type="button" data-dev="refresh" style="height:44px;margin-top:2px">Refrescar pantalla</button>
    </div>`;
  }

  render();
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="close"]') || e.target.classList.contains('dim')) { closeModal(handle); return; }
    const b = e.target.closest('[data-dev]');
    if (!b || !guard()) return;
    const a = b.dataset.dev;
    let msg = '';
    if (a === 'fichas') { devSetFichas(999999); msg = 'Fichas = 999,999'; }
    else if (a === 'coins') { devSetCoins(999); msg = 'Monedas = 999'; }
    else if (a === 'win') { devWinDealer(); closeModal(handle); go(game.run?.phase === 'result' ? 'result' : 'dealers'); return; }
    else if (a === 'discards') { devRefillDiscards(); msg = 'Descartes rellenados'; }
    else if (a === 'hands') { devAddHands(7); msg = '+7 manos'; }
    else if (a === 'shop') { devGoShop(); closeModal(handle); go('shop'); return; }
    else if (a === 'refresh') { refreshScreen(); render('Pantalla refrescada'); return; }
    refreshScreen();
    render(msg);
  });
  return handle;
}
