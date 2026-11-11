import { asset } from '../dom.js';
import { stage, gearBtn, bindActs, startRun, todayKey, newSeedCode, dailyDone } from './common.js';
import { go } from '../router.js';
import { store, rememberSeed } from '../store.js';
import { $, $$, esc } from '../dom.js';
import { t } from '../../i18n/index.js';

export default function seed() {
  const el = stage();
  let mode = 'random';
  let code = newSeedCode();
  const d = todayKey().split('-').reverse().join('·');
  const recent = store.recentSeeds
    .map((r, i, a) => `<div class="rec" ${i === a.length - 1 ? 'style="border-bottom:0"' : ''}><span style="font-size:22px;font-weight:600;letter-spacing:.1em">${esc(r.seed)}</span><span style="font-size:16px;color:#b9a780">${r.mesa ? t('seed.recent.info', { mesa: r.mesa, dealers: r.dealers }) : t('seed.recent.unfinished')}</span><button class="btn btn-ghost btn-sm" type="button" data-use="${esc(r.seed)}" style="min-height:36px;font-size:15px;padding:0 12px">${t('seed.use')}</button></div>`)
    .join('') || `<span style="font-size:16px;color:#b9a780;padding:8px 0">${t('seed.recent.none')}</span>`;

  el.innerHTML += `
  <div style="position:absolute;z-index:2;left:790px;top:60px;width:490px;height:660px">
    <div style="position:absolute;left:0;top:60px;width:490px;height:600px;background:radial-gradient(circle,#9a6f26 0,#5a3f14 38%,rgba(20,16,10,0) 68%)"></div>
    <div class="spr jk" style="position:absolute;left:40px;top:150px;--s:3;--col:0;transform:rotate(-14deg);transform-origin:50% 100%"></div>
    <div class="spr jk" style="position:absolute;left:330px;top:150px;--s:3;--col:1;transform:rotate(14deg);transform-origin:50% 100%"></div>
    <img src="${asset('semilla.png')}" alt="${t('seed.alt')}" style="position:absolute;left:30px;bottom:0;height:560px;width:auto;display:block">
  </div>
  <section style="position:absolute;z-index:4;left:80px;top:62px;width:660px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;flex-direction:column;gap:2px">
      <span class="label">${t('seed.mode')}</span>
      <h1 style="font-size:64px;line-height:1;font-weight:700;color:#cf9b38;text-shadow:0 5px 0 #7a5a1e,6px 8px 0 #000">${t('seed.title')}</h1>
    </div>
    <p style="font-size:19px;line-height:1.25;color:#b9a780;max-width:600px">${t('seed.help')}</p>
    <div class="panel" style="padding:20px 24px 22px;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;gap:14px">
        <button class="mode" type="button" data-mode="daily" ${dailyDone() ? 'disabled style="opacity:.5"' : ''}><span class="label" style="color:#ecc062">${t('seed.daily')}</span><span style="font-size:20px;font-weight:600">${d}</span></button>
        <button class="mode" type="button" data-mode="random"><span class="label" style="color:#ecc062">${t('seed.random')}</span><span style="font-size:20px;font-weight:600">${t('seed.random.sub')}</span></button>
        <button class="mode" type="button" data-mode="mine"><span class="label" style="color:#ecc062">${t('seed.mine')}</span><span style="font-size:20px;font-weight:600">${t('seed.mine.sub')}</span></button>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <label class="label" for="semilla">${t('seed.code')}</label>
        <input id="semilla" class="seed" type="text" value="${code}" maxlength="24" spellcheck="false" autocomplete="off">
      </div>
      <div style="display:flex;gap:14px">
        <button class="btn btn-ghost btn-sm" type="button" data-act="paste">${t('seed.paste')}</button>
        <button class="btn btn-ghost btn-sm" type="button" data-act="random">${t('seed.random')}</button>
        <button class="btn btn-ghost btn-sm" type="button" data-act="copy">${t('seed.copy')}</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column">
      <span class="label" style="margin-bottom:2px">${t('seed.recent')}</span>${recent}
    </div>
  </section>
  <button class="btn btn-ghost" type="button" data-go="menu" style="position:absolute;z-index:4;left:80px;bottom:22px;width:200px;height:56px;font-size:22px">${t('common.back')}</button>
  <button class="btn" type="button" data-act="start" style="position:absolute;z-index:4;left:330px;bottom:22px;width:410px;height:56px;font-size:26px">${t('seed.start')}</button>
  ${gearBtn()}`;

  const input = $('#semilla', el);
  const modes = $$('.mode', el);
  const setMode = (m) => {
    mode = m;
    modes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    if (m === 'daily') { code = todayKey(); input.value = code; input.readOnly = true; }
    else if (m === 'random') { code = newSeedCode(); input.value = code; input.readOnly = true; }
    else { input.readOnly = false; input.focus(); input.select(); }
  };
  setMode('random');
  modes.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  input.addEventListener('input', () => { code = input.value.trim().toUpperCase(); });
  el.addEventListener('click', (e) => {
    const u = e.target.closest('[data-use]');
    if (u) { setMode('mine'); input.value = u.dataset.use; code = u.dataset.use; }
  });

  bindActs(el, {
    random: () => setMode('random'),
    copy: () => navigator.clipboard?.writeText(input.value).catch(() => {}),
    paste: async () => { try { const t = await navigator.clipboard.readText(); setMode('mine'); input.value = t.trim().toUpperCase(); code = input.value; } catch { /* sin permiso */ } },
    start: () => {
      const s = (input.value || '').trim().toUpperCase();
      if (!s) { input.focus(); return; }
      rememberSeed(s, { mesa: 0, dealers: 0 });
      startRun({ seed: s, mode: mode === 'daily' ? 'daily' : 'infinite' });
    },
  });
  return { el };
}
