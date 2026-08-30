// Turns a tool result into a chart spec.
//
// The model is never asked to describe a chart — it would cost another round
// trip and it could get the numbers wrong. Instead the visual is derived from
// the same tool result the answer was written from, so the picture and the text
// can never disagree, and the instant chips get charts for free.

// summarizeSales only emits days that had sales, so a quiet month collapses to
// one point. Pad across the whole requested range: a day with no sales is a
// real zero, and the flat stretch is itself information.
const padRange = (range, byDay) => {
  const rows = new Map(byDay.map(d => [d.date, d]));
  const start = new Date(`${range.start}T00:00:00Z`);
  const end = new Date(`${range.end}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  const out = [];
  for (let d = new Date(start); d <= end && out.length < 366; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const row = rows.get(key);
    out.push({
      date: key,
      day: key.slice(5),
      revenue: row?.revenue_mmk ?? 0,
      inStore: row?.in_store_mmk ?? 0,
      online: row?.online_mmk ?? 0,
    });
  }
  return out;
};

export const chartFromTool = (toolName, result) => {
  if (!result || result.error) return null;

  if (toolName === 'sales_summary') {
    if (!result.range || !result.by_day?.length) return null;
    const data = padRange(result.range, result.by_day);
    if (data.length < 2) return null;
    return { kind: 'sales', data, hasOnline: data.some(d => d.online > 0) };
  }

  if (toolName === 'compare_periods') {
    const { current: c, previous: p } = result;
    if (!c || !p) return null;
    return {
      kind: 'compare',
      // Revenue and profit share a scale; transaction counts do not, so they
      // stay in the text answer rather than squashing the bars.
      data: [
        { metric: 'revenue', previous: p.revenue_mmk, current: c.revenue_mmk },
        { metric: 'profit', previous: p.profit_mmk, current: c.profit_mmk },
      ],
    };
  }

  if (toolName === 'sales_by_weekday') {
    const rows = (result.by_weekday ?? []).filter(d => d.revenue_mmk > 0);
    if (rows.length < 2) return null;
    return {
      kind: 'bars',
      unit: 'mmk',
      data: (result.by_weekday ?? []).map(d => ({ label: d.weekday.slice(0, 3), value: d.revenue_mmk })),
    };
  }

  if (toolName === 'stock_by_category') {
    const rows = result.categories ?? [];
    if (rows.length < 2) return null;
    return {
      kind: 'bars',
      unit: 'mmk',
      data: rows.slice(0, 8).map(c => ({ label: c.category, value: c.retail_value_mmk })),
    };
  }

  if (toolName === 'low_stock') {
    const products = result.products ?? [];
    if (!products.length) return null;
    return {
      kind: 'stock',
      // Longest bars first reads better, and long Burmese names need truncating.
      data: products.slice(0, 8).map(p => ({
        name: p.name.length > 22 ? `${p.name.slice(0, 21)}…` : p.name,
        stock: p.stock,
      })),
    };
  }

  return null;
};
