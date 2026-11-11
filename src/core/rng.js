// RNG con semilla (mulberry32). Streams separados para que lo que haga el jugador
// (cuántas cartas pide) no cambie la tienda ni los jefes de una semilla.

export function hashSeed(str) {
  // cyrb53 reducido a 32 bits
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 ^ h1) >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    state: () => a, // para guardar partidas
    setState: (v) => { a = v >>> 0; },
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

/** Crea streams independientes a partir de una semilla de texto. */
export function makeStreams(seedText) {
  return {
    deck: mulberry32(hashSeed(seedText + ':deck')),
    shop: mulberry32(hashSeed(seedText + ':shop')),
    boss: mulberry32(hashSeed(seedText + ':boss')),
  };
}

export const dailySeed = (date = new Date()) => date.toISOString().slice(0, 10);
export const randomSeed = () => Math.random().toString(36).slice(2, 10);
