// Utilidades de DOM y componentes de sprites (cartas 48×64 en hoja de 13 columnas × 4 filas).
import { RANKS } from '../core/deck.js';
import { t } from '../i18n/index.js';
import { jokerCurrent } from '../data/jokers.js';
import { TAROT_BY_ID } from '../data/tarots.js';
import { RUNE_BY_ID } from '../data/runes.js';

export const asset = (name) => `${(typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) ?? '/'}assets/${name}`;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function html(strings, ...vals) {
  const t = document.createElement('template');
  t.innerHTML = String.raw({ raw: strings }, ...vals).trim();
  return t.content.firstElementChild;
}

const ROW = { clubs: 0, hearts: 1, spades: 2, diamonds: 3 };
export const SUIT_SYMBOL = { clubs: '♣', hearts: '♥', spades: '♠', diamonds: '♦' };
export const SUIT_ORDER = ['clubs', 'hearts', 'spades', 'diamonds'];
export const cardName = (c) => t('card.name', { rank: t(`rank.${c.rank}`), suit: t(`suit.${c.suit}`) });

/** Sprite de carta de la baraja (clase .cd; --col = rango, --row = palo). */
export function cardSprite(card, { s = 2.5, cls = '' } = {}) {
  return `<span class="spr cd ${cls}" style="--s:${s};--col:${RANKS.indexOf(card.rank)};--row:${ROW[card.suit]}" role="img" aria-label="${cardName(card)}"></span>`;
}
export const backSprite = (s = 2.5, cls = '') => `<span class="spr bk ${cls}" style="--s:${s}" aria-hidden="true"></span>`;
export function jokerSprite(art = 0, { s = 1.25, edition = null } = {}) {
  const inner = `<span class="spr jk ${edition === 'poly' ? 'poly' : ''}" style="--s:${s};--col:${art}"></span>`;
  return edition === 'negative' ? `<span class="neg">${inner}</span>` : inner;
}

export function tarotSprite(id, { s = 2, cls = '' } = {}) {
  const num = TAROT_BY_ID[id]?.num ?? 0;
  const name = t(`tarot.${id}.name`);
  return `<img class="${cls}" src="${asset(`tarot${num}.png`)}" alt="${esc(name)}" style="width:${Math.round(46 * s)}px;height:${Math.round(81 * s)}px;image-rendering:pixelated;display:block;filter:drop-shadow(4px 4px 0 rgba(0,0,0,.65))">`;
}

/** Runa en dorado (como el diseño: sprite negro 16×16 con el filtro .rn). `s` = escala en píxeles (×16). */
export function runeSprite(id, { s = 3, cls = '' } = {}) {
  const r = RUNE_BY_ID[id];
  const name = t(`rune.${id}.name`);
  if (!r) return `<span class="${cls}" style="font-size:${12 * s}px;color:#ecc062" role="img" aria-label="${esc(name)}">ᚱ</span>`;
  return `<img class="rn ${cls}" src="${asset(`rune${r.n}.png`)}" alt="${esc(name)}" width="${16 * s}" height="${16 * s}" style="width:${16 * s}px;height:${16 * s}px">`;
}

/** Baldosa de runa del diseño (marco dorado octogonal con la runa grande en 96 px). */
export const runeTile = (id) => `<span class="rtw"><span class="rt">${runeSprite(id, { s: 6 })}</span></span>`;

function cardEffectTags(card) {
  const tags = [];
  if (card.poly) tags.push('◈');
  if (card.wild) tags.push(t('deck.fx.wild'));
  if (card.twice) tags.push('×2');
  if (card.value10) tags.push('=10');
  if (card.effect?.chips) tags.push(`+${card.effect.chips}F`);
  if (card.effect?.mult) tags.push(`×${card.effect.mult}M`);
  if (card.nosell) tags.push('🔒');
  return tags;
}
export function cardEffectSummary(card) {
  const parts = [];
  if (card.poly) parts.push(t('deck.fx.poly'));
  if (card.wild) parts.push(t('deck.fx.wild_full'));
  if (card.twice) parts.push(t('deck.fx.twice'));
  if (card.value10) parts.push(t('deck.fx.value10'));
  if (card.effect?.chips) parts.push(t('deck.fx.chips', { n: card.effect.chips }));
  if (card.effect?.mult) parts.push(t('deck.fx.mult', { n: card.effect.mult }));
  if (card.nosell) parts.push(t('deck.fx.nosell'));
  return parts.join(' · ');
}

