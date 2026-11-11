// Copia a public/assets/ los assets del diseño y los packs (tarot, runas) con nombres legibles.
// public/assets/ está en .gitignore: algunos packs no se pueden redistribuir (ver README §15).
import fs from 'node:fs';
import path from 'node:path';

const src = 'assets-raw/design';
const dst = 'public/assets';
// nombre legible → archivo (id del asset en el diseño de Claude)
const MAP = {
  'cartas-claro.png': 'c3fdfeb0d0abb6a3af9bd7e5a721b005.png', // 13 columnas (A..K) × 4 filas (♣ ♥ ♠ ♦), 48×64
  'cartas-oscuro.png': 'f139bd582298bcde19d0c4ec899fae94.png',
  'reversos.png': 'b787f4a8389bb82c9420ebd0935a4b56.png', // 5 reversos 48×64
  'joker-claro.png': 'e43ea6237996aacaca58fe6b0f8bb5c0.png', // placeholder
  'joker-oscuro.png': '507f130c5d0337cce8a1efee24cdb017.png',
  'fondo.png': '9eb210e033e27fef99b3b1dc11476e9d.png',
  'sobres.png': '99884d89b1fd00a61051ae373bc3a9a5.png',
  'luvierre.png': '9da685e417e34915e7da9500feaf3f82.png',
  'pip.png': '86f2005ee589e8559236e3c418719b5e.png',
  'pip-vencido.png': '46b2e66879ae811a3113aef37384a63a.png',
  'mordaz.png': '6b669d4437d20d4e09e1dd51f08f2113.png',
  'muro.png': '525eb41f4db13c6c233b8b7fa05eec0c.png',
  'tendero.png': '68f55cb227f71aefe48d4fd75bd5b8fe.png',
  'semilla.png': '0c515e6afa2b5c62fa606629af91b8a8.png',
};

fs.mkdirSync(dst, { recursive: true });
let n = 0;
if (fs.existsSync(src)) {
  for (const [name, file] of Object.entries(MAP)) {
    const from = path.join(src, file);
    if (!fs.existsSync(from)) { console.warn(`[assets] Falta ${file} (${name})`); continue; }
    fs.copyFileSync(from, path.join(dst, name));
    n++;
  }
} else {
  console.warn(`[assets] No existe ${src}/. Se omite la copia de diseño.`);
}

// Moneda animada (Adeeb-08) y fichas (Riclmbr, CC0)
const coinSrc = path.join('assets-raw', 'Animated coin', 'coin2.png');
if (fs.existsSync(coinSrc)) { fs.copyFileSync(coinSrc, path.join(dst, 'coin-anim.png')); n++; }
for (const c of ['RedChip', 'BlueChip', 'GreenChip', 'BlackChip']) {
  const from = path.join('assets-raw', 'PixelJackpotItems', `${c}.png`);
  if (fs.existsSync(from)) { fs.copyFileSync(from, path.join(dst, `chip-${c.replace('Chip','').toLowerCase()}.png`)); n++; }
}

// Tarot (starsinabox, no redistribuible): 2x por número → tarot<N>.png
const tarotBase = 'assets-raw/Major Arcana - Tarot Cards/cards';
if (fs.existsSync(tarotBase)) {
  for (const dir of fs.readdirSync(tarotBase)) {
    const num = parseInt(dir, 10);
    if (Number.isNaN(num)) continue;
    const exact = path.join(tarotBase, dir, `${dir}_2x.png`);
    let file = exact;
    if (!fs.existsSync(file)) {
      const found = fs.readdirSync(path.join(tarotBase, dir)).find((f) => /_2x\.png$/i.test(f));
      if (found) file = path.join(tarotBase, dir, found);
    }
    if (fs.existsSync(file)) { fs.copyFileSync(file, path.join(dst, `tarot${num}.png`)); n++; }
    else console.warn(`[assets] Falta tarot ${num} (${dir})`);
  }
}

// Runas (Idylwild, uso libre con crédito): rune_gold<n>.png → rune<n>.png (las que existan)
const runeBase = "assets-raw/Idylwild's Runic Codex/runes";
if (fs.existsSync(runeBase)) {
  for (const f of fs.readdirSync(runeBase)) {
    const m = /^rune_gold(\d+)\.png$/.exec(f);
    if (!m) continue;
    fs.copyFileSync(path.join(runeBase, f), path.join(dst, `rune${m[1]}.png`));
    n++;
  }
}

console.log(`[assets] ${n} archivos copiados a ${dst}/`);
