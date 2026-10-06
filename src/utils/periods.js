// Report periods shared by the Sales and Playground pages.
//
// Every date here is a shop calendar day ('YYYY-MM-DD', Asia/Yangon), so the
// arithmetic is done on the calendar in UTC and never touches the device clock.
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

export const PERIOD_KEYS = ['today', 'week', 'd30', 'year', 'y3'];

const day = (s) => dayjs.utc(s);
const fmt = (d) => d.format('YYYY-MM-DD');

// A month is chosen as 'YYYY-MM'; everything else is one of PERIOD_KEYS.
export const isMonth = (period) => /^\d{4}-\d{2}$/.test(period);

export const periodRange = (period, today) => {
  const t = day(today);
  if (isMonth(period)) {
    const first = day(`${period}-01`);
    const last = first.endOf('month');
    return { start: fmt(first), end: fmt(last.isAfter(t) ? t : last) };
  }
  switch (period) {
    case 'today': return { start: today, end: today };
    case 'd30': return { start: fmt(t.subtract(29, 'day')), end: today };
    case 'year': return { start: `${t.year()}-01-01`, end: today };
    case 'y3': return { start: fmt(t.subtract(3, 'year').add(1, 'day')), end: today };
    case 'week':
    default: return { start: fmt(t.subtract(6, 'day')), end: today };
  }
};

// The month of the shop's first recorded sale. Months before it hold no data,
// so the picker does not offer them.
export const FIRST_MONTH = '2026-06';

// Newest first, from the current month back to the shop's first month, and no
// more than `max` months so the dropdown stays a usable length. It grows on its
// own as months pass; future months never appear.
export const monthOptions = (today, { since = FIRST_MONTH, max = 36 } = {}) => {
  const out = [];
  for (let m = day(today).startOf('month'); out.length < max && m.format('YYYY-MM') >= since; m = m.subtract(1, 'month')) {
    out.push(m.format('YYYY-MM'));
  }
  return out;
};

// A chart point per day up to two months, a point per month beyond that: a year
// of daily bars is 365 slivers nobody can read.
export const chartBuckets = (start, end) => {
  const from = day(start);
  const to = day(end);
  if (to.diff(from, 'day') <= 62) {
    const days = to.diff(from, 'day') + 1;
    return { unit: 'day', keys: Array.from({ length: days }, (_, i) => fmt(from.add(i, 'day'))) };
  }
  const keys = [];
  for (let m = from.startOf('month'); !m.isAfter(to, 'month'); m = m.add(1, 'month')) keys.push(m.format('YYYY-MM'));
  return { unit: 'month', keys };
};

// The bucket a shop day falls into.
export const bucketOf = (date, unit) => (unit === 'month' ? date.slice(0, 7) : date);
