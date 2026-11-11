// Simulador por dealer (modelo 2/3): cada dealer = hasta 3 rondas de `manos` manos.
// Se necesitan 2 rondas ganadas; 2 rondas perdidas = game over. Las fichas se arrastran siempre.
// Una ronda se gana al ganar `gain` fichas sobre las que tenías al empezar la ronda.
// Una "mano" = un reparto (pedir carta no cuenta). Sin fichas para apostar el mínimo = game over.
// Uso: GAINS=50,100,150 START=200 HANDS=7 node sim/dealers.js [runs]
import { CONFIG } from '../src/core/config.js';
import { createDeck, drawPile } from '../src/core/deck.js';
import { mulberry32 } from '../src/core/rng.js';
import { BOTS as ALL_BOTS, playHand, doubleBasic, discardStiff } from './bots.js';

const runs = Number(process.argv[2] ?? 10000);
const start = Number(process.env.START ?? CONFIG.startFichas);
const hands = Number(process.env.HANDS ?? CONFIG.handsPerLevel);
let gains = (process.env.GAINS ?? '50,100,150').split(',').map(Number);
// MESAS=n: repite las 3 metas de GAINS para n mesas, multiplicando por GROWTH en cada mesa nueva (solo con ABS=1).
const MESAS = Number(process.env.MESAS ?? 0);
const GROWTH = Number(process.env.GROWTH ?? 1.5);
if (MESAS > 0) {
  // Estilo Balatro: BASE y PATTERN="1,1.5,2" (cada dealer = base × patrón); la base crece ×GROWTH por mesa.
  const base = process.env.PATTERN
    ? process.env.PATTERN.split(',').map((m) => Number(process.env.BASE ?? gains[0]) * Number(m))
    : gains.slice(0, 3);
  gains = Array.from({ length: MESAS * 3 }, (_, i) => Math.round((base[i % 3] * GROWTH ** Math.floor(i / 3)) / 5) * 5);
}
// ABS=1: los valores de GAINS son metas absolutas de fichas totales (no ganancia relativa).
const ABS = process.env.ABS === '1';
const FARM = process.env.FARM === '1';
// FULL=1: todos los bots de apuesta usan también doblar (9-11) y descartar con mano rígida,
// para ver cada estilo de apuesta con todas las mecánicas. Se omiten las variantes duplicadas.
const FULL = process.env.FULL === '1';
const BOTS = FULL
  ? ALL_BOTS.filter((b) => !b.double && !b.discard).map((b) => ({ ...b, double: doubleBasic, discard: discardStiff }))
  : ALL_BOTS;
const names = MESAS > 0 ? gains.map((_, i) => `M${Math.floor(i / 3) + 1}D${(i % 3) + 1}`) : ['Pip', 'Mordaz', 'El Muro'];
// DOUBLE=0 apaga la mecánica de doblar para comparar.
const cfg = { ...CONFIG, handsPerLevel: hands, combos: process.env.COMBOS ? process.env.COMBOS !== '0' : CONFIG.combos,
  discardsPerDealer: process.env.DISCARDS ? Number(process.env.DISCARDS) : CONFIG.discardsPerDealer,
  allowDouble: process.env.DOUBLE ? process.env.DOUBLE !== '0' : CONFIG.allowDouble };

/** Juega una ronda. Devuelve { won, fichas }. */
function playRound(bot, rng, fichas, gain, st) {
  const goal = ABS ? gain : fichas + gain;
  let last = null;
  let lastBet = cfg.minBet;
  for (let h = 0; h < hands && fichas < goal; h++) {
    if (fichas < cfg.minBet) return { won: false, fichas };
    const raw = bot.bet({ fichas, goal, handsLeft: hands - h, last, lastBet, minBet: cfg.minBet, first: h === 0 });
    const bet = Math.min(fichas, Math.max(cfg.minBet, raw));
    const res = playHand(drawPile(createDeck(), rng), bot, bet, cfg, fichas, st);
    fichas += res.net;
    lastBet = bet;
    last = res.net > 0 ? 'win' : res.net < 0 ? 'lose' : 'push';
  }
  return { won: fichas >= goal, fichas };
}

