// Animaciones con Web Animations API. Respetan la velocidad del juego y "animación de cartas".
import { store, speedFactor } from './store.js';

export const dur = (ms) => Math.max(1, ms * speedFactor());
export const sleep = (ms) => new Promise((r) => setTimeout(r, store.settings.anim ? dur(ms) : Math.min(60, dur(ms))));

/** La carta vuela desde el mazo (rect) hasta su lugar. */
export function flyIn(el, fromRect, { ms = 420, rotate = -10 } = {}) {
  if (!store.settings.anim || !fromRect) return Promise.resolve();
  const to = el.getBoundingClientRect();
  const dx = fromRect.left + fromRect.width / 2 - (to.left + to.width / 2);
  const dy = fromRect.top + fromRect.height / 2 - (to.top + to.height / 2);
  const scale = fromRect.width / to.width || 1;
  return el.animate(
    [{ transform: `translate(${dx / viewScale()}px,${dy / viewScale()}px) rotate(${rotate}deg) scale(${scale})`, opacity: 0.2 },
     { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 }],
    { duration: dur(ms), easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.catch(() => {});
}

let scaleNow = 1;
export const setViewScale = (s) => { scaleNow = s; };
export const viewScale = () => scaleNow;

export function shake(el, ms = 420) {
  if (!store.settings.anim) return;
  el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }], { duration: dur(ms) });
}

export function pop(el, ms = 360) {
  if (!store.settings.anim) return;
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: dur(ms), easing: 'ease-out' });
}

/** Cuenta animada de un número dentro de un elemento. */
export function countTo(el, from, to, ms = 600, fmt = (n) => Math.round(n).toLocaleString('es-MX')) {
  if (!store.settings.anim || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const d = dur(ms);
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / d);
    el.textContent = fmt(from + (to - from) * (1 - (1 - k) ** 3));
    if (k < 1 && el.isConnected) requestAnimationFrame(tick); else el.textContent = fmt(to);
  };
  requestAnimationFrame(tick);
}
