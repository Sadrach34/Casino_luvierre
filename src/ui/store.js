// Ajustes y récords en localStorage (todo envuelto en try/catch: puede no estar disponible).
const KEY = 'luvierre.v1';
const DEFAULTS = {
  settings: { lang: null, deck: 'claro', back: 2, music: 70, sfx: 80, speed: 'normal', dialogs: true, anim: true },
  records: { bestMesa: 0, bestDealers: 0, bestHand: 0, games: 0, bestFichas: 0 },
  recentSeeds: [],
  daily: { date: null, done: false, dealers: 0 },
};

let data = structuredClone(DEFAULTS);
try {
  const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  if (raw) data = { ...data, ...raw, settings: { ...data.settings, ...raw.settings }, records: { ...data.records, ...raw.records }, daily: { ...data.daily, ...raw.daily } };
} catch { /* sin almacenamiento */ }

export const store = data;
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignorar */ }
}

export const SPEED = { normal: 1, rapida: 0.6, turbo: 0.3 };
export const speedFactor = () => SPEED[data.settings.speed] ?? 1;

export function rememberSeed(seed, info) {
  data.recentSeeds = [{ seed, ...info }, ...data.recentSeeds.filter((s) => s.seed !== seed)].slice(0, 5);
  save();
}
