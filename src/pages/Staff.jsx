import { useState } from 'react';
import { IconPlus, IconPencil, IconTrash, IconUserCog } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { mockStaff } from '../data/mock';
import Badge from '../components/common/Badge';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';

const EMPTY_FORM = { username: '', name: '', role: 'SaleStaff', email: '', phone: '', password: '' };

export default function Staff() {
  const { t } = useTranslation();
  const [staff, setStaff] = useState(mockStaff);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editStaff, setEditStaff] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.username.includes(search) || s.email.includes(search)
  );

  const openCreate = () => { setForm(EMPTY_FORM); setShowCreate(true); };
  const openEdit = (s) => { setEditStaff(s); setForm({ username: s.username, name: s.name, role: s.role, email: s.email, phone: s.phone, password: '' }); };

  const saveCreate = () => {
    setStaff(prev => [...prev, { id: `S${Date.now()}`, ...form, createdAt: new Date().toISOString().slice(0, 10) }]);
    setShowCreate(false);
  };

  const saveEdit = () => {
    setStaff(prev => prev.map(s => s.id === editStaff.id ? { ...s, ...form } : s));
    setEditStaff(null);
  };

  const deleteStaff = (id) => setStaff(prev => prev.filter(s => s.id !== id));

  const StaffForm = ({ onSave, onCancel, isCreate }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[['staff.fullName', 'name', 'text'], ['table.username', 'username', 'text'], ['table.email', 'email', 'email'], ['table.phone', 'phone', 'text']].map(([lk, k, type]) => (
          <div key={k}>
            <label className="block text-xs font-medium text-ink mb-1">{t(lk)}</label>
            <input type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs font-medium text-ink mb-1">{t('table.role')}</label>
        <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-app rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-brand">
          <option value="SaleStaff">{t('roles.SaleStaff')}</option>
          <option value="TicketStaff">{t('roles.TicketStaff')}</option>
          <option value="Manager">{t('roles.Manager')}</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink mb-1">{isCreate ? t('staff.password') : t('staff.newPassword')}</label>
        <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          placeholder={isCreate ? t('staff.setPassword') : t('staff.keepPassword')}
          className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-app rounded-lg text-sub hover:bg-brand-light">{t('common.cancel')}</button>
        <button onClick={onSave} className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-hover font-medium">
          {isCreate ? t('staff.createAccount') : t('common.saveChanges')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder={t('staff.search')} />
        </div>
        <span className="text-sm text-sub">{t('staff.count', { count: filtered.length })}</span>
        <button onClick={openCreate}
          className="px-3 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-hover flex items-center gap-2 font-medium transition-colors">
          <IconPlus stroke={1.5} size={14} /> {t('staff.add')}
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-app overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <th className="px-5 py-3 font-medium">{t('table.staffMember')}</th>
                <th className="px-4 py-3 font-medium">{t('table.username')}</th>
                <th className="px-4 py-3 font-medium">{t('table.role')}</th>
                <th className="px-4 py-3 font-medium">{t('table.email')}</th>
                <th className="px-4 py-3 font-medium">{t('table.phone')}</th>
                <th className="px-4 py-3 font-medium">{t('table.created')}</th>
                <th className="px-4 py-3 font-medium">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-brand-light transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-brand flex-shrink-0">
                        <IconUserCog stroke={1.5} size={16} />
                      </div>
                      <p className="font-medium text-ink">{s.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-sub">{s.username}</td>
                  <td className="px-4 py-3.5"><Badge label={s.role} /></td>
                  <td className="px-4 py-3.5 text-sub text-xs">{s.email}</td>
                  <td className="px-4 py-3.5 text-sub">{s.phone}</td>
                  <td className="px-4 py-3.5 text-sub">{s.createdAt}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-mute hover:text-brand hover:bg-brand-light transition-colors" title={t('common.edit')}>
                        <IconPencil stroke={1.5} size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(s)} className="p-1.5 rounded-lg text-mute hover:text-[#EF4444] hover:bg-red-50 transition-colors" title={t('common.delete')}>
                        <IconTrash stroke={1.5} size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-mute text-sm">{t('staff.none')}</div>}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('staff.addTitle')}>
        <StaffForm onSave={saveCreate} onCancel={() => setShowCreate(false)} isCreate />
      </Modal>

      <Modal open={!!editStaff} onClose={() => setEditStaff(null)} title={t('staff.editTitle', { name: editStaff?.name })}>
        <StaffForm onSave={saveEdit} onCancel={() => setEditStaff(null)} isCreate={false} />
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteStaff(confirmDelete.id)}
        title={t('staff.deleteTitle')} message={t('staff.deleteMsg', { name: confirmDelete?.name })}
        confirmLabel={t('common.delete')} danger />
    </div>
  );
}
