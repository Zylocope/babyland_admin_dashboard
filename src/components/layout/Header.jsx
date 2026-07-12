import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBell, IconSettings, IconLogout, IconChevronDown } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { mockProducts, mockDashboard } from '../../data/mock';
import { formatMMKShort } from '../../utils/currency';

export default function Header({ titleKey }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const lowStock = mockProducts.filter(p => p.stock <= p.lowStockThreshold).length;
  const todayRevenue = mockDashboard.todayStoreSales + mockDashboard.todayTicketSales;

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="h-16 surface-panel border-b flex items-center justify-between px-6 flex-shrink-0 gap-4 z-30">
      {/* Left: title */}
      <div className="flex items-center gap-4 min-w-0">
        <h1 className="text-lg font-bold text-ink whitespace-nowrap leading-none">{t(`titles.${titleKey}`)}</h1>
      </div>

      {/* Right: today revenue + bell + profile */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="hidden lg:flex flex-col items-end leading-tight pr-3 border-r border-app">
          <span className="text-[11px] text-mute uppercase tracking-wide">{t('header.todayRevenue')}</span>
          <span className="text-[15px] font-bold text-brand leading-none mt-0.5">{formatMMKShort(todayRevenue)}</span>
        </div>
        {lowStock > 0 && (
          <button className="relative p-1 cursor-pointer" title={t('header.lowStockAlert', { count: lowStock })}>
            <IconBell size={20} stroke={1.5} className="text-sub" />
            <span className="absolute top-0 right-0 bg-[#EF4444] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">
              {lowStock}
            </span>
          </button>
        )}

        {/* Profile dropdown */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.[0] ?? 'A'}
            </div>
            <span className="text-[15px] text-sub hidden sm:block leading-none">{user?.username}</span>
            <IconChevronDown size={15} stroke={1.5} className={`text-mute transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-52 surface-card py-1.5 z-40">
              <div className="px-3.5 py-2 border-b border-app mb-1">
                <p className="text-sm font-semibold text-ink truncate">{user?.name}</p>
                <p className="text-[11px] text-brand">{t(`roles.${user?.role}`)}</p>
              </div>
              <button
                onClick={() => { setOpen(false); navigate('/settings'); }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-sub hover:bg-brand-light hover:text-brand transition-colors cursor-pointer"
              >
                <IconSettings size={17} stroke={1.5} /> {t('nav.settings')}
              </button>
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <IconLogout size={17} stroke={1.5} /> {t('sidebar.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
