import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const load = (l) => JSON.parse(fs.readFileSync(`src/i18n/${l}.json`, 'utf8'));
const es = load('es');
const en = load('en');
const params = (v) => [...(Array.isArray(v) ? v.join(' ') : v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('es.json y en.json tienen exactamente las mismas claves', () => {
  const a = Object.keys(es).sort();
  const b = Object.keys(en).sort();
  assert.deepEqual(a.filter((k) => !(k in en)), [], 'faltan en en.json');
  assert.deepEqual(b.filter((k) => !(k in es)), [], 'faltan en es.json');
});

test('los parámetros {x} coinciden entre idiomas y las listas tienen igual tamaño', () => {
  for (const k of Object.keys(es)) {
    assert.equal(params(es[k]), params(en[k]), `parámetros distintos en ${k}`);
    if (Array.isArray(es[k])) assert.equal(es[k].length, en[k].length, `lista de distinto tamaño en ${k}`);
  }
});

test('todas las claves t(\'…\') del código existen en es.json', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const missing = [];
  for (const f of walk('src').filter((x) => x.endsWith('.js'))) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/\bt[l]?\(\s*['"`]([a-z][\w.]*)['"`]/g)) if (!(m[1] in es)) missing.push(`${f}: ${m[1]}`);
  }
  assert.deepEqual(missing, []);
});

test('las claves dinámicas de dealers, jokers, combos, vales, tarots, runas y resultados existen', async () => {
  const { DEALERS } = await import('../src/data/dealers.js');
  const { JOKERS } = await import('../src/data/jokers.js');
  const { COMBOS } = await import('../src/data/combos.js');
  const { VOUCHERS } = await import('../src/data/vouchers.js');
  const { TAROTS } = await import('../src/data/tarots.js');
  const { RUNES } = await import('../src/data/runes.js');
  const need = [];
  for (const d of DEALERS) {
    need.push(`dealer.${d.id}.name`, `dealer.${d.id}.tier`, `dealer.${d.id}.effect`);
    for (const kind of ['idle', 'win', 'lose', 'bust', 'blackjack', 'defeated']) need.push(`dealer.${d.id}.lines.${kind}`);
  }
  for (const j of JOKERS) need.push(`joker.${j.id}.name`, `joker.${j.id}.desc`);
  for (const c of COMBOS) need.push(`combo.${c.id}`);
  for (const v of VOUCHERS) need.push(`voucher.${v.id}.name`, `voucher.${v.id}.desc`);
  for (const t of TAROTS) need.push(`tarot.${t.id}.name`, `tarot.${t.id}.desc`);
  for (const r of RUNES) need.push(`rune.${r.id}.name`, `rune.${r.id}.desc`);
  for (const r of ['win', 'blackjack', 'multiWin', 'push', 'lose', 'bust']) need.push(`table.res.${r}`);
  for (const r of ['dealer', 'hands', 'chips', 'interest']) need.push(`reward.${r}`);
  for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) need.push(`rank.${r}`);
  for (const s of ['clubs', 'hearts', 'spades', 'diamonds']) need.push(`suit.${s}`);
  assert.deepEqual(need.filter((k) => !(k in es) || !(k in en)), []);
});