/** Sprite de carta del mazo mostrando efectos (policromo, comodín, ×2, valor10, fichas/multi). */
export function deckCardSprite(card, { s = 2, cls = '', mark = false, gone = false, showFx = true } = {}) {
  const poly = card.poly ? ' poly' : '';
  const fx = showFx ? cardEffectSummary(card) : '';
  const title = fx ? ` title="${esc(cardName(card) + ' — ' + fx)}"` : '';
  const base = `<span class="spr cd ${cls}${poly}" style="--s:${s};--col:${RANKS.indexOf(card.rank)};--row:${ROW[card.suit]}" role="img" aria-label="${esc(cardName(card) + (fx ? ': ' + fx : ''))}"></span>`;
  const tags = showFx ? cardEffectTags(card) : [];
  const badge = tags.length ? `<span class="ctag" aria-hidden="true">${esc(tags.join(' '))}</span>` : '';
  const wrapCls = `dcw${mark ? ' mk' : ''}${gone ? ' gone' : ''}${card.poly ? ' hasfx' : ''}${card.effect ? ' hasfx' : ''}${card.wild || card.twice || card.value10 ? ' hasfx' : ''}`;
  return `<span class="${wrapCls}" style="--s:${s}"${title}>${base}${badge}</span>`;
}

export const coin = (size = 22) => `<span class="coin" aria-hidden="true" style="width:${size}px;height:${size}px"></span>`;
export const chip = (size = 26) => `<span class="chip" aria-hidden="true" style="width:${size}px;height:${size}px"></span>`;
export const fmt = (n) => Math.floor(n).toLocaleString('es-MX');

export const ICON = {
  gear: '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="currentColor"><rect x="6" y="0" width="4" height="3"/><rect x="6" y="13" width="4" height="3"/><rect x="0" y="6" width="3" height="4"/><rect x="13" y="6" width="3" height="4"/><rect x="2" y="2" width="3" height="3"/><rect x="11" y="2" width="3" height="3"/><rect x="2" y="11" width="3" height="3"/><rect x="11" y="11" width="3" height="3"/><rect x="3" y="3" width="10" height="10"/></g><rect x="6" y="6" width="4" height="4" fill="#211910"/></svg>',
  stats: '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="currentColor"><rect x="1" y="9" width="3" height="6"/><rect x="6" y="5" width="3" height="10"/><rect x="11" y="1" width="3" height="14"/></g></svg>',
  dealers: '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="currentColor"><rect x="2" y="1" width="3" height="3"/><rect x="11" y="1" width="3" height="3"/><rect x="1" y="5" width="14" height="3"/><rect x="3" y="9" width="10" height="3"/><rect x="5" y="13" width="6" height="2"/></g></svg>',
};

/** Pips de victorias (rondas / manos ganadas). */
export const pips = (done, total) => Array.from({ length: total }, (_, i) => `<span class="pip" style="${i < done ? 'background:#cf9b38' : 'border:2px solid #7a5a1e'}"></span>`).join('');

export function deckClasses(settings) {
  return `${settings.deck === 'oscuro' ? 'oscuro ' : ''}r${settings.back}`;
}

/** Descripción de un joker que ya tienes: la base + su valor actual si crece (p. ej. Discípulo del Tarot: ×1.3). */
export function jokerDesc(id, run) {
  const cur = jokerCurrent(id, run);
  return cur == null ? t(`joker.${id}.desc`) : `${t(`joker.${id}.desc`)} ${t('joker.current', { x: cur })}`;
}

/** Igual que jokerDesc pero en HTML: el valor actual va resaltado en rojo (clase .jcur) para distinguirlo de la descripción. */
export function jokerDescHTML(id, run) {
  const cur = jokerCurrent(id, run);
  const base = esc(t(`joker.${id}.desc`));
  return cur == null ? base : `${base} <b class="jcur">${esc(t('joker.current', { x: cur }))}</b>`;
}
