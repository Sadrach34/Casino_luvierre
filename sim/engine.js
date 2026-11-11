// Simula con el MOTOR REAL (src/core/run.js): mismas reglas que el juego.
// Uso: node sim/engine.js [runs] [mesas]    (FULL=1 usa doblar y descartar en todos los bots)
import { BOTS as ALL, doubleBasic, discardStiff } from './bots.js';
import { createRun, startDealer, beginHand, actions, finishDealerTurn, settleHand, endDealer, advanceDealer, canFarm } from '../src/core/run.js';
import { handTotal } from '../src/core/deck.js';

const runs = Number(process.argv[2] ?? 3000);
const mesas = Number(process.argv[3] ?? 3);
const BOTS = ALL.filter((b) => !b.double && !b.discard).map((b) => ({ ...b, double: doubleBasic, discard: discardStiff }));

function playDealer(run, bot) {
  startDealer(run);
  let last = null;
  let lastBet = run.cfg.minBet;
  while (run.handsLeft > 0 && run.fichas >= run.cfg.minBet && !run.beaten) {
    const raw = bot.bet({ fichas: run.fichas, goal: run.goal, handsLeft: run.handsLeft, last, lastBet, minBet: run.cfg.minBet, first: run.handsThisDealer === 0 });
    beginHand(run, Math.max(run.cfg.minBet, raw));
    const h = run.hand;
    const up = h.dealer[1].value;
    if (actions.canDiscard(run)) { const i = bot.discard?.(h.player, up) ?? -1; if (i >= 0) actions.discard(run, i); }
    if (h.phase === 'player' && bot.double?.(h.player, up) && actions.canDouble(run)) actions.double(run);
    while (h.phase === 'player' && bot.hit(h.player, up) && handTotal(h.player) <= 21) actions.hit(run);
    if (h.phase === 'player') actions.stand(run);
    finishDealerTurn(run);
    const res = settleHand(run);
    lastBet = h.bet;
    last = res.net > 0 ? 'win' : res.net < 0 ? 'lose' : 'push';
  }
  return run.beaten;
}

console.log(`Motor real — ${runs} runs, ${mesas} mesas, ${new Date().getFullYear() > 0 ? '' : ''}7 manos por dealer, meta + 2 victorias`);
console.log(`${'bot'.padEnd(28)}  ${Array.from({ length: mesas * 3 }, (_, i) => `M${Math.floor(i / 3) + 1}D${(i % 3) + 1}`.padStart(6)).join('')}`);
for (const bot of BOTS) {
  const cleared = new Array(mesas * 3).fill(0);
  for (let i = 0; i < runs; i++) {
    const run = createRun({ seed: `sim-${bot.name}-${i}` });
    let n = 0;
    for (; n < mesas * 3; n++) {
      if (!playDealer(run, bot)) break;
      endDealer(run); advanceDealer(run);
    }
    for (let k = 0; k < n; k++) cleared[k]++;
  }
  console.log(`${bot.name.padEnd(28)}  ${cleared.map((c) => `${((c / runs) * 100).toFixed(0)}%`.padStart(6)).join('')}`);
}
