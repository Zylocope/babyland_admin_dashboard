import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconLoader2, IconPlus, IconTag, IconPencil, IconTrash, IconCheck, IconX } from '@tabler/icons-react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryService';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function Categories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);   // { id, name }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const cats = await getCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (e) {
      setError(e?.message || t('categories.loadFailed'));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError('');
    try {
      await createCategory(trimmed);
      setName('');
      await load();
    } catch (err) {
      setError(err?.message || t('categories.addFailed'));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    const trimmed = editing.name.trim();
    if (!trimmed) return;
    setBusyId(editing.id);
    setError('');
    try {
      await updateCategory(editing.id, trimmed);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err?.message || t('categories.updateFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (cat) => {
    setBusyId(cat.id);
    setError('');
    try {
      await deleteCategory(cat.id);
      await load();
    } catch (err) {
      setError(err?.message || t('categories.deleteFailed'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <form onSubmit={add} className="surface-card p-5">
        <label className="block text-xs font-medium text-ink mb-1">{t('categories.name')}</label>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('categories.namePlaceholder')}
            className="flex-1 px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button type="submit" disabled={saving || !name.trim()}
            className="btn-primary">

            {saving ? <IconLoader2 size={16} className="animate-spin" /> : <IconPlus size={16} stroke={2} />}
            {t('categories.add')}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-mute">{t('categories.loading')}</div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center text-sm text-mute">{t('categories.none')}</div>
        ) : (
          <ul className="divide-y divide-app">
            {categories.map(c => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center flex-shrink-0">
                  <IconTag stroke={1.5} size={15} className="text-brand" />
                </div>

                {editing?.id === c.id ? (
                  <>
                    <input
                      autoFocus
                      value={editing.name}
                      onChange={e => setEditing({ ...editing, name: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-card border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <button onClick={saveEdit} disabled={busyId === c.id || !editing.name.trim()}
                      title={t('common.saveChanges')}
                      className="p-1.5 rounded-lg text-mute hover:text-brand hover:bg-brand-light disabled:opacity-40 transition-colors cursor-pointer">
                      {busyId === c.id ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} stroke={2} />}
                    </button>
                    <button onClick={() => setEditing(null)} title={t('common.cancel')}
                      className="p-1.5 rounded-lg text-mute hover:text-ink transition-colors cursor-pointer">
                      <IconX size={16} stroke={2} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 font-medium text-ink truncate">{c.name}</span>
                    <button onClick={() => setEditing({ id: c.id, name: c.name })} title={t('common.edit')}
                      className="p-1.5 rounded-lg text-mute hover:text-brand hover:bg-brand-light transition-colors cursor-pointer">
                      <IconPencil size={16} stroke={1.6} />
                    </button>
                    <button onClick={() => setConfirmDelete(c)} title={t('common.delete')}
                      disabled={busyId === c.id}
                      className="p-1.5 rounded-lg text-mute hover:text-[#EF4444] hover:bg-red-50 disabled:opacity-40 transition-colors cursor-pointer">
                      {busyId === c.id ? <IconLoader2 size={16} className="animate-spin" /> : <IconTrash size={16} stroke={1.6} />}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove(confirmDelete)}
        title={t('categories.deleteTitle')} message={t('categories.deleteMsg', { name: confirmDelete?.name })}
        confirmLabel={t('common.delete')} danger />
    </div>
  );
}
