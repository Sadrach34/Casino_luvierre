// Todos los valores de balance viven aquí para poder ajustarlos desde el simulador.
export const CONFIG = {
  startFichas: 150,
  startGoal: 205, // sin jokers al inicio: los jokers son premios que se ganan en la tienda
  handsPerLevel: 7,
  // La meta se multiplica por este patrón al subir de nivel (ciclo de 3).
  goalPattern: [1.0, 1.5, 2.0],
  bossEvery: 3,
  minBet: 10,
  dealerStand: 16, // el dealer pide mientras total < dealerStand (prototipo: planta en 16)
  blackjackPays: 1.5,
  multiWinFactor: 0.5, // victoria lograda solo gracias al multi paga este % del pago base
  allowDouble: true, // doblar: duplicas la apuesta, recibes 1 carta más y te plantas
  combos: true, // combos de mano base (par, color, escalera…), ver src/data/combos.js
  // --- Partida (juego real) ---
  mesaBaseGoal: 170, // meta base de la mesa 1; cada dealer = base × dealerMultipliers[i]
  dealerMultipliers: [1, 1.5, 2], // Pip / Mordaz / jefe (estilo Balatro)
  mesaGrowth: 2.6, // la base de cada mesa nueva se multiplica por esto
  handsPerDealer: 7, // manos (repartos) por dealer; pedir carta no cuenta
  winsRequired: 2, // victorias de mano necesarias (además de llegar a la meta) para vencer al dealer
  discardsPerDealer: 3,
  reshuffleBelow: 12, // se rebaraja el mazo si quedan menos cartas que estas
  bossStand: 18, // El Muro (jefe de la mesa 1) planta en 18
  skipReward: 20, // monedas por saltar un dealer (valor de ejemplo)
  // Economía de monedas (README §4)
  coinsPerDealer: 3,
  bossCoins: 3,
  coinPerLeftoverHand: 1,
  coinPerExtraFichas: 50, // +$1 por cada 50 fichas por encima de la meta
  coinPerExtraFichasCap: 10, // máximo de monedas por fichas extra
  interestPer: 5, // $1 por cada $5 guardados
  interestCap: 5,
  startCoins: 0,
  rerollBase: 5,
  rerollStep: 1,
  maxJokers: 5,
  maxConsumables: 2,
};
