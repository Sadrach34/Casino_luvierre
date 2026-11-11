// Logger de desarrollo: en `npm run dev` envía líneas a /__devlog y el servidor
// las escribe en dev-debug.log (en la raíz del repo) para poder depurarlas.
// En build/producción no hace nada. Lee el archivo con: cat dev-debug.log
const enabled = import.meta.env?.DEV;
let seq = 0;

function send(line) {
  if (!enabled) return;
  try { fetch('/__devlog', { method: 'POST', body: line, keepalive: true }).catch(() => {}); } catch {}
}

export function devlog(level, msg, data) {
  if (!enabled) return;
  const ts = new Date().toISOString();
  let extra = '';
  if (data !== undefined) {
    try { extra = ' ' + JSON.stringify(data); } catch { extra = ' ' + String(data); }
  }
  const line = `[${ts}] [${level}] ${String(msg)}${extra}`;
  // También a consola para depurar en el navegador.
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn('[devlog]', msg, data ?? '');
  send(line);
}

export const dlog = (...a) => devlog('info', a.map(String).join(' '));
export const dwarn = (msg, data) => devlog('warn', msg, data);
export const derror = (msg, data) => devlog('error', msg, data);

// Captura errores globales y promesas rechazadas en dev.
if (enabled && typeof window !== 'undefined') {
  window.__log = devlog;
  window.addEventListener('error', (e) => devlog('error', e.message, { file: e.filename, line: e.lineno, col: e.colno }));
  window.addEventListener('unhandledrejection', (e) => devlog('error', 'unhandledrejection', { reason: String(e.reason) }));
}
