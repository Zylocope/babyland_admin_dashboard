import { useState } from 'react';
import { IconPlus, IconPencil, IconCircleX, IconCalendarEvent } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { mockTickets, mockBookingSlots, ticketPrice as INITIAL_PRICE } from '../data/mock';
import { formatMMK } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function Tickets() {
  const { t: tr } = useTranslation();
  const { isManager } = useAuth();
  const [tickets, setTickets] = useState(mockTickets);
  const [slots, setSlots] = useState(mockBookingSlots);
  const [price, setPrice] = useState(INITIAL_PRICE);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [newTicket, setNewTicket] = useState({ customerName: '', phone: '', visitDate: '', qty: 1 });
  const [newPrice, setNewPrice] = useState(price);

  const filtered = tickets.filter(t => {
    const matchSearch = t.id.includes(search) || t.customerName.toLowerCase().includes(search.toLowerCase()) || t.phone.includes(search);
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const createWalkIn = () => {
    const id = `TKT-WALKIN-${Date.now()}`;
    const ticket = {
      id, customerName: newTicket.customerName || 'Walk-in Customer', phone: newTicket.phone || '-',
      visitDate: newTicket.visitDate, qty: newTicket.qty, amount: newTicket.qty * price,
      status: 'Confirmed', type: 'Walk-in',
    };
    setTickets(prev => [ticket, ...prev]);
    setShowCreateModal(false);
    setNewTicket({ customerName: '', phone: '', visitDate: '', qty: 1 });
  };

  const cancelTicket = (id) => setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'Cancelled' } : t));

  const toggleSlot = (date) => setSlots(prev => prev.map(s => s.date === date ? { ...s, open: !s.open } : s));

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder={tr('tickets.search')} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-app rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-brand">
          <option value="All">{tr('common.allStatuses')}</option>
          {['Confirmed', 'Used', 'Cancelled'].map(s => <option key={s} value={s}>{tr(`badge.${s}`)}</option>)}
        </select>
        <span className="text-sm text-sub">{tr('tickets.count', { count: filtered.length })}</span>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {isManager && (
            <>
              <button onClick={() => { setNewPrice(price); setShowPriceModal(true); }}
                className="px-3 py-2 text-sm border border-app rounded-lg bg-card text-sub hover:bg-brand-light flex items-center gap-2 transition-colors">
                <IconPencil stroke={1.5} size={14} /> {tr('tickets.ticketPrice', { price: formatMMK(price) })}
              </button>
              <button onClick={() => setShowSlotsModal(true)}
                className="px-3 py-2 text-sm border border-app rounded-lg bg-card text-sub hover:bg-brand-light flex items-center gap-2 transition-colors">
                <IconCalendarEvent stroke={1.5} size={14} /> {tr('tickets.manageSlots')}
              </button>
            </>
          )}
          <button onClick={() => setShowCreateModal(true)}
            className="px-3 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-hover flex items-center gap-2 font-medium transition-colors">
            <IconPlus stroke={1.5} size={14} /> {tr('tickets.walkIn')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <th className="px-5 py-3 font-medium">{tr('table.bookingId')}</th>
                <th className="px-4 py-3 font-medium">{tr('table.customer')}</th>
                <th className="px-4 py-3 font-medium">{tr('table.phone')}</th>
                <th className="px-4 py-3 font-medium">{tr('table.visitDate')}</th>
                <th className="px-4 py-3 font-medium">{tr('table.qty')}</th>
                <th className="px-4 py-3 font-medium">{tr('table.amountPaid')}</th>
                <th className="px-4 py-3 font-medium">{tr('table.type')}</th>
                <th className="px-4 py-3 font-medium">{tr('table.status')}</th>
                {isManager && <th className="px-4 py-3 font-medium">{tr('table.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-brand-light transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-brand font-semibold">{t.id}</td>
                  <td className="px-4 py-3.5 font-medium text-ink">{t.customerName}</td>
                  <td className="px-4 py-3.5 text-sub">{t.phone}</td>
                  <td className="px-4 py-3.5 text-ink">{t.visitDate}</td>
                  <td className="px-4 py-3.5 text-ink">{t.qty}</td>
                  <td className="px-4 py-3.5 font-semibold text-ink">{formatMMK(t.amount)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.type === 'Walk-in' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5"><Badge label={t.status} /></td>
                  {isManager && (
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {t.status === 'Confirmed' && (
                          <button onClick={() => setConfirmCancel(t)} className="p-1.5 rounded-lg text-mute hover:text-[#EF4444] hover:bg-red-50 transition-colors" title={tr('orders.cancel')}>
                            <IconCircleX stroke={1.5} size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-mute text-sm">{tr('tickets.none')}</div>}
        </div>
      </div>

      {/* Create walk-in modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title={tr('tickets.createTitle')} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">{tr('tickets.customerName')}</label>
            <input value={newTicket.customerName} onChange={e => setNewTicket(f => ({ ...f, customerName: e.target.value }))} placeholder="Walk-in Customer"
              className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">{tr('table.phone')}</label>
            <input value={newTicket.phone} onChange={e => setNewTicket(f => ({ ...f, phone: e.target.value }))} placeholder={tr('tickets.optional')}
              className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">{tr('tickets.visitDate')} <span className="text-red-400">*</span></label>
            <input type="date" value={newTicket.visitDate} onChange={e => setNewTicket(f => ({ ...f, visitDate: e.target.value }))} required
              className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">{tr('tickets.quantity')}</label>
            <input type="number" min={1} value={newTicket.qty} onChange={e => setNewTicket(f => ({ ...f, qty: +e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div className="bg-brand-light rounded-xl px-4 py-3 text-sm font-semibold text-brand">
            {tr('tickets.totalLabel', { amount: formatMMK(newTicket.qty * price) })}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm border border-app rounded-lg text-sub hover:bg-brand-light">{tr('common.cancel')}</button>
            <button onClick={createWalkIn} disabled={!newTicket.visitDate}
              className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-hover font-medium disabled:opacity-50">{tr('tickets.createTicket')}</button>
          </div>
        </div>
      </Modal>

      {/* Set price modal */}
      {isManager && (
        <Modal open={showPriceModal} onClose={() => setShowPriceModal(false)} title={tr('tickets.setPriceTitle')} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">{tr('tickets.pricePerTicket')}</label>
              <input type="number" value={newPrice} onChange={e => setNewPrice(+e.target.value)}
                className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowPriceModal(false)} className="px-4 py-2 text-sm border border-app rounded-lg text-sub hover:bg-brand-light">{tr('common.cancel')}</button>
              <button onClick={() => { setPrice(newPrice); setShowPriceModal(false); }}
                className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-hover font-medium">{tr('tickets.savePrice')}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Manage slots modal */}
      {isManager && (
        <Modal open={showSlotsModal} onClose={() => setShowSlotsModal(false)} title={tr('tickets.slotsTitle')}>
          <div className="space-y-3">
            {slots.map(s => (
              <div key={s.date} className="flex items-center justify-between p-4 border border-app rounded-xl">
                <div>
                  <p className="font-medium text-ink">{s.date}</p>
                  <p className="text-xs text-sub mt-0.5">{tr('tickets.booked', { booked: s.booked, max: s.maxCapacity })}</p>
                </div>
                <button onClick={() => toggleSlot(s.date)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.open ? 'bg-brand' : 'bg-app'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform ${s.open ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      <ConfirmDialog open={!!confirmCancel} onClose={() => setConfirmCancel(null)}
        onConfirm={() => cancelTicket(confirmCancel.id)}
        title={tr('tickets.cancelTitle')} message={tr('tickets.cancelMsg', { id: confirmCancel?.id })} confirmLabel={tr('tickets.cancelBooking')} danger />
    </div>
  );
}
