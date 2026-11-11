// Dealers de la mesa 1 (README §8). Los textos (nombre, nivel, efecto, diálogos) están en src/i18n/*.json
// con las claves dealer.<id>.name, .tier, .effect y .lines.<tipo>; los diálogos son provisionales.
export const DEALERS = [
  { id: 'pip', boss: false, standAt: null, hasEffect: false, img: { card: 'luvierre.png', table: 'pip.png', defeated: 'pip-vencido.png' } },
  { id: 'mordaz', boss: false, standAt: null, hasEffect: false, img: { card: 'mordaz.png', table: 'mordaz.png', defeated: 'mordaz.png' } },
  { id: 'muro', boss: true, standAt: 18, hasEffect: true, img: { card: 'muro.png', table: 'muro.png', defeated: 'muro.png' } },
];

export const pickLine = (list, rng) => list[Math.floor((rng?.next?.() ?? Math.random()) * list.length)];
