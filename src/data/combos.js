// Combos de mano (base, sin jokers). Se aplican PRIMERO (antes de jokers y cartas con efecto).
// F = fichas que suman al pago, M = multi. Solo se cuenta el combo de mayor prioridad (el primero de la lista).
// Valores iniciales, para ajustar con el simulador. Nombres: combo.<id> en src/i18n.
export const COMBOS = [
  { id: 'sevens', F: 50, M: 2.0 },
  { id: 'five', F: 40, M: 1.5 },
  { id: 'straight', F: 25, M: 1.5 },
  { id: 'flush', F: 20, M: 1.3 },
  { id: 'trips', F: 30, M: 1.5 },
  { id: 'twoPair', F: 20, M: 1.4 },
  { id: 'pair', F: 10, M: 1.2 },
  { id: 'twentyOne', F: 10, M: 1.2 },
];
