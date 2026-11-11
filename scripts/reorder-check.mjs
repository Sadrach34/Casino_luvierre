// Verifica el arrastre para reordenar cartas de la mano y jokers (mesa y tienda). Uso: node scripts/reorder-check.mjs (con npm run dev)
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto((process.env.URL ?? 'http://localhost:5173/') + '?fresh'); await p.waitForSelector('.stage');
await p.evaluate(async () => {
  localStorage.removeItem('luvierre.save.auto');
  const s = window.__luvierre.store.settings; s.speed = 'turbo'; s.anim = false;
  const { game, go } = window.__luvierre;
  const core = await import('/src/core/run.js');
  game.run = core.createRun({ seed: 'MOVER' }); game.mode = 'infinite';
  game.run.jokers = [{ id: 'par_f', edition: null }, { id: 'par_m', edition: null }, { id: 'tercia_f', edition: null }];
  core.startDealer(game.run); go('table');
});
await p.click('#b-bet'); await p.waitForSelector('#b-hit:not([disabled])', { timeout: 8000 });
const order = () => p.evaluate(() => window.__luvierre.game.run.hand.player.map((c) => c.id + c.rank));
const domOrder = () => p.evaluate(() => [...document.querySelectorAll('#player-cards .tc')].map((e) => e.dataset.id));
console.log('mano antes', await order());
const cards = p.locator('#player-cards .tc');
const a = await cards.nth(0).boundingBox(); const c = await cards.nth(1).boundingBox();
await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down();
await p.mouse.move(a.x + a.width / 2 + 40, a.y + a.height / 2, { steps: 6 });
await p.mouse.move(c.x + c.width / 2 + 10, c.y + c.height / 2, { steps: 12 }); await p.mouse.up();
await p.waitForTimeout(200);
console.log('mano después (estado)', await order(), '| DOM', await domOrder());
// jokers en la mesa
const jb = p.locator('#jokers-row .tj.has');
const j0 = await jb.nth(0).boundingBox(); const j2 = await jb.nth(2).boundingBox();
console.log('jokers antes', await p.evaluate(() => window.__luvierre.game.run.jokers.map((j) => j.id)));
await p.mouse.move(j0.x + j0.width / 2, j0.y + j0.height / 2); await p.mouse.down();
await p.mouse.move(j2.x + j2.width / 2 + 10, j2.y + j2.height / 2, { steps: 14 }); await p.mouse.up();
await p.waitForTimeout(200);
console.log('jokers después (mesa)', await p.evaluate(() => window.__luvierre.game.run.jokers.map((j) => j.id)));
await p.screenshot({ path: 'shots/60-reordenar-mesa.png' });
// tienda
await p.evaluate(async () => { const { game, go } = window.__luvierre; const sh = await import('/src/core/shop.js'); game.run.hand = null; sh.openShop(game.run); go('shop'); });
await p.waitForTimeout(300);
const sj = p.locator('#jslots .js[data-slot]');
const s0 = await sj.nth(0).boundingBox(); const s2 = await sj.nth(2).boundingBox();
await p.mouse.move(s0.x + s0.width / 2, s0.y + s0.height / 2); await p.mouse.down();
await p.mouse.move(s2.x + s2.width / 2 + 8, s2.y + s2.height / 2, { steps: 14 }); await p.mouse.up();
await p.waitForTimeout(250);
console.log('jokers después (tienda)', await p.evaluate(() => window.__luvierre.game.run.jokers.map((j) => j.id)));
console.log(errs.length ? errs : 'sin errores');
await b.close();
