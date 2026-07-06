import { useState } from 'react';
import { IconEye, IconChevronRight, IconCircleX, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { mockOrders } from '../data/mock';
import { formatMMK } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';

const STATUS_FLOW = ['Pending', 'Processing', 'Shipped', 'Delivered'];

export default function Orders() {
  const { t } = useTranslation();
  const { isManager } = useAuth();
  const [orders, setOrders] = useState(mockOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewOrder, setViewOrder] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [confirmRefund, setConfirmRefund] = useState(null);

  const filtered = orders.filter(o => {
    const matchSearch = o.id.includes(search) || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.phone.includes(search);
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const advanceStatus = (id) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const idx = STATUS_FLOW.indexOf(o.status);
      if (idx < STATUS_FLOW.length - 1) return { ...o, status: STATUS_FLOW[idx + 1] };
      return o;
    }));
  };

  const cancelOrder = (id) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Cancelled' } : o));
  const refundOrder = (id) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Refunded' } : o));

  const canAdvance = (status) => STATUS_FLOW.includes(status) && status !== 'Delivered';

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder={t('orders.search')} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-app rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-brand">
          <option value="All">{t('common.allStatuses')}</option>
          {[...STATUS_FLOW, 'Cancelled', 'Refunded'].map(s => <option key={s} value={s}>{t(`badge.${s}`)}</option>)}
        </select>
        <span className="text-sm text-sub">{t('orders.count', { count: filtered.length })}</span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-app overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <th className="px-5 py-3 font-medium">{t('table.orderId')}</th>
                <th className="px-4 py-3 font-medium">{t('table.customer')}</th>
                <th className="px-4 py-3 font-medium">{t('table.phone')}</th>
                <th className="px-4 py-3 font-medium">{t('table.date')}</th>
                <th className="px-4 py-3 font-medium">{t('table.total')}</th>
                <th className="px-4 py-3 font-medium">{t('table.status')}</th>
                <th className="px-4 py-3 font-medium">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-brand-light transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-brand font-semibold">{o.id}</td>
                  <td className="px-4 py-3.5 font-medium text-ink">{o.customerName}</td>
                  <td className="px-4 py-3.5 text-sub">{o.phone}</td>
                  <td className="px-4 py-3.5 text-sub">{o.date}</td>
                  <td className="px-4 py-3.5 font-semibold text-ink">{formatMMK(o.total)}</td>
                  <td className="px-4 py-3.5"><Badge label={o.status} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setViewOrder(o)} className="p-1.5 rounded-lg text-mute hover:text-[#3B82F6] hover:bg-blue-50 transition-colors" title={t('common.view')}>
                        <IconEye stroke={1.5} size={15} />
                      </button>
                      {canAdvance(o.status) && (
                        <button onClick={() => advanceStatus(o.id)} className="p-1.5 rounded-lg text-mute hover:text-brand hover:bg-brand-light transition-colors" title={t('orders.advance')}>
                          <IconChevronRight stroke={1.5} size={15} />
                        </button>
                      )}
                      {isManager && o.status !== 'Cancelled' && o.status !== 'Refunded' && (
                        <>
                          <button onClick={() => setConfirmCancel(o)} className="p-1.5 rounded-lg text-mute hover:text-[#EF4444] hover:bg-red-50 transition-colors" title={t('orders.cancel')}>
                            <IconCircleX stroke={1.5} size={15} />
                          </button>
                          {o.status === 'Delivered' && (
                            <button onClick={() => setConfirmRefund(o)} className="p-1.5 rounded-lg text-mute hover:text-brand hover:bg-brand-light transition-colors" title={t('orders.refund')}>
                              <IconRefresh stroke={1.5} size={15} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-mute text-sm">{t('orders.none')}</div>}
        </div>
      </div>

      {/* View order modal */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={t('orders.orderTitle', { id: viewOrder?.id })} size="lg">
        {viewOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-sub mb-1">{t('table.customer')}</p>
                <p className="font-semibold text-ink">{viewOrder.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-sub mb-1">{t('table.phone')}</p>
                <p className="font-semibold text-ink">{viewOrder.phone}</p>
              </div>
              <div>
                <p className="text-xs text-sub mb-1">{t('table.date')}</p>
                <p className="font-semibold text-ink">{viewOrder.date}</p>
              </div>
              <div>
                <p className="text-xs text-sub mb-1">{t('table.status')}</p>
                <Badge label={viewOrder.status} />
              </div>
            </div>
            <div>
              <p className="text-xs text-sub mb-1">{t('orders.deliveryAddress')}</p>
              <p className="text-sm text-ink">{viewOrder.address}</p>
            </div>
            <div>
              <p className="text-xs text-sub mb-2">{t('orders.itemsOrdered')}</p>
              <div className="border border-app rounded-xl overflow-hidden">
                <table className="w-full text-[15px]">
                  <thead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">{t('table.item')}</th>
                      <th className="px-4 py-2 text-right font-medium">{t('table.qty')}</th>
                      <th className="px-4 py-2 text-right font-medium">{t('table.price')}</th>
                      <th className="px-4 py-2 text-right font-medium">{t('orders.subtotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app">
                    {viewOrder.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-ink">{item.name}</td>
                        <td className="px-4 py-2.5 text-right text-sub">{item.qty}</td>
                        <td className="px-4 py-2.5 text-right text-sub">{formatMMK(item.price)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-ink">{formatMMK(item.qty * item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-app bg-base">
                    <tr>
                      <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-ink">{t('table.total')}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-brand">{formatMMK(viewOrder.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            {/* Status advance */}
            {canAdvance(viewOrder.status) && (
              <div className="flex justify-end pt-2">
                <button onClick={() => { advanceStatus(viewOrder.id); setViewOrder(o => ({ ...o, status: STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1] })); }}
                  className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-hover font-medium flex items-center gap-2">
                  <IconChevronRight stroke={1.5} size={16} /> {t('orders.moveTo', { status: t(`badge.${STATUS_FLOW[STATUS_FLOW.indexOf(viewOrder.status) + 1]}`) })}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirmCancel} onClose={() => setConfirmCancel(null)}
        onConfirm={() => cancelOrder(confirmCancel.id)}
        title={t('orders.cancelTitle')} message={t('orders.cancelMsg', { id: confirmCancel?.id })}
        confirmLabel={t('orders.cancelOrder')} danger />

      <ConfirmDialog open={!!confirmRefund} onClose={() => setConfirmRefund(null)}
        onConfirm={() => refundOrder(confirmRefund.id)}
        title={t('orders.refundTitle')} message={t('orders.refundMsg', { id: confirmRefund?.id, amount: confirmRefund ? formatMMK(confirmRefund.total) : '' })}
        confirmLabel={t('orders.issueRefund')} />
    </div>
  );
}
