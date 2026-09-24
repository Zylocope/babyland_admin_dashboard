export const formatMMK = (amount) =>
  new Intl.NumberFormat('en-US').format(Math.round(amount || 0)) + ' MMK';

// The same compact number without the unit, for places that repeat it — a
// seven-column chart printing "MMK" seven times is noise, and the panel says
// what the numbers are once.
export const formatMMKCompact = (amount) => formatMMKShort(amount).replace(/\s*MMK$/, '');

export const formatMMKShort = (amount) => {
  const value = amount || 0;
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M MMK';
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K MMK';
  return value + ' MMK';
};
