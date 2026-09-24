import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconCash, IconReportMoney, IconReceipt, IconAlertTriangle, IconDatabase, IconArrowRight,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/common/StatCard';
import NotConnected from '../components/common/NotConnected';
import { formatMMK, formatMMKShort, formatMMKCompact } from '../utils/currency';
import { shopToday, shopDaysAgo, shopDayStart, formatShopTime } from '../utils/shopDay';
import { summarizeSales } from '../services/salesRollup';
import { getSaleSummary } from '../services/salesService';
import { getAllProducts } from '../services/productService';
import { needsRestock } from '../utils/stock';
import Skeleton from '../components/common/Skeleton';

const DAYS = 7;

// Orders have no read endpoint at all — the backend's order routes are
// write-only — so that section stays disconnected no matter what is in the
// database. Everything above it is live.
export default function Dashboard() {
  const { t } = useTranslation();
  const [state, setState] = useState({ status: 'loading', rows: [], products: [] });

  useEffect(() => {
    let active = true;
    const end = shopToday();
    const start = shopDaysAgo(DAYS - 1);
    Promise.all([
      getSaleSummary({ start_date: start, end_date: end }),
      getAllProducts(),
    ])
      .then(([rows, products]) => {
        if (!active) return;
        setState({
          status: 'ok',
          rows: Array.isArray(rows) ? rows : [],
          products: Array.isArray(products) ? products : [],
        });
      })
      // No fallback numbers. A failed load says so; it never borrows a zero.
      .catch(() => { if (active) setState({ status: 'error', rows: [], products: [] }); });
    return () => { active = false; };
  }, []);

  const { status, rows, products } = state;
  const s = summarizeSales(rows);
  const today = shopToday();
  const todayRow = s.by_day.find(d => d.date === today);

  const lowStock = products
    .filter(needsRestock)
    .sort((a, b) => Number(a.quantity_in_stock ?? 0) - Number(b.quantity_in_stock ?? 0));

  // A shimmer while loading and a word on failure — never a number that could
  // be mistaken for a real one.
  const show = (value) => {
    if (status === 'loading') return <Skeleton w="70%" h={24} />;
    if (status === 'error') return t('header.revenueUnavailable');
    return value;
  };

  // Every day in the window, including the quiet ones: a gap drawn as nothing
  // and a day drawn as zero are different facts.
  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = shopDaysAgo(DAYS - 1 - i);
    const row = s.by_day.find(d => d.date === date);
    return {
      date,
      label: formatShopTime(shopDayStart(date), 'MMM D'),
      // The weekday is what a shopkeeper actually reasons about — "Saturday is
      // busy" — and the date alone hides it.
      weekday: formatShopTime(shopDayStart(date), 'ddd'),
      revenue: row?.revenue_mmk ?? 0,
    };
  });
  const peak = Math.max(1, ...days.map(d => d.revenue));
  // Averaged over the days that actually traded. Including closed days would
  // drag the line down and make an ordinary day look above average.
  const traded = days.filter(d => d.revenue > 0);
  const average = traded.length ? traded.reduce((sum, d) => sum + d.revenue, 0) / traded.length : 0;
  const best = days.reduce((top, d) => (d.revenue > (top?.revenue ?? 0) ? d : top), null);

  return (
    <div className="space-y-6">
      {status === 'error' && <NotConnected>{t('dashboard.loadFailed')}</NotConnected>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={IconCash} tone="store" label={t('dashboard.storeSales')}
          value={show(formatMMKShort(todayRow?.revenue_mmk ?? 0))} />
        <StatCard icon={IconReportMoney} tone="combined" label={t('dashboard.sales7d')}
          value={show(formatMMKShort(s.totals.revenue_mmk))} />
        <StatCard icon={IconReceipt} tone="completed" label={t('dashboard.txns7d')}
          value={show(s.totals.transactions)} />
        <StatCard icon={IconAlertTriangle} tone="low" label={t('dashboard.lowStockItems')}
          value={show(lowStock.length)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 surface-card is-sheet p-6">
          <h3 className="font-semibold text-ink mb-4">{t('dashboard.revenue7d')}</h3>
          {status === 'loading' ? (
            // Seven columns the shape of the seven that are coming, at uneven
            // heights — a row of identical blocks reads as a table, not a
            // chart. The panel is already its final height when they land.
            <div className="pt-3 skeleton-row">
              <div className="flex items-end gap-1.5 sm:gap-2.5" style={{ height: 196 }}>
                {[62, 30, 54, 18, 22, 40, 26].map((h, i) => (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5">
                    <Skeleton w={34} h={9} style={{ '--i': i }} />
                    <Skeleton style={{ width: '100%', height: `${h}%`, borderRadius: '8px 8px 0 0', '--i': i }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 sm:gap-2.5 mt-2 pt-2 border-t border-app">
                {Array.from({ length: DAYS }, (_, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <Skeleton w={26} h={9} style={{ '--i': i }} />
                    <Skeleton w={34} h={8} style={{ '--i': i }} />
                  </div>
                ))}
              </div>
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
              <IconDatabase size={28} stroke={1.2} />
              {t('header.revenueUnavailable')}
            </div>
          ) : (
            // Columns, not rows. A week is seven things side by side — that is
            // how the shape of a week reads, and a stack of horizontal bars
            // made it a list you compare by scanning lengths instead.
            //
            // Still hand-drawn rather than recharts: this is the manager's
            // landing page, and pulling in a 355 kB chart library for seven
            // values would undo the route splitting that keeps it off every
            // screen except Sales and the assistant.
            <div className="pt-3">
              <div className="relative flex items-end gap-1.5 sm:gap-2.5" style={{ height: 196 }}>
                {/* Average across trading days, behind the columns. The single
                    most useful line on a weekly chart: it turns each column
                    from a number into "better or worse than usual". */}
                {average > 0 && (
                  <div className="absolute inset-x-0 flex items-center pointer-events-none z-0"
                    style={{ bottom: `${(average / peak) * 100}%` }}>
                    <span className="flex-1 border-t border-dashed" style={{ borderColor: 'var(--text-muted)', opacity: 0.45 }} />
                    <span className="pl-1.5 text-[10px] tabular-nums text-mute">
                      {t('dashboard.avg', { value: formatMMKShort(average) })}
                    </span>
                  </div>
                )}

                {days.map((d, i) => {
                  const isBest = best && d.revenue > 0 && d.date === best.date;
                  return (
                    <div key={d.date} className="relative z-10 flex-1 h-full flex flex-col justify-end items-center gap-1.5 group">
                      {/* Always drawn, never hover-only: this is used on a phone
                          at the counter, where there is no hover. */}
                      <span className={`text-[10px] tabular-nums leading-none transition-colors ${isBest ? 'font-bold text-ink' : 'text-mute'}`}>
                        {d.revenue ? formatMMKCompact(d.revenue) : '—'}
                      </span>
                      <div className="w-full flex-1 flex items-end rounded-t-lg"
                        style={{ background: 'color-mix(in srgb, var(--text-muted) 9%, transparent)' }}>
                        <div
                          className="chart-col-grow w-full rounded-t-lg"
                          title={`${d.label} · ${formatMMK(d.revenue)}`}
                          style={{
                            // A trading day never collapses to an invisible
                            // sliver — 3% keeps a quiet day distinguishable
                            // from a closed one, which is a different fact.
                            height: d.revenue ? `${Math.max(3, (d.revenue / peak) * 100)}%` : 0,
                            animationDelay: `${i * 55}ms`,
                            background: isBest
                              ? 'linear-gradient(180deg, var(--orange-primary) 0%, color-mix(in srgb, var(--orange-primary) 70%, transparent) 100%)'
                              : 'linear-gradient(180deg, color-mix(in srgb, var(--orange-primary) 62%, transparent) 0%, color-mix(in srgb, var(--orange-primary) 34%, transparent) 100%)',
                          }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-1.5 sm:gap-2.5 mt-2 pt-2 border-t border-app">
                {days.map(d => {
                  const isBest = best && d.revenue > 0 && d.date === best.date;
                  return (
                    <div key={d.date} className="flex-1 text-center leading-tight">
                      <p className={`text-[11px] ${isBest ? 'font-semibold text-brand' : 'text-sub'}`}>{d.weekday}</p>
                      <p className="text-[10px] text-mute tabular-nums">{d.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-4 surface-card is-sheet p-6">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <IconAlertTriangle size={16} stroke={1.5} className="text-[#EF4444]" /> {t('dashboard.lowStockAlerts')}
          </h3>
          {status === 'loading' ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton-row flex items-center gap-3" style={{ '--i': i }}>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton w="75%" h={13} />
                    <Skeleton w="45%" h={10} />
                  </div>
                  <Skeleton w={48} h={13} />
                </div>
              ))}
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
              <IconDatabase size={28} stroke={1.2} />
              {t('header.revenueUnavailable')}
            </div>
          ) : lowStock.length === 0 ? (
            <p className="py-12 text-center text-sm text-mute">{t('dashboard.allStocked')}</p>
          ) : (
            <>
              <div className="space-y-3">
                {lowStock.slice(0, 6).map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink truncate">{p.name}</p>
                      <p className="text-[11px] text-mute font-mono">{p.barcode}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums flex-shrink-0"
                      style={{ color: Number(p.quantity_in_stock) === 0 ? 'var(--status-cancelled)' : 'var(--status-pending)' }}>
                      {t('dashboard.left', { count: p.quantity_in_stock ?? 0 })}
                    </span>
                  </div>
                ))}
              </div>
              {/* The list is capped at six; the count above is not. Say so
                  rather than letting six read as the total. */}
              {lowStock.length > 6 && (
                <Link to="/products" className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand hover:underline">
                  {t('dashboard.viewAllLow', { count: lowStock.length })} <IconArrowRight size={14} stroke={1.8} />
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <div className="surface-card is-sheet overflow-hidden">
        <div className="px-6 py-4 border-b border-app">
          <h3 className="font-semibold text-ink">{t('dashboard.recentOrders')}</h3>
        </div>
        <div className="p-6">
          <NotConnected>{t('dashboard.ordersNotConnected')}</NotConnected>
        </div>
      </div>
    </div>
  );
}
