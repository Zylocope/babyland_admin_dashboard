// Amounts are stored in Kyat (MMK). Displayed in lakh: 1 lakh = 100,000 Kyat.
// e.g. 82,000 Kyat → "0.82 Lakh".
const toLakh = (amount) => {
  const lakh = (amount || 0) / 100000;
  // up to 2 decimals, trim trailing zeros (0.70 → 0.7, 1.50 → 1.5)
  return parseFloat(lakh.toFixed(2)).toLocaleString('en-US');
};

export const formatMMK = (amount) => `${toLakh(amount)} Lakh`;
export const formatMMKShort = (amount) => `${toLakh(amount)} Lakh`;
