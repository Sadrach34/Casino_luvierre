// Música del juego: una pista en bucle según la pantalla/contexto, volumen desde ajustes.
import { asset } from './dom.js';
import { store } from './store.js';
import { DEALERS } from '../data/dealers.js';
import { devlog } from './devlog.js';

const TRACKS = {
  menu: 'audio/menu.mp3',
  dealers: 'audio/dealers.mp3',
  boss: 'audio/boss.mp3',
  shop: 'audio/shop.mp3',
  pack: 'audio/pack.mp3',
};

let audio = null;
let current = null;
let wanted = null;
let primed = false;

function vol() {
  const v = Number(store?.settings?.music ?? 0);
  return Math.max(0, Math.min(1, v / 100));
}

function ensure() {
  if (audio || typeof Audio === 'undefined') return audio;
  audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  audio.addEventListener('error', () => devlog('warn', 'audio error', { src: audio?.src, code: audio?.error?.code }));
  audio.addEventListener('playing', () => devlog('info', 'audio playing', { track: current }));
  return audio;
}

export function syncVolume() {
  if (!audio) return;
  audio.volume = vol();
  if (audio.volume === 0) { audio.pause(); return; }
  if (wanted) tryPlay();
}

async function tryPlay() {
  const a = ensure();
  if (!a || !wanted) return;
  a.volume = vol();
  if (a.volume === 0) return;
  if (!a.paused && current === wanted) return;
  try {
    await a.play();
    primed = true;
  } catch (e) {
    devlog('warn', 'audio play blocked', { track: wanted, err: String(e?.name || e) });
  }
}

export function playMusic(name) {
  if (!TRACKS[name]) name = 'menu';
  wanted = name;
  const a = ensure();
  if (!a) return;
  const src = asset(TRACKS[name]);
  if (current !== name) {
    current = name;
    devlog('info', 'audio track', { track: name, src });
    a.src = src;
    a.load();
  }
  syncVolume();
  // Intenta reproducir (funcionará si ya hubo gesto del usuario o si el navegador lo permite).
  tryPlay();
}

export function stopMusic() {
  wanted = null;
  if (audio) audio.pause();
}

function onGesture() {
  primed = true;
  if (wanted) tryPlay();
}

// Desbloquea/reintenta en cualquier interacción del usuario.
if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'touchstart', 'keydown', 'click']) {
    window.addEventListener(ev, onGesture, { passive: true });
  }
}

/** Pista que corresponde a la pantalla actual. */
export function musicFor(screen, game) {
  if (screen === 'shop') return 'shop';
  if (screen === 'pack') return 'pack';
  if (screen === 'table' || screen === 'result') {
    const run = game?.run;
    if (!run) return 'dealers';
    const d = DEALERS[run.dealerIdx % DEALERS.length];
    return d?.boss ? 'boss' : 'dealers';
  }
  return 'menu'; // menu, seed, dealers (selección), over
}
