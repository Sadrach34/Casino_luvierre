import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const LOG_FILE = path.resolve('dev-debug.log');

function devLogPlugin() {
  return {
    name: 'dev-log',
    apply: 'serve',
    configureServer(server) {
      // Empieza limpio en cada sesión de dev.
      try { fs.writeFileSync(LOG_FILE, `--- dev log start ${new Date().toISOString()} ---\n`); } catch {}
      server.middlewares.use('/__devlog', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          const line = body.endsWith('\n') ? body : body + '\n';
          try { fs.appendFileSync(LOG_FILE, line); } catch {}
          // También en la terminal de `npm run dev` para que los veas ahí.
          if (/\[error\]/.test(line)) console.error('[devlog]', line.trim());
          else if (/\[warn\]/.test(line)) console.warn('[devlog]', line.trim());
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

// base './' para poder publicar en GitHub Pages (subcarpeta del repo).
export default defineConfig({ base: './', plugins: [devLogPlugin()] });
