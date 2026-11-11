// `npm run dev`: si el puerto de desarrollo (5173 por defecto) está ocupado por OTRO servidor de Vite/Node
// (por ejemplo, uno que quedó abierto), lo cierra y arranca el nuevo en ese mismo puerto.
// Si el puerto lo usa algo que no parece Vite/Node, no lo toca y avisa.
// Uso: npm run dev [-- --port 5174]   (los argumentos extra se pasan a vite)
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const pi = args.indexOf('--port');
const port = pi >= 0 ? Number(args[pi + 1]) : 5173;

function pidsOnPort(p) {
  try {
    return execFileSync('lsof', ['-t', '-iTCP:' + p, '-sTCP:LISTEN'], { encoding: 'utf8' }).split('\n').filter(Boolean).map(Number);
  } catch { return []; } // lsof sale con error si no hay nadie escuchando
}
const cmdOf = (pid) => { try { return readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim(); } catch { return ''; } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const pid of pidsOnPort(port)) {
  if (pid === process.pid) continue;
  const cmd = cmdOf(pid);
  if (!/vite|node/i.test(cmd)) {
    console.error(`[dev] El puerto ${port} lo usa otro programa (PID ${pid}: ${cmd || 'desconocido'}). No lo cierro; usa: npm run dev -- --port <otro>`);
    process.exit(1);
  }
  console.log(`[dev] Puerto ${port} ocupado por PID ${pid} (${cmd.slice(0, 80)}). Cerrándolo…`);
  try { process.kill(pid, 'SIGTERM'); } catch { /* ya no existe */ }
  for (let i = 0; i < 20 && alive(pid); i++) await sleep(100);
  if (alive(pid)) { try { process.kill(pid, 'SIGKILL'); } catch { /* ignorar */ } await sleep(200); }
}
if (pidsOnPort(port).length) { console.error(`[dev] No se pudo liberar el puerto ${port}.`); process.exit(1); }

const bin = new URL('../node_modules/.bin/vite', import.meta.url).pathname;
const child = spawn(bin, ['--port', String(port), '--strictPort', ...args.filter((a, i) => !(a === '--port' || i === pi + 1))], { stdio: 'inherit' });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code) => process.exit(code ?? 0));
