import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { mockDashboard } from '../../data/mock';
import { formatMMKShort } from '../../utils/currency';

export default function Header({ titleKey }) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const todayRevenue = mockDashboard.todayStoreSales;

  return (
    <header className="h-16 surface-panel border-b flex items-center justify-between px-6 flex-shrink-0 gap-4 z-30">
      {/* Left: title */}
      <div className="flex items-center gap-4 min-w-0">
        <h1 className="text-lg font-bold text-ink whitespace-nowrap leading-none">{t(`titles.${titleKey}`)}</h1>
      </div>

      {/* Right: today revenue + who is signed in. Settings, language, theme and
          logout all live in the sidebar now, so there is no menu to open here. */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="hidden lg:flex flex-col items-end leading-tight pr-3 border-r border-app">
          <span className="text-[11px] text-mute uppercase tracking-wide">{t('header.todayRevenue')}</span>
          <span className="text-[15px] font-bold text-brand leading-none mt-0.5">{formatMMKShort(todayRevenue)}</span>
        </div>
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
