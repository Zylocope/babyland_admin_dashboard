const DAY = 86_400_000;
const dateMs = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return NaN;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms : NaN;
};
const iso = ms => new Date(ms).toISOString().slice(0, 10);

// Allocate chart buckets first, then sum every record into them. Chart density
// is bounded without truncating the reporting range or iterating every day.
const salesBuckets = (range, rows) => {
  const start = dateMs(range.start), end = dateMs(range.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const days = Math.round((end - start) / DAY) + 1;
  const bucketDays = days <= 31 ? 1 : days <= 210 ? 7 : Math.max(30, Math.ceil(days / 31));
  const data = Array.from({ length: Math.ceil(days / bucketDays) }, (_, i) => {
    const date = iso(start + i * bucketDays * DAY);
    const endDate = iso(Math.min(end, start + ((i + 1) * bucketDays - 1) * DAY));
    return { date, endDate, day: date.slice(5), revenue: 0, inStore: 0, online: 0 };
  });
  for (const row of rows) {
    const day = dateMs(row.date);
    if (!Number.isFinite(day) || day < start || day > end) continue;
    const bucket = data[Math.floor((day - start) / DAY / bucketDays)];
    bucket.revenue += Number(row.revenue_mmk ?? 0);
    bucket.inStore += Number(row.in_store_mmk ?? 0);
    bucket.online += Number(row.online_mmk ?? 0);
  }
  return { data, bucketDays, granularity: bucketDays === 1 ? 'day' : bucketDays === 7 ? 'week' : 'interval' };
};

export const chartFromTool = (tool, result) => {
  if (!result || result.error) return null;
  const meta = { tool, range: result.range, titleKey: `aiChart.titles.${tool}` };
  if (tool === 'sales_summary') {
    if (!result.range || !result.by_day?.length) return null;
    const buckets = salesBuckets(result.range, result.by_day);
    if (!buckets || buckets.data.length < 2) return null;
    return { ...meta, kind: 'sales', ...buckets, hasOnline: buckets.data.some(d => d.online !== 0) };
  }
  if (tool === 'compare_periods') {
    const { current: c, previous: p } = result;
    if (!c || !p) return null;
    return { ...meta, kind: 'compare', currentRange: c.range, previousRange: p.range,
      data: [
        { metric: 'revenue', previous: p.revenue_mmk, current: c.revenue_mmk },
        { metric: 'profit', previous: p.profit_mmk, current: c.profit_mmk },
      ] };
  }
  if (tool === 'sales_by_weekday') {
    const rows = result.by_weekday ?? [];
    if (rows.filter(d => d.revenue_mmk > 0).length < 2) return null;
    return { ...meta, kind: 'bars', unit: 'mmk', categorical: false,
      metricKey: 'posDash.revenue',
      data: rows.map(d => ({ label: d.weekday.slice(0, 3), fullLabel: d.weekday, value: d.revenue_mmk })) };
  }
  if (tool === 'stock_by_category') {
    const rows = result.categories ?? [];
    if (rows.length < 2) return null;
    const allData = rows.map(c => ({ label: c.category, value: c.retail_value_mmk }));
    return { ...meta, kind: 'bars', unit: 'mmk', categorical: true,
      metricKey: 'aiChart.retailValue', data: allData.slice(0, 8), allData, totalCount: rows.length };
  }
  if (tool === 'low_stock') {
    const products = result.products ?? [];
    if (!products.length) return null;
    const allData = products.map(p => ({ name: p.name, stock: p.stock }));
    return { ...meta, kind: 'stock', data: allData.slice(0, 8), allData,
      totalCount: result.low_stock_count ?? products.length, threshold: result.threshold };
  }
  return null;
};
