// Router mínimo: una pantalla a la vez dentro de #app + modales encima. Escala el escenario 1280×720 a la ventana.
import { $ } from './dom.js';
import { setViewScale } from './anim.js';
import { playMusic, musicFor } from './audio.js';

export const game = { run: null, mode: null };
const screens = {};
const modals = {};
let current = null;
let openModals = [];

let screenHook = null;
/** Se llama tras mostrar cada pantalla (la usa el autoguardado). */
export const onScreen = (fn) => { screenHook = fn; };
export const registerScreen = (name, fn) => { screens[name] = fn; };
export const registerModal = (name, fn) => { modals[name] = fn; };

export function go(name, params = {}) {
  closeAllModals();
  current?.destroy?.();
  const app = $('#app');
  app.innerHTML = '';
  game.screen = name;
  current = screens[name]({ params, game });
  app.append(current.el);
  playMusic(musicFor(name, game));
  current.mounted?.();
  screenHook?.(name, game);
}

export function openModal(name, params = {}) {
  const m = modals[name]({ params, game });
  $('#app').append(m.el);
  m.name = name;
  openModals.push(m);
  m.mounted?.();
  return m;
}

export function closeModal(m = openModals.at(-1)) {
  if (!m) return;
  m.destroy?.();
  m.el.remove();
  openModals = openModals.filter((x) => x !== m);
}
export function closeAllModals() { [...openModals].forEach(closeModal); }
export const hasModal = () => openModals.length > 0;
export const getModal = (name) => openModals.find((m) => m.name === name);
export const isModalOpen = (name) => openModals.some((m) => m.name === name);
export const closeModalByName = (name) => { const m = getModal(name); if (m) closeModal(m); };
export const refreshScreen = () => current?.refresh?.();

/** Cambio de idioma: vuelve a dibujar la pantalla actual (la mesa espera a que termine la mano). */
export function retranslate() {
  const name = game.screen;
  if (!name || name === 'over') return false;
  if (current?.relabel && current.relabel() === false) return false;
  const modalsOpen = openModals.map((m) => m.name).filter(Boolean);
  go(name);
  return modalsOpen;
}

export function fit() {
  const k = Math.min(innerWidth / 1280, innerHeight / 720);
  $('#app').style.transform = `translate(-50%,-50%) scale(${k})`;
  setViewScale(k);
}
