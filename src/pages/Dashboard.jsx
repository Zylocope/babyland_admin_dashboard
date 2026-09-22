import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconCash, IconReportMoney, IconReceipt, IconAlertTriangle, IconDatabase, IconArrowRight,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/common/StatCard';
import NotConnected from '../components/common/NotConnected';
import { formatMMK, formatMMKShort } from '../utils/currency';
import { shopToday, shopDaysAgo, shopDayStart, formatShopTime } from '../utils/shopDay';
import { summarizeSales } from '../services/salesRollup';
import { getSaleSummary } from '../services/salesService';
import { getAllProducts } from '../services/productService';
import { needsRestock } from '../utils/stock';

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

  // A dash while loading and a word on failure — never a number that could be
  // mistaken for a real one.
  const show = (value) => {
    if (status === 'loading') return '—';
    if (status === 'error') return t('header.revenueUnavailable');
    return value;
  };

  // Every day in the window, including the quiet ones: a gap drawn as nothing
  // and a day drawn as zero are different facts.
  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = shopDaysAgo(DAYS - 1 - i);
    const row = s.by_day.find(d => d.date === date);
    return { date, label: formatShopTime(shopDayStart(date), 'MMM D'), revenue: row?.revenue_mmk ?? 0 };
  });
  const peak = Math.max(1, ...days.map(d => d.revenue));

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
          {status !== 'ok' ? (
            <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
              <IconDatabase size={28} stroke={1.2} />
              {status === 'error' ? t('header.revenueUnavailable') : '—'}
            </div>
          ) : (
            // Plain bars rather than recharts: this is the manager's landing
            // page, and pulling in a 355 kB chart library for seven values
            // would undo the route splitting that keeps it off every screen
            // except Sales and the assistant.
            <div className="space-y-2.5">
              {days.map(d => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="w-14 flex-shrink-0 text-[11px] text-mute tabular-nums">{d.label}</span>
                  <div className="flex-1 h-5 rounded-md bg-app overflow-hidden">
                    <div className="h-full rounded-md transition-all"
                      style={{ width: `${(d.revenue / peak) * 100}%`, background: 'var(--orange-primary)' }} />
                  </div>
                  <span className="w-24 flex-shrink-0 text-right text-[12px] text-ink font-medium tabular-nums">
                    {d.revenue ? formatMMK(d.revenue) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-4 surface-card is-sheet p-6">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <IconAlertTriangle size={16} stroke={1.5} className="text-[#EF4444]" /> {t('dashboard.lowStockAlerts')}
          </h3>
          {status !== 'ok' ? (
            <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
              <IconDatabase size={28} stroke={1.2} />
              {status === 'error' ? t('header.revenueUnavailable') : '—'}
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
