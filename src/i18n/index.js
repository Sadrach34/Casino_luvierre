// Traducciones: JSON plano con claves (es.json / en.json). Uso: t(KEY, { param }) → texto.
// Listas de frases (diálogos) son arreglos en el JSON: tl(KEY) devuelve el arreglo.
import es from './es.json';
import en from './en.json';

export const LANGS = { es, en };
export const LANG_NAMES = { es: 'Español', en: 'English' };
let lang = 'es';

export function detectLang() {
  try { return (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es'; } catch { return 'es'; }
}
export function setLang(l) { lang = LANGS[l] ? l : 'es'; try { document.documentElement.lang = lang; } catch { /* sin DOM */ } }
export const getLang = () => lang;

function lookup(key, l) { return LANGS[l]?.[key]; }

export function t(key, params) {
  let v = lookup(key, lang) ?? lookup(key, 'es') ?? key;
  if (Array.isArray(v)) return v[0];
  if (params) v = v.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
  return v;
}
/** Arreglo de frases (diálogos). */
export function tl(key) {
  const v = lookup(key, lang) ?? lookup(key, 'es');
  return Array.isArray(v) ? v : [t(key)];
}
export const has = (key) => lookup(key, lang) !== undefined || lookup(key, 'es') !== undefined;
