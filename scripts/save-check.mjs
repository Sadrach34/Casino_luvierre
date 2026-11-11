// Prueba guardar/cargar por la interfaz: juega una mano, guarda, recarga la página (como un cambio de código) y verifica que sigue.
import { chromium } from 'playwright';
const url = process.env.URL ?? 'http://localhost:5173/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(url + '?fresh'); await p.waitForSelector('.stage');
await p.evaluate(() => { const s = window.__luvierre.store.settings; s.speed = 'turbo'; s.anim = false; localStorage.removeItem('luvierre.save.auto'); localStorage.removeItem('luvierre.save.manual'); });
await p.evaluate(() => window.__luvierre.go('seed')); await p.click('[data-mode="mine"]'); await p.fill('#semilla', 'GUARDA-1'); await p.click('[data-act="start"]');
await p.click('[data-act="play"]'); await p.click('#b-bet'); await p.waitForSelector('#b-hit:not([disabled])', { timeout: 8000 });
await p.click('#b-stand'); await p.waitForSelector('#b-bet:not([disabled])', { timeout: 9000 });
const before = await p.evaluate(() => { const r = window.__luvierre.game.run; return { fichas: r.fichas, manos: r.handsLeft, seed: r.seed, screen: window.__luvierre.game.screen }; });
console.log('antes de recargar', JSON.stringify(before));
await p.keyboard.press('Escape'); await p.click('[data-act="save"]'); console.log('botón guardar →', (await p.locator('[data-act="save"]').textContent()).trim()); await p.keyboard.press('Escape');
await p.goto(url); await p.waitForSelector('.stage'); await p.waitForTimeout(500); // sin ?fresh: en dev retoma sola
const after = await p.evaluate(() => { const r = window.__luvierre.game.run; return r ? { fichas: r.fichas, manos: r.handsLeft, seed: r.seed, screen: window.__luvierre.game.screen } : null; });
console.log('tras recargar (dev, retoma sola)', JSON.stringify(after));
await p.goto(url + '?fresh'); await p.waitForSelector('.stage');
console.log('menú con botones:', (await p.locator('.savebtn').allInnerTexts()).map((x) => x.replace(/\n/g, ' · ')));
await p.screenshot({ path: 'shots/40-menu-guardado.png' });
await p.click('[data-act="load-manual"]'); await p.waitForTimeout(400);
console.log('cargar guardada →', await p.evaluate(() => ({ screen: window.__luvierre.game.screen, fichas: window.__luvierre.game.run.fichas })));
console.log(errs.length ? errs : 'sin errores');
await b.close();
