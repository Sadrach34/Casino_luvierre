// Almacenamiento de partidas en localStorage: 'auto' (se guarda sola en puntos estables) y 'manual'.
import { serializeRun, deserializeRun, describeSave, SCREEN_OF_PHASE } from '../core/save.js';

const KEY = (slot) => `luvierre.save.${slot}`;
let lastStable = null; // última instantánea estable (para el guardado manual a mitad de una mano)

const read = (slot) => { try { return JSON.parse(localStorage.getItem(KEY(slot)) ?? 'null'); } catch { return null; } };
const write = (slot, data) => { try { localStorage.setItem(KEY(slot), JSON.stringify(data)); return true; } catch { return false; } };

/** Guarda la partida en 'auto' (solo en pantallas donde se puede reanudar). */
export function autosave(run) {
  if (!run || !SCREEN_OF_PHASE[run.phase]) return false;
  lastStable = serializeRun(run);
  return write('auto', lastStable);
}
export function saveManual(run) {
  const snap = run && SCREEN_OF_PHASE[run.phase] && !(run.hand && run.hand.phase !== 'done') ? serializeRun(run) : lastStable;
  return snap ? write('manual', snap) : false;
}
export const clearAuto = () => { lastStable = null; try { localStorage.removeItem(KEY('auto')); } catch { /* ignorar */ } };
export const hasSave = (slot) => !!read(slot);
export function infoOf(slot) { const s = read(slot); try { return s ? describeSave(s) : null; } catch { return null; } }
/** Devuelve { run, screen } o null si no hay partida o está dañada. */
export function loadSave(slot) {
  const s = read(slot);
  if (!s) return null;
  try { return deserializeRun(s); } catch { return null; }
}
