import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconLoader2, IconPlus, IconTag } from '@tabler/icons-react';
import { getCategories, createCategory } from '../services/categoryService';

export default function Categories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
        <p className="text-xs text-mute mt-2">{t('categories.editNote')}</p>
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
                <span className="font-medium text-ink">{c.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
