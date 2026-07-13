export const formatMMK = (amount) =>
  new Intl.NumberFormat('en-US').format(amount || 0) + ' MMK';

export const formatMMKShort = (amount) => {
  const value = amount || 0;
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M MMK';
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K MMK';
  return value + ' MMK';
};
