// Juega partidas completas por la interfaz real con un bot sencillo y reporta errores. Uso: node scripts/playtest.mjs [partidas]
import { chromium } from 'playwright';

const games = Number(process.argv[2] ?? 2);
const url = process.env.URL ?? 'http://localhost:5173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForSelector('.stage');
await page.evaluate(() => { const s = window.__luvierre.store.settings; s.speed = 'turbo'; s.anim = false; s.dialogs = true; });

const screen = () => page.evaluate(() => window.__luvierre.game.screen);
const visible = async (sel) => (await page.locator(sel).count()) > 0 && (await page.locator(sel).first().isVisible());
const enabled = async (sel) => (await visible(sel)) && !(await page.locator(sel).first().isDisabled());

for (let g = 0; g < games; g++) {
  await page.evaluate(() => window.__luvierre.go('seed'));
  await page.fill('#semilla', `TEST-${g}`).catch(() => {});
  await page.click('[data-mode="mine"]');
  await page.fill('#semilla', `TEST-${g}`);
  await page.click('[data-act="start"]');
  let guard = 0;
  let hands = 0;
  while (guard++ < 4000) {
    const sc = await screen();
    if (sc === 'over') break;
    if (sc === 'dealers') { await page.click('[data-act="play"]'); continue; }
    if (sc === 'result') { await page.click('[data-act="shop"]'); continue; }
    if (sc === 'shop') {
      // compra lo que pueda (jokers) y sigue
      for (let i = 0; i < 4; i++) { const b = page.locator(`[data-act="buy"][data-i="${i}"]`); if (await b.count() && await b.isEnabled()) await b.click(); }
      await page.click('[data-act="next"]');
      continue;
    }
    if (sc === 'table') {
      if (await visible('#beaten')) { await page.click('#beaten [data-act="cash"]'); continue; }
      if (await enabled('#b-hit')) {
        const total = Number(await page.locator('#player-total').textContent());
        if (total < 16) await page.click('#b-hit'); else await page.click('#b-stand');
        continue;
      }
      if (await enabled('#b-bet')) {
        const fichas = Number((await page.locator('#fichas').textContent()).replace(/\D/g, ''));
        // sube la apuesta hasta ~20 % de las fichas
        for (let k = 0; k < Math.floor(fichas * 0.2 / 10) - 1; k++) await page.click('[data-act="bet+"]');
        await page.click('#b-bet'); hands++;
        continue;
      }
    }
    await page.waitForTimeout(40);
  }
  const info = await page.evaluate(() => { const r = window.__luvierre.game.run; return { mesa: r.mesa, dealer: r.dealerIdx + 1, vencidos: r.stats.dealersBeaten, manos: r.stats.hands, fichas: r.fichas, monedas: r.coins, jokers: r.jokers.length, mazo: r.deck.length }; });
  console.log(`partida ${g + 1}: pantalla final=${await screen()}`, JSON.stringify(info), guard >= 4000 ? 'ATASCADA' : '');
}
console.log(errors.length ? `ERRORES:\n${[...new Set(errors)].join('\n')}` : 'sin errores de consola');
await browser.close();
