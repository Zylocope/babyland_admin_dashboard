import { useCallback, useEffect, useState } from 'react';
import {
  IconDatabase, IconChevronLeft, IconChevronRight, IconTruck, IconExternalLink,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../utils/currency';
import { formatShopTime } from '../utils/shopDay';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { SkeletonRows, Skeleton } from '../components/common/Skeleton';
import {
  getOrders, getOrderDetail, advanceOrderStatus, nextStatus, ORDER_STATUSES,
} from '../services/orderService';

const PAGE_SIZE = 20;

// Status colours borrowed from the shared tokens rather than invented here, so
// an order badge means the same thing as every other status badge in the app.
const STATUS_TONE = {
  pending: 'var(--status-pending)',
  on_delivery: 'var(--status-processing)',
  received: 'var(--status-delivered)',
};

function StatusBadge({ status, t }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap"
      style={{ color: STATUS_TONE[status] ?? 'var(--text-secondary)' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
      {t(`orderStatus.${status}`, status)}
    </span>
  );
}

export default function Orders() {
  const { t } = useTranslation();
  const { isManager } = useAuth();

  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ key: '', rows: [], total: 0, pages: 1, error: '' });
  const [reloadKey, setReloadKey] = useState(0);

  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState({ id: null, status: 'loading', order: null });
  const [advancing, setAdvancing] = useState(null);

  const requestKey = `${status}|${page}|${reloadKey}`;
  const loading = state.key !== requestKey;

  useEffect(() => {
    let active = true;
    getOrders({ status, page, page_size: PAGE_SIZE })
      .then(res => {
        if (!active) return;
        setState({
          key: requestKey,
          rows: Array.isArray(res?.data) ? res.data : [],
          total: Number(res?.total_items ?? 0) || 0,
          pages: Math.max(1, Number(res?.total_pages ?? 1) || 1),
          error: '',
        });
      })
      .catch(err => {
        if (!active) return;
        setState({ key: requestKey, rows: [], total: 0, pages: 1, error: err?.message || t('orders.loadFailed') });
      });
    return () => { active = false; };
  }, [status, page, requestKey, t]);

  // Same pattern as the receipt dialog: the id rides with the state so opening
  // a second order shows a skeleton by comparison rather than briefly showing
  // the previous order's items under the new one's heading.
  useEffect(() => {
    if (!openId) return;
    let active = true;
    getOrderDetail(openId)
      .then(order => { if (active) setDetail({ id: openId, status: 'ok', order }); })
      .catch(() => { if (active) setDetail({ id: openId, status: 'error', order: null }); });
    return () => { active = false; };
  }, [openId]);

  const open = detail.id === openId ? detail : { status: 'loading', order: null };
  const order = open.order;

  const pickStatus = (value) => { setStatus(value); setPage(1); };
  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  const { rows, total, pages, error } = state;

  const filters = ['All', ...ORDER_STATUSES];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map(value => (
            <button key={value} type="button" onClick={() => pickStatus(value)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                status === value ? 'border-brand text-brand bg-brand-light' : 'border-app text-sub hover:border-brand'}`}>
              {value === 'All' ? t('common.all', 'All') : t(`orderStatus.${value}`, value)}
            </button>
          ))}
        </div>
        <span className="text-sm text-sub ml-auto">
          {loading ? '…' : t('orders.count', { count: total })}
        </span>
      </div>

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="surface-card is-sheet overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <th className="px-5 py-3 font-medium">{t('table.orderId')}</th>
                <th className="px-4 py-3 font-medium">{t('table.customer')}</th>
                <th className="px-4 py-3 font-medium">{t('table.date')}</th>
                <th className="px-4 py-3 font-medium">{t('table.amount')}</th>
                <th className="px-4 py-3 font-medium">{t('table.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {loading && <SkeletonRows rows={8} cols={['45%', '60%', '55%', '40%', '50%']} />}
              {!loading && rows.map(o => (
                <tr key={o.id} onClick={() => setOpenId(o.id)}
                  className="hover:bg-brand-light transition-colors cursor-pointer">
                  <td className="px-5 py-3.5 font-mono text-xs text-brand">{o.id.slice(0, 8)}</td>
                  {/* An order placed without a name is a fact, not a blank cell. */}
                  <td className="px-4 py-3.5 text-ink">{o.customer || t('orders.noCustomer')}</td>
                  <td className="px-4 py-3.5 text-sub tabular-nums whitespace-nowrap">
                    {formatShopTime(o.created_at, 'YYYY-MM-DD HH:mm')}
                  </td>
                  <td className="px-4 py-3.5 text-ink font-medium tabular-nums">{formatMMK(Number(o.total_amount))}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={o.delivery_status} t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
              <IconDatabase size={28} stroke={1.2} />
              {t('orders.none')}
            </div>
          )}
        </div>
      </div>

      {/* Narrow screens get records, not a horizontally scrolling miniature
          table — the same trade the Products list makes. Five columns is where
          a table stops being readable on a phone. */}
      <div className="lg:hidden space-y-2.5">
        {loading ? Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="surface-card is-sheet p-4 space-y-3">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
            <div className="skeleton h-8 w-full rounded-lg" />
          </div>
        )) : rows.map(o => (
          <article key={o.id} onClick={() => setOpenId(o.id)}
            className="surface-card is-sheet p-4 cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-brand-light flex items-center justify-center flex-shrink-0">
                <IconTruck stroke={1.5} size={19} className="text-brand" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-ink truncate">{o.customer || t('orders.noCustomer')}</p>
                <p className="mt-1 font-mono text-[11px] text-mute">{o.id.slice(0, 8)}</p>
              </div>
              <StatusBadge status={o.delivery_status} t={t} />
            </div>

            <dl className="grid grid-cols-2 gap-3 py-3.5 mt-3 border-t border-app">
              <div className="min-w-0">
                <dt className="text-[10px] uppercase tracking-wide text-mute">{t('table.date')}</dt>
                <dd className="mt-1 text-xs font-medium text-ink tabular-nums truncate">
                  {formatShopTime(o.created_at, 'YYYY-MM-DD HH:mm')}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-[10px] uppercase tracking-wide text-mute">{t('table.amount')}</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-ink whitespace-nowrap">
                  {formatMMK(Number(o.total_amount))}
                </dd>
              </div>
            </dl>
          </article>
        ))}
        {!loading && rows.length === 0 && (
          <div className="surface-card is-sheet flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
            <IconDatabase size={28} stroke={1.2} />
            {t('orders.none')}
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-app rounded-lg text-sub hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            <IconChevronLeft size={15} stroke={1.8} /> {t('products.prev')}
          </button>
          <span className="text-sm text-sub">{t('products.pageOf', { page, total: pages })}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-app rounded-lg text-sub hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            {t('products.next')} <IconChevronRight size={15} stroke={1.8} />
          </button>
        </div>
      )}

      <Modal open={!!openId} onClose={() => setOpenId(null)} title={t('orders.detailTitle')} size="md">
        {open.status === 'loading' && (
          <div className="space-y-3 skeleton-row">
            <Skeleton w="50%" h={12} />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} style={{ width: '100%', height: 14, '--i': i }} />
            ))}
          </div>
        )}
        {open.status === 'error' && (
          <p role="alert" className="py-8 text-center text-sm text-mute">{t('orders.detailFailed')}</p>
        )}
        {open.status === 'ok' && order && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-sub">
              <span className="font-mono">{order.id.slice(0, 8)}</span>
              <span className="tabular-nums">{formatShopTime(order.created_at, 'YYYY-MM-DD HH:mm')}</span>
              <StatusBadge status={order.delivery_status} t={t} />
            </div>

            <div>
              <p className="text-[12px] text-sub">{t('customers.address')}</p>
              <p className="text-sm text-ink mt-0.5">{order.shipping_address?.address_line_1 || '—'}</p>
              <p className="text-sm text-sub tabular-nums">{order.shipping_address?.phone_number || '—'}</p>
            </div>

            <div className="rounded-2xl px-4 py-3 space-y-2"
              style={{ background: 'color-mix(in srgb, var(--text-muted) 8%, transparent)' }}>
              {(order.items ?? []).map(item => (
                <div key={item.id} className="flex justify-between gap-4 text-[13px]">
                  <span className="text-sub min-w-0 truncate">
                    {item.product_name} <span className="text-mute tabular-nums">×{item.quantity}</span>
                  </span>
                  <span className="tabular-nums text-ink flex-shrink-0">
                    {formatMMK(Number(item.selling_price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {order.order_tracking_url && (
              <a href={order.order_tracking_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-brand hover:underline">
                <IconExternalLink size={15} stroke={1.7} /> {t('orders.tracking')}
              </a>
            )}

            {/* Every status change, oldest first — who moved it and when. */}
            {(order.status_history?.length ?? 0) > 0 && (
              <div>
                <p className="text-[12px] text-sub mb-2">{t('orders.history')}</p>
                <div className="space-y-1.5">
                  {order.status_history.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 text-[12px]">
                      <StatusBadge status={entry.status} t={t} />
                      <span className="text-mute tabular-nums">
                        {formatShopTime(entry.created_at, 'YYYY-MM-DD HH:mm')}
                      </span>
                      {entry.changed_by && <span className="text-mute truncate">{entry.changed_by}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isManager && nextStatus(order.delivery_status) && (
              <button type="button" onClick={() => setAdvancing(order)}
                className="press-spring w-full py-3 rounded-2xl bg-brand text-white font-medium hover:bg-brand-hover transition-colors cursor-pointer inline-flex items-center justify-center gap-2">
                <IconTruck size={17} stroke={1.7} />
                {t('orders.advanceTo', { status: t(`orderStatus.${nextStatus(order.delivery_status)}`) })}
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* The server derives the next status from the current one and takes no
          status in the body, so a double click advances twice. Asking first is
          the guard. */}
      <ConfirmDialog
        open={!!advancing} onClose={() => setAdvancing(null)}
        title={t('orders.advanceTitle')}
        message={t('orders.advanceMsg', {
          status: advancing ? t(`orderStatus.${nextStatus(advancing.delivery_status)}`) : '',
        })}
        onConfirm={async () => {
          const target = advancing;
          if (!target) return;
          try {
            await advanceOrderStatus(target.id);
            setOpenId(null);
            reload();
          } catch (err) {
            setState(s => ({ ...s, error: err?.message || t('orders.advanceFailed') }));
          }
        }}
      />
    </div>
  );
}
