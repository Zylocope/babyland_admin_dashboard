import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getSaleSummary } from '../../services/salesService';
import { formatMMKShort } from '../../utils/currency';
import { shopToday } from '../../utils/shopDay';

// Today's takings, read live. This used to render mockDashboard.todayStoreSales
// as "82K MMK" on every page for every role — a fabricated number in the most
// authoritative slot on screen, which is worse than showing nothing.
//
// Manager-only: daily revenue is not a figure a till or door operator needs, and
// the /sales screen it comes from is already manager-only.
function TodayRevenue() {
  const { t } = useTranslation();
  const [state, setState] = useState({ status: 'loading', total: 0 });

  useEffect(() => {
    let active = true;
    const day = shopToday();
    getSaleSummary({ start_date: day, end_date: day })
      .then((rows) => {
        if (!active) return;
        // Rows are grouped by day AND channel, so today can come back as more
        // than one row; the header figure is the whole day.
        const total = (Array.isArray(rows) ? rows : [])
          .reduce((sum, r) => sum + Number(r?.total_sale ?? 0), 0);
        setState({ status: 'ok', total });
      })
      .catch(() => { if (active) setState({ status: 'error', total: 0 }); });
    return () => { active = false; };
  }, []);

  return (
    <div className="hidden lg:flex flex-col items-end leading-tight pr-3 border-r border-app">
      <span className="text-[11px] text-mute uppercase tracking-wide">{t('header.todayRevenue')}</span>
      {state.status === 'loading' && (
        // A dash, not a zero. Zero is a real and different answer.
        <span className="text-[15px] font-bold text-mute leading-none mt-0.5 tabular-nums">—</span>
      )}
      {state.status === 'error' && (
        <span className="text-[13px] font-medium text-mute leading-none mt-0.5">{t('header.revenueUnavailable')}</span>
      )}
      {state.status === 'ok' && (
        <span className="text-[15px] font-bold text-brand leading-none mt-0.5 tabular-nums">
          {formatMMKShort(state.total)}
        </span>
      )}
    </div>
  );
}

export default function Header({ titleKey }) {
  const { user, isManager } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="h-16 surface-panel border rounded-2xl flex items-center justify-between px-3 sm:px-5 flex-shrink-0 gap-3 z-30">
      {/* Left: title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-mute">Appleland</p>
          <h1 className="text-lg font-semibold text-ink truncate leading-snug">{t(`titles.${titleKey}`)}</h1>
        </div>
      </div>

      {/* Right: today revenue + who is signed in. Settings, language, theme and
          logout all live in the sidebar now, so there is no menu to open here. */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {isManager && <TodayRevenue />}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-semibold">
            {user?.name?.[0] ?? 'A'}
          </div>
          <span className="text-[15px] text-sub hidden sm:block leading-none">{user?.username}</span>
        </div>
      </div>
    </header>
  );
}
