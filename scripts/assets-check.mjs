// Recorre las pantallas y avisa de cualquier imagen/sprite que no cargue (404) o de elementos de moneda/ficha sin imagen.
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const bad = new Set();
p.on('response', (r) => { if (r.status() >= 400) bad.add(r.status() + ' ' + r.url()); });
await p.goto((process.env.URL ?? 'http://localhost:5173/') + '?fresh'); await p.waitForSelector('.stage');
await p.evaluate(async () => {
  localStorage.removeItem('luvierre.save.auto');
  const { game, go } = window.__luvierre;
  const core = await import('/src/core/run.js'); const shop = await import('/src/core/shop.js'); const packs = await import('/src/core/packs.js');
  game.run = core.createRun({ seed: 'ASSETS' }); game.mode = 'infinite'; game.run.coins = 99;
  window.__shots = { core, shop, packs };
});
for (const name of ['menu', 'seed', 'dealers']) { await p.evaluate((n) => window.__luvierre.go(n), name); await p.waitForTimeout(250); }
await p.evaluate(() => { const { core } = window.__shots; core.startDealer(window.__luvierre.game.run); window.__luvierre.go('table'); }); await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/51-mesa.png' });
await p.evaluate(() => { const { shop } = window.__shots; shop.openShop(window.__luvierre.game.run); window.__luvierre.go('shop'); }); await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/52-tienda.png' });
const report = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.coin,.chip')) { const s = getComputedStyle(el); out.push(`${el.className} ${s.width}x${s.height} bg=${s.backgroundImage.slice(0, 50)}`); }
  return [...new Set(out)];
});
console.log(report); console.log(bad.size ? [...bad] : 'sin 404');
await b.close();
