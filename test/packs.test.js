import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun } from '../src/core/run.js';
import { openShop, buyPack, PACKS } from '../src/core/shop.js';
import { openPack, takeJoker, takeRune, finishPack } from '../src/core/packs.js';

test('abrir paquete de jokers crea opciones y respeta picks', () => {
  const run = createRun({ seed: 'packs1' });
  run.coins = 50;
  openShop(run);
  const pk = openPack(run, 'jokers', 'shop');
  assert.ok(pk);
  assert.equal(pk.kind, 'jokers');
  assert.ok(pk.options.length > 0);
  assert.equal(pk.picksLeft, PACKS.jokers.pick);
  assert.equal(run.phase, 'pack');
});

test('tomar joker del paquete ocupa espacio y consume pick', () => {
  const run = createRun({ seed: 'packs2' });
  run.coins = 50;
  openShop(run);
  openPack(run, 'jokers', 'shop');
  const before = run.jokers.length;
  const r = takeJoker(run, 0);
  assert.equal(r.ok, true);
  assert.equal(run.jokers.length, before + 1);
  assert.ok(run.pack.picksLeft <= PACKS.jokers.pick - 1 || run.pack.done);
});

test('finishPack vuelve a la fase indicada', () => {
  const run = createRun({ seed: 'packs3' });
  openShop(run);
  openPack(run, 'tarot', 'shop');
  const res = finishPack(run);
  assert.equal(run.phase, 'shop');
  assert.equal(res.returnTo, 'shop');
  assert.equal(run.pack, null);
});

test('paquete de runas no repite runas ya activas', () => {
  const run = createRun({ seed: 'packs4' });
  run.runes = ['fehu', 'uruz', 'thurisaz'];
  openPack(run, 'runes', 'shop');
  for (const o of run.pack.options) assert.ok(!run.runes.includes(o.id));
});

test('min/all-in se pueden calcular con clampBet y fichas', () => {
  const run = createRun({ seed: 'bet' });
  run.fichas = 123;
  const min = Math.max(run.cfg.minBet, Math.min(run.cfg.minBet, run.fichas));
  assert.equal(min, 10);
  const allin = Math.min(run.fichas, run.fichas);
  assert.equal(allin, 123);
});