/** Devuelve cuántos dealers venció. */
function runOnce(bot, rng) {
  let fichas = start;
  for (let d = 0; d < gains.length; d++) {
    let w = 0;
    let l = 0;
    const st = { discards: cfg.discardsPerDealer }; // descartes: se reinician con cada dealer
    // FARM=1: tras 2 victorias el bot juega igual la 3ª ronda para juntar fichas.
    while (FARM ? w + l < 3 && l < 2 : w < 2 && l < 2) {
      if (fichas < cfg.minBet) return d;
      const r = playRound(bot, rng, fichas, gains[d], st);
      fichas = r.fichas;
      if (r.won) w++; else l++;
    }
    if (l >= 2) return d;
  }
  return gains.length;
}

const nameW = Math.max(...BOTS.map((b) => b.name.length));
if (MESAS > 0) {
  console.log(`Mesas — ${runs} runs, fichas ${start}, metas por mesa (x${GROWTH}): ${Array.from({ length: MESAS }, (_, m) => gains.slice(m * 3, m * 3 + 3).join('/')).join(' | ')}`);
  console.log(`${'bot'.padEnd(nameW)}  ${Array.from({ length: MESAS }, (_, m) => `M${m + 1}`.padStart(5)).join(' ')}  mesas(media)  muere en mesa (mediana)`);
  const allHist = [];
  for (const bot of BOTS) {
    const rng = mulberry32(12345);
    const reach = new Array(gains.length + 1).fill(0);
    const deaths = [];
    const hist = new Array(gains.length + 1).fill(0); // hist[n] = partidas que vencieron n dealers y cayeron en el siguiente
    for (let i = 0; i < runs; i++) {
      const n = runOnce(bot, rng);
      for (let k = 1; k <= n; k++) reach[k]++;
      deaths.push(Math.floor(n / 3) + 1); // mesa en la que cae (MESAS+1 = sobrevivió a todas)
      hist[n]++;
    }
    allHist.push([bot.name, hist]);
    deaths.sort((a, b) => a - b);
    const cols = Array.from({ length: MESAS }, (_, m) => `${((reach[m * 3 + 3] / runs) * 100).toFixed(0)}%`.padStart(5)).join(' ');
    const mean = Array.from({ length: MESAS }, (_, m) => reach[m * 3 + 3] / runs).reduce((a, b) => a + b, 0);
    const med = deaths[Math.floor(runs / 2)];
    console.log(`${bot.name.padEnd(nameW)}  ${cols}  ${mean.toFixed(2).padStart(10)}  ${med > MESAS ? `>${MESAS}` : med}`);
  }
  console.log(`\nDónde mueren (% de partidas que caen en cada dealer; D1-D3 = dealers de la mesa, D3 = jefe):`);
  const spots = gains.map((_, i) => `M${Math.floor(i / 3) + 1}D${(i % 3) + 1}`);
  for (const [name, hist] of allHist) {
    const top = hist.map((c, n) => [n, c]).filter(([n]) => n < gains.length).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const mean = hist.reduce((a, c, n) => a + c * n, 0) / runs;
    console.log(`${name.padEnd(nameW)}  dealers vencidos (media) ${mean.toFixed(1).padStart(5)} | más común: ${top.map(([n, c]) => `${spots[n]} ${((c / runs) * 100).toFixed(0)}%`).join(', ')}`);
  }
  process.exit(0);
}
console.log(`Modelo 2/3 — ${runs} runs, fichas ${start}, ${hands} manos/ronda, ${ABS ? 'meta total' : 'ganancia por ronda'} ${gains.join(' / ')}`);
console.log(`${'bot'.padEnd(nameW)}  ${names.slice(0, gains.length).map((n) => n.padStart(8)).join(' ')}`);
for (const bot of BOTS) {
  const rng = mulberry32(12345);
  const cleared = new Array(gains.length + 1).fill(0);
  for (let i = 0; i < runs; i++) {
    const n = runOnce(bot, rng);
    for (let k = 1; k <= n; k++) cleared[k]++;
  }
  console.log(`${bot.name.padEnd(nameW)}  ${cleared.slice(1).map((c) => `${((c / runs) * 100).toFixed(0)}%`.padStart(8)).join(' ')}`);
}
