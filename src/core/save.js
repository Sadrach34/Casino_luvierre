// Guardar / cargar una partida (lógica pura): convierte run ⇄ objeto JSON. El almacenamiento está en src/ui/savegame.js.
// Lo que no se guarda: `cfg` (al cargar se usa la CONFIG actual, así los cambios de balance en desarrollo aplican) y las
// funciones. Los generadores aleatorios se guardan por su estado interno, así la partida continúa idéntica.
import { CONFIG } from './config.js';
import { mulberry32 } from './rng.js';
import { ensureIdAbove } from './deck.js';

export const SAVE_VERSION = 1;

/** Copia profunda de datos JSON (sin funciones). */
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

/** Pantalla a la que se vuelve según la fase de la partida. */
export const SCREEN_OF_PHASE = { dealers: 'dealers', table: 'table', result: 'result', shop: 'shop', pack: 'pack' };

export function serializeRun(run) {
  const { cfg, streams, ...rest } = run;
  const data = clone(rest);
  // La mano en curso no se guarda: al volver se empieza de nuevo la mano (las fichas se pagan al resolver, no al apostar).
  if (data.hand && data.hand.phase !== 'done') data.hand = null;
  if (data.phase === 'table') data.hand = null;
  return {
    v: SAVE_VERSION,
    savedAt: Date.now(),
    screen: SCREEN_OF_PHASE[run.phase] ?? 'dealers',
    streams: Object.fromEntries(Object.entries(streams).map(([k, g]) => [k, g.state()])),
    run: data,
  };
}

export function deserializeRun(save) {
  if (!save || save.v !== SAVE_VERSION || !save.run) throw new Error('save: formato no válido');
  const run = clone(save.run);
  run.cfg = CONFIG;
  run.streams = {};
  for (const [k, st] of Object.entries(save.streams ?? {})) { const g = mulberry32(0); g.setState(st); run.streams[k] = g; }
  const ids = [...(run.deck ?? []), ...(run.pile ?? []), ...(run.discardPile ?? [])].map((c) => c.id);
  for (const c of [...(run.hand?.player ?? []), ...(run.hand?.dealer ?? [])]) ids.push(c.id);
  ensureIdAbove(Math.max(0, ...ids));
  return { run, screen: save.screen ?? SCREEN_OF_PHASE[run.phase] ?? 'dealers' };
}

/** Resumen para mostrar en el menú. */
export const describeSave = (save) => ({ mesa: save.run.mesa, dealer: save.run.dealerIdx + 1, fichas: save.run.fichas, coins: save.run.coins, savedAt: save.savedAt, seed: save.run.seed });
