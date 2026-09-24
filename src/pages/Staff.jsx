import { useEffect, useState } from 'react';
import { IconUserCog, IconDatabase, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import Badge from '../components/common/Badge';
import SearchInput from '../components/common/SearchInput';
import { getStaff } from '../services/staffService';
import { toUiRole } from '../utils/roles';
import { SkeletonRows } from '../components/common/Skeleton';

// Read-only: the admins table holds only username and role, and the backend has
// no create/edit/delete route for staff. Columns and actions come back when the
// data and endpoints exist — not before.
export default function Staff() {
  const { t } = useTranslation();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    getStaff()
      .then(rows => { if (active) { setStaff(Array.isArray(rows) ? rows : []); setError(''); } })
      .catch(err => { if (active) { setStaff([]); setError(err?.message || t('staff.loadFailed')); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey, t]);

  const retry = () => { setLoading(true); setReloadKey(k => k + 1); };

  const term = search.trim().toLowerCase();
  const filtered = staff.filter(s => !term || s.username.toLowerCase().includes(term));

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder={t('staff.search')} />
        </div>
        <span className="text-sm text-sub">{t('staff.count', { count: filtered.length })}</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-3">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 font-medium cursor-pointer">
            <IconRefresh size={15} /> {t('assistant.retry')}
          </button>
        </div>
      )}

      <div className="surface-card is-sheet overflow-hidden">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-app bg-base/55 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-mute">
              <th className="px-5 py-3.5 font-semibold">{t('table.username')}</th>
              <th className="px-4 py-3.5 font-semibold">{t('table.role')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app">
            {loading && <SkeletonRows rows={5} cols={['55%', '35%']} />}
            {!loading && filtered.map(s => (
              <tr key={s.id} className="hover:bg-brand-light transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-brand flex-shrink-0">
                      <IconUserCog stroke={1.5} size={16} />
                    </div>
                    <span className="font-medium text-ink">{s.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5"><Badge label={toUiRole(s.role)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* The skeleton above already covers the waiting case. */}
        {!loading && !filtered.length && (
          <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
            <IconDatabase size={28} stroke={1.2} />
            {t('staff.none')}
          </div>
        )}
      </div>
    </div>
  );
}
