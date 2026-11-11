// Vales: mejoras permanentes de la tienda (README §7). Textos: voucher.<id>.name / .desc en src/i18n.
export const VOUCHERS = [
  { id: 'interest', price: 10, apply: (run) => { run.interestCap = 10; } },
];
