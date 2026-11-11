// Runas (README §7). `n` = número del sprite negro de 16×16 en el Runic Codex (rune<n>.png, ver tabla en AGENTS.md); `sym` = símbolo Unicode.
// OJO: el orden de los sprites NO es el Futhark estándar (incluye variantes), por eso `n` no es la posición de la runa.
// Pasivas: efecto para TODA la partida (el motor las consulta con run.runes; ver src/core/runes.js).
// Activas (`active:true`): se usan al elegirlas como un tarot — seleccionas carta(s) del mazo y aplican su efecto (una vez).
export const RUNES = [
  { id: 'fehu', n: 1, sym: 'ᚠ', rarity: 'common' },
  { id: 'uruz', n: 2, sym: 'ᚢ', rarity: 'common' },
  { id: 'thurisaz', n: 3, sym: 'ᚦ', rarity: 'common' },
  { id: 'ansuz', n: 4, sym: 'ᚨ', rarity: 'common' },
  { id: 'kenaz', n: 9, sym: 'ᚲ', rarity: 'rare' },
  { id: 'gebo', n: 12, sym: 'ᚷ', rarity: 'common' },
  { id: 'wunjo', n: 13, sym: 'ᚹ', rarity: 'rare' },
  { id: 'hagalaz', n: 14, sym: 'ᚺ', rarity: 'rare' },
  { id: 'nauthiz', n: 18, sym: 'ᚾ', rarity: 'common' },
  { id: 'jera', n: 21, sym: 'ᛃ', rarity: 'rare' },
  { id: 'eihwaz', n: 25, sym: 'ᛇ', rarity: 'rare' },
  { id: 'algiz', n: 27, sym: 'ᛉ', rarity: 'rare' },
  { id: 'sowilo', n: 28, sym: 'ᛊ', rarity: 'common' },
  { id: 'ehwaz', n: 35, sym: 'ᛖ', rarity: 'common' },
  { id: 'ingwaz', n: 41, sym: 'ᛜ', rarity: 'rare', active: true, needs: { cards: [1, 1] }, apply: ({ cards }) => { for (const c of cards) c.poly = true; } },
  { id: 'dagaz', n: 43, sym: 'ᛞ', rarity: 'legendary' },
  { id: 'othala', n: 44, sym: 'ᛟ', rarity: 'legendary' },
];
export const RUNE_BY_ID = Object.fromEntries(RUNES.map((r) => [r.id, r]));
export const RUNE_WEIGHT = { common: 6, rare: 3, legendary: 1 };
