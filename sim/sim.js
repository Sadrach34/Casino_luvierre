// Simulador de balance. Uso: node sim/sim.js [runs] [maxLevel] [startGoal] [handsPerLevel] [startFichas] [patron ej. 1.3,1.5,1]
// Baseline SIN jokers/tienda: mide qué tan dura es la curva de metas solo con blackjack.
// Metas explícitas por nivel: GOALS=205,260,320 node sim/sim.js (si no, usa startGoal × patrón).
// Todos los bots saltan el nivel en cuanto alcanzan la meta (como el botón "saltar nivel").
import { CONFIG } from '../src/core/config.js';
import { createDeck, drawPile } from '../src/core/deck.js';
import { BOTS, playHand } from './bots.js';
import { mulberry32 } from '../src/core/rng.js';

/** Devuelve cuántos niveles superó la partida. */
function runOnce(bot, rng, cfg, maxLevel) {
  let fichas = cfg.startFichas;
  let goal = cfg.startGoal;
  for (let level = 1; level <= maxLevel; level++) {
    let last = null;
    let lastBet = cfg.minBet;
    for (let h = 0; h < cfg.handsPerLevel && fichas < goal; h++) {
      if (fichas < cfg.minBet) return level - 1;
      const raw = bot.bet({ fichas, goal, handsLeft: cfg.handsPerLevel - h, last, lastBet, minBet: cfg.minBet });
      const bet = Math.min(fichas, Math.max(cfg.minBet, raw));
      const res = playHand(drawPile(createDeck(), rng), bot, bet, cfg, fichas);
      fichas += res.net;
      lastBet = bet;
      last = res.net > 0 ? 'win' : res.net < 0 ? 'lose' : 'push';
    }
    if (fichas < goal) return level - 1;
    goal = cfg.goals ? (cfg.goals[level] ?? Math.round(goal * 2)) : Math.round(goal * cfg.goalPattern[level % cfg.goalPattern.length]);
  }
  return maxLevel;
}

const runs = Number(process.argv[2] ?? 10000);
const maxLevel = Number(process.argv[3] ?? 8);
const cfg = {
  ...CONFIG,
  startGoal: process.env.GOALS ? Number(process.env.GOALS.split(',')[0]) : Number(process.argv[4] ?? CONFIG.startGoal),
  handsPerLevel: Number(process.argv[5] ?? CONFIG.handsPerLevel),
  startFichas: Number(process.argv[6] ?? CONFIG.startFichas),
  goals: process.env.GOALS ? process.env.GOALS.split(',').map(Number) : null,
  goalPattern: process.argv[7] ? process.argv[7].split(',').map(Number) : CONFIG.goalPattern,
};
console.log(`Baseline sin tienda — ${runs} runs, ${maxLevel} niveles, config:`, JSON.stringify({
  fichas: cfg.startFichas, meta: cfg.startGoal, manos: cfg.handsPerLevel, patron: cfg.goalPattern,
}));

const nameW = Math.max(...BOTS.map((b) => b.name.length));
console.log(`${'bot'.padEnd(nameW)}  ${Array.from({ length: maxLevel }, (_, i) => `N${i + 1}`.padStart(4)).join(' ')}   media`);
for (const bot of BOTS) {
  const rng = mulberry32(12345);
  const cleared = new Array(maxLevel + 1).fill(0); // cleared[n] = runs que superaron n niveles
  let sum = 0;
  for (let i = 0; i < runs; i++) {
    const lv = runOnce(bot, rng, cfg, maxLevel);
    sum += lv;
    for (let n = 1; n <= lv; n++) cleared[n]++;
  }
  const cols = cleared.slice(1).map((c) => `${((c / runs) * 100).toFixed(0)}%`.padStart(4)).join(' ');
  console.log(`${bot.name.padEnd(nameW)}  ${cols}   ${(sum / runs).toFixed(2)}`);
}
