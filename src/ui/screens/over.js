import { stage, bindActs, startRun } from './common.js';
import { game, go } from '../router.js';
import { store, save, rememberSeed } from '../store.js';
import { esc, fmt, chip, coin } from '../dom.js';
import { todayKey } from './common.js';
import { t } from '../../i18n/index.js';

export default function over() {
  const run = game.run;
  const st = run.stats;
  const dealers = st.dealersBeaten;
  // récords (solo la primera vez que se muestra esta partida)
  if (!run.recorded) {
  run.recorded = true;
  const r = store.records;
  r.games++;
  r.bestMesa = Math.max(r.bestMesa, run.mesa);
  r.bestDealers = Math.max(r.bestDealers, dealers);
  r.bestHand = Math.max(r.bestHand, st.bestNet);
  r.bestFichas = Math.max(r.bestFichas, run.fichas);
  if (game.mode === 'daily') store.daily = { date: todayKey(), done: true, dealers };
  rememberSeed(run.seed, { mesa: run.mesa, dealers });
  save();
  }

  const el = stage();
  const tile = (l, b, s) => `<div class="tile"><span class="label">${l}</span><span class="big">${b}</span><span class="sub">${s}</span></div>`;
  el.innerHTML += `
  <section class="panel" style="position:absolute;z-index:4;left:230px;top:70px;width:820px;padding:34px 40px 36px;display:flex;flex-direction:column;gap:18px">
    <div style="display:flex;flex-direction:column;gap:2px"><span class="label">${t('over.kicker')}</span>
      <h1 style="font-size:64px;line-height:1;font-weight:700;color:#e8705f;text-shadow:0 5px 0 #4a0f1a,6px 8px 0 #000">${t('over.title')}</h1></div>
    <p style="font-size:20px;color:#b9a780">${run.fichas < run.cfg.minBet ? t('over.nochips') : t('over.nohands')} ${t('over.where', { mesa: run.mesa, n: run.dealerIdx + 1, seed: esc(run.seed) })}</p>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">
      ${tile(t('over.tile.dealers'), dealers, t('over.tile.dealers.sub', { mesa: run.mesa }))}
      ${tile(t('over.tile.hands'), st.hands, t('over.tile.hands.sub', { w: st.wins, l: st.losses }))}
      ${tile(t('over.tile.best'), `${chip(22)}${fmt(st.bestNet)}`, t('over.tile.best.sub'))}
      ${tile(t('over.tile.coins'), `<span style="color:#ecc062">${coin(22)}${st.coinsEarned}</span>`, t('over.tile.coins.sub', { n: run.jokers.length }))}
    </div>
    <div style="display:flex;gap:16px;margin-top:6px">
      <button class="btn" type="button" data-act="again" style="flex:1;height:60px;font-size:24px">${t('over.again')}</button>
      <button class="btn btn-ghost" type="button" data-act="new" style="flex:1;height:60px;font-size:24px">${t('over.new')}</button>
      <button class="btn btn-ghost" type="button" data-go="menu" style="width:200px;height:60px;font-size:24px">${t('over.menu')}</button>
    </div>
  </section>`;
  bindActs(el, {
    again: () => startRun({ seed: run.seed, mode: game.mode === 'daily' ? 'infinite' : game.mode }),
    new: () => go('seed'),
  });
  return { el };
}
