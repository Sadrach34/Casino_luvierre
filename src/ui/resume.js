// Reanudar una partida guardada: restaura game.run y va a la pantalla donde se quedó.
import { game, go } from './router.js';
import { loadSave } from './savegame.js';

export function resumeSave(slot) {
  const l = loadSave(slot);
  if (!l) return false;
  game.run = l.run;
  game.mode = l.run.mode;
  go(l.screen);
  return true;
}
