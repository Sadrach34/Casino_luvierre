// Capturas de las pantallas con Playwright (para compararlas con el diseño). Uso: npm run shots
// Necesita el servidor de desarrollo en http://localhost:5173 (npm run dev) y: npx playwright install chromium
import { chromium } from 'playwright';
import fs from 'node:fs';

const url = process.env.URL ?? 'http://localhost:5173/';
fs.mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForSelector('.stage');
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `shots/${name}.png` }); console.log('shot', name); };
const click = (sel) => page.click(sel);

await shot('01-menu');
await page.evaluate(() => window.__luvierre.go('seed')); await shot('02-semilla');
await click('[data-act="start"]'); await shot('03-dealers');
await click('[data-act="play"]'); await shot('04-mesa-vacia');
await click('[data-act="deal"]'); await page.waitForTimeout(2500); await shot('05-mesa-mano');
await page.keyboard.press('Escape'); await shot('06-config'); await page.keyboard.press('Escape');
await click('[data-act="stats"]'); await shot('07-stats'); await page.keyboard.press('Escape');
await click('[data-act="upcoming"]'); await shot('08-proximos'); await page.keyboard.press('Escape');

// Fuerza el resultado y la tienda para capturarlos
await page.evaluate(async () => {
  const { game, go } = window.__luvierre;
  const run = game.run;
  run.hand = null; run.beaten = true; run.wins = 2; run.fichas = run.goal + 90; run.handsLeft = 3;
  const core = await import('/src/core/run.js');
  core.endDealer(run); go('result');
});
await page.waitForTimeout(1200); await shot('09-resultado');
await click('[data-act="shop"]'); await shot('10-tienda');
await click('[data-act="deck-sell"]'); await shot('11-mazo-vender');
await page.keyboard.press('Escape');
console.log(errors.length ? `ERRORES:\n${errors.join('\n')}` : 'sin errores de consola');
await browser.close();
