import { NavLink } from 'react-router-dom';
import {
  IconLayoutDashboard, IconPackage, IconShoppingCart, IconTicket,
  IconUsers, IconChartBar, IconUserCog, IconLogout, IconBabyCarriage,
  IconChevronLeft, IconSun, IconMoon, IconTags,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// `roles` = staff roles allowed (besides Manager, who sees everything).
const NAV_ITEMS = [
  { to: '/', icon: IconLayoutDashboard, key: 'dashboard', roles: ['SaleStaff', 'TicketStaff'] },
  { to: '/products', icon: IconPackage, key: 'products', roles: ['SaleStaff'] },
  { to: '/categories', icon: IconTags, key: 'categories', roles: [] },
  { to: '/orders', icon: IconShoppingCart, key: 'orders', roles: ['SaleStaff'] },
  { to: '/tickets', icon: IconTicket, key: 'playground', roles: ['TicketStaff'] },
  { to: '/customers', icon: IconUsers, key: 'customers', roles: ['SaleStaff', 'TicketStaff'] },
  { to: '/reports', icon: IconChartBar, key: 'reports', roles: [] },
  { to: '/staff', icon: IconUserCog, key: 'staff', roles: [] },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout, can } = useAuth();
  const { darkMode, toggleDark } = useTheme();
  const { t, i18n } = useTranslation();
  const isMy = i18n.resolvedLanguage === 'my';
  const visibleItems = NAV_ITEMS.filter(i => can(...i.roles));

  return (
    <aside className={`flex flex-col bg-sidebar border-r border-app transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0`}>
      {/* Logo — 64px */}
      <div className={`flex items-center gap-3 px-5 h-16 border-b border-app ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="bg-brand text-white rounded-lg p-1.5 flex-shrink-0">
          <IconBabyCarriage size={20} stroke={1.5} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-brand text-md leading-tight">Appleland</p>
            <p className="text-[11px] text-mute">{t('sidebar.subtitle')}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 text-[15px] transition-colors active:scale-[0.98] ${isActive
                ? 'bg-card text-brand font-semibold shadow-card'
                : 'text-ink/75 hover:bg-white/50 dark:hover:bg-white/5 hover:text-brand font-normal'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r" style={{ background: '#F97316' }} />}
                <Icon size={20} stroke={1.5} className={isActive ? 'text-brand' : 'text-mute'} />
                {!collapsed && <span>{t(`nav.${key}`)}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: user + language + dark toggle + logout */}
      <div className="border-t border-app p-3">
        {!collapsed && (
          <div className="px-2 py-2 mb-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink truncate">{user?.name}</p>
              <span className="inline-block mt-0.5 text-[11px] text-brand font-medium">{t(`roles.${user?.role}`)}</span>
            </div>
            <button
              onClick={toggleDark}
              title={darkMode ? t('sidebar.lightMode') : t('sidebar.darkMode')}
              className="p-1.5 rounded-lg text-mute hover:text-brand hover:bg-brand-light transition-colors cursor-pointer flex-shrink-0"
            >
              {darkMode ? <IconSun size={18} stroke={1.5} /> : <IconMoon size={18} stroke={1.5} />}
            </button>
          </div>
        )}

        {/* Language toggle — EN / မြန်မာ */}
        <div className={`flex items-center gap-1 mb-1 rounded-lg border border-app p-0.5 ${collapsed ? 'flex-col' : ''}`}>
          <button
            onClick={() => i18n.changeLanguage('en')}
            className={`flex-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${!isMy ? 'bg-brand text-white' : 'text-sub hover:text-brand'}`}
          >
            EN
          </button>
          <button
            onClick={() => i18n.changeLanguage('my')}
            className={`flex-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${isMy ? 'bg-brand text-white' : 'text-sub hover:text-brand'}`}
          >
            မြန်မာ
          </button>
        </div>

        {collapsed && (
          <button onClick={toggleDark} title={darkMode ? t('sidebar.lightMode') : t('sidebar.darkMode')}
            className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-mute hover:text-brand hover:bg-brand-light transition-colors mb-1 cursor-pointer">
            {darkMode ? <IconSun size={18} stroke={1.5} /> : <IconMoon size={18} stroke={1.5} />}
          </button>
        )}
        <button
          onClick={logout}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer ${collapsed ? 'justify-center' : ''}`}
        >
          <IconLogout size={16} stroke={1.5} />
          {!collapsed && <span>{t('sidebar.logout')}</span>}
        </button>
        <button
          onClick={onToggle}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-mute hover:bg-brand-light transition-colors mt-1 cursor-pointer ${collapsed ? 'justify-center' : ''}`}
        >
          <IconChevronLeft size={16} stroke={1.5} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>{t('sidebar.collapse')}</span>}
        </button>
      </div>
    </aside>
  );
}
