// Captura el paquete de runas y la fila de runas para revisar sprites/baldosas. Uso: node scripts/runes-check.mjs (con npm run dev)
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(process.env.URL ?? 'http://localhost:5173/'); await p.waitForSelector('.stage');
await p.evaluate(async () => {
  const { game, go } = window.__luvierre;
  const core = await import('/src/core/run.js'); const shop = await import('/src/core/shop.js'); const packs = await import('/src/core/packs.js');
  game.run = core.createRun({ seed: 'RUNAS' }); game.mode = 'infinite';
  core.startDealer(game.run); game.run.coins = 99; shop.openShop(game.run);
  game.run.runes = ['kenaz', 'othala', 'eihwaz', 'ehwaz'];
  packs.openPack(game.run, 'megaRunes'); go('pack');
});
await p.waitForTimeout(600); await p.screenshot({ path: 'shots/30-pack-runas.png' });
console.log(errs.length ? errs : 'sin errores');
await b.close();
