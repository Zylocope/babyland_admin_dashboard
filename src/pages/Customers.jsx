import { useState } from 'react';
import { IconPencil, IconTrash, IconEye, IconShoppingCart, IconStar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { mockCustomers, mockOrders } from '../data/mock';
import { useAuth } from '../context/AuthContext';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Badge from '../components/common/Badge';
import { formatMMK } from '../utils/currency';

export default function Customers() {
  const { t } = useTranslation();
  const { isManager } = useAuth();
  const [customers, setCustomers] = useState(mockCustomers);
  const [search, setSearch] = useState('');
  const [viewCustomer, setViewCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  const customerOrders = (cId) => {
    const c = customers.find(x => x.id === cId);
    return mockOrders.filter(o => o.customerName === c?.name);
  };

  const openEdit = (c) => { setEditCustomer(c); setEditForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, points: c.points }); };
  const saveEdit = () => { setCustomers(prev => prev.map(c => c.id === editCustomer.id ? { ...c, ...editForm } : c)); setEditCustomer(null); };
  const deleteCustomer = (id) => setCustomers(prev => prev.filter(c => c.id !== id));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder={t('customers.search')} />
        </div>
        <span className="text-sm text-sub">{t('customers.count', { count: filtered.length })}</span>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <th className="px-5 py-3 font-medium">{t('table.customer')}</th>
                <th className="px-4 py-3 font-medium">{t('table.phone')}</th>
                <th className="px-4 py-3 font-medium">{t('table.email')}</th>
                <th className="px-4 py-3 font-medium">{t('table.rewardPoints')}</th>
                <th className="px-4 py-3 font-medium">{t('table.orders')}</th>
                <th className="px-4 py-3 font-medium">{t('table.joined')}</th>
                <th className="px-4 py-3 font-medium">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-brand-light transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center font-semibold text-brand text-sm flex-shrink-0">
                        {c.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-ink">{c.name}</p>
                        <p className="text-xs text-mute">{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sub">{c.phone}</td>
                  <td className="px-4 py-3.5 text-sub text-xs">{c.email}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-brand font-semibold">
                      <IconStar stroke={1.5} size={13} className="fill-brand text-brand" />
                      {c.points}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-ink">{c.orderCount}</td>
                  <td className="px-4 py-3.5 text-sub">{c.joinDate}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setViewCustomer(c)} className="p-1.5 rounded-lg text-mute hover:text-[#3B82F6] hover:bg-blue-50 transition-colors" title={t('common.view')}>
                        <IconEye stroke={1.5} size={15} />
                      </button>
                      {isManager && (
                        <>
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-mute hover:text-brand hover:bg-brand-light transition-colors" title={t('common.edit')}>
                            <IconPencil stroke={1.5} size={15} />
                          </button>
                          <button onClick={() => setConfirmDelete(c)} className="p-1.5 rounded-lg text-mute hover:text-[#EF4444] hover:bg-red-50 transition-colors" title={t('common.delete')}>
                            <IconTrash stroke={1.5} size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-mute text-sm">{t('customers.none')}</div>}
        </div>
      </div>

      {/* View modal */}
      <Modal open={!!viewCustomer} onClose={() => setViewCustomer(null)} title={viewCustomer?.name} size="lg">
        {viewCustomer && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {[['table.phone', viewCustomer.phone], ['table.email', viewCustomer.email], ['table.joined', viewCustomer.joinDate], ['table.rewardPoints', viewCustomer.points]].map(([lk, v]) => (
                <div key={lk}>
                  <p className="text-xs text-sub mb-1">{t(lk)}</p>
                  <p className="font-semibold text-ink">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-sub mb-1">{t('orders.deliveryAddress')}</p>
              <p className="text-sm text-ink">{viewCustomer.address}</p>
            </div>
            <div>
              <p className="text-xs text-sub mb-2 flex items-center gap-1.5"><IconShoppingCart stroke={1.5} size={12} /> {t('customers.orderHistory')}</p>
              <div className="space-y-2">
                {customerOrders(viewCustomer.id).length === 0
                  ? <p className="text-sm text-mute">{t('customers.noOrders')}</p>
                  : customerOrders(viewCustomer.id).map(o => (
                    <div key={o.id} className="flex items-center justify-between p-3 border border-app rounded-xl">
                      <div>
                        <p className="font-mono text-xs text-brand font-semibold">{o.id}</p>
                        <p className="text-xs text-sub">{o.date} · {t('customers.items', { count: o.items.length })}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-ink text-sm">{formatMMK(o.total)}</p>
                        <Badge label={o.status} />
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title={t('customers.editTitle', { name: editCustomer?.name })}>
        {editCustomer && (
          <div className="space-y-4">
            {[['customers.name', 'name', 'text'], ['table.phone', 'phone', 'text'], ['table.email', 'email', 'email'], ['table.rewardPoints', 'points', 'number']].map(([labelKey, key, type]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-ink mb-1">{t(labelKey)}</label>
                <input type={type} value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-ink mb-1">{t('customers.address')}</label>
              <textarea value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} rows={2}
                className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditCustomer(null)} className="px-4 py-2 text-sm border border-app rounded-lg text-sub hover:bg-brand-light">{t('common.cancel')}</button>
              <button onClick={saveEdit} className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-hover font-medium">{t('common.saveChanges')}</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteCustomer(confirmDelete.id)}
        title={t('customers.deleteTitle')} message={t('customers.deleteMsg', { name: confirmDelete?.name })}
        confirmLabel={t('common.delete')} danger />
    </div>
  );
}
