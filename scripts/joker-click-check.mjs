// Verifica que se puede hacer clic en un joker: en la mesa abre su descripción y en la tienda el menú de vender. Uso: node scripts/joker-click-check.mjs
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto((process.env.URL ?? 'http://localhost:5173/') + '?fresh'); await p.waitForSelector('.stage');
await p.evaluate(async () => {
  localStorage.removeItem('luvierre.save.auto'); const s = window.__luvierre.store.settings; s.speed = 'turbo'; s.anim = false;
  const { game, go } = window.__luvierre; const core = await import('/src/core/run.js');
  game.run = core.createRun({ seed: 'CLIC' }); game.mode = 'infinite'; game.run.coins = 20;
  game.run.jokers = [{ id: 'par_f', edition: 'poly' }, { id: 'par_m', edition: null }];
  core.startDealer(game.run); go('table');
});
await p.click('#jokers-row .tj.has >> nth=0');
console.log('mesa: ventana de info →', await p.locator('.jinfo').count(), (await p.locator('.jinfo').first().innerText()).replace(/\n/g, ' | '));
await p.screenshot({ path: 'shots/61-joker-info.png' });
await p.click('#jokers-row .tj.has >> nth=0'); console.log('segundo clic la cierra →', await p.locator('.jinfo').count());
await p.evaluate(async () => { const { game, go } = window.__luvierre; const sh = await import('/src/core/shop.js'); sh.openShop(game.run); go('shop'); });
await p.waitForTimeout(250);
await p.click('#jslots .jb >> nth=0');
console.log('tienda: menú de vender →', await p.locator('.jpop button').count() > 0 ? 'abre' : 'NO abre');
const coins = await p.evaluate(() => window.__luvierre.game.run.coins);
await p.click('.jpop [data-act="sell-joker"]');
console.log('vender →', await p.evaluate(() => ({ jokers: window.__luvierre.game.run.jokers.length, monedas: window.__luvierre.game.run.coins })), 'antes', coins);
console.log(errs.length ? errs : 'sin errores');
await b.close();
