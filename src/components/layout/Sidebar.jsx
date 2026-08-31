import { NavLink } from 'react-router-dom';
import {
  IconLayoutDashboard, IconPackage, IconShoppingCart, IconGift,
  IconUsers, IconUserCog, IconLogout, IconBabyCarriage,
  IconChevronLeft, IconSun, IconMoon, IconTags, IconCashRegister, IconChartHistogram,
  IconSparkles,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// `roles` = staff roles allowed (besides Manager, who sees everything).
const NAV_ITEMS = [
  { to: '/', icon: IconLayoutDashboard, key: 'dashboard', roles: ['SaleStaff', 'TicketStaff'] },
  { to: '/pos', icon: IconCashRegister, key: 'pos', roles: ['SaleStaff'] },
  { to: '/sales', icon: IconChartHistogram, key: 'sales', roles: ['SaleStaff'] },
  { to: '/products', icon: IconPackage, key: 'products', roles: ['SaleStaff'] },
  { to: '/categories', icon: IconTags, key: 'categories', roles: [] },
  { to: '/orders', icon: IconShoppingCart, key: 'orders', roles: ['SaleStaff'] },
  { to: '/playground', icon: IconGift, key: 'playground', roles: ['TicketStaff'] },
  { to: '/customers', icon: IconUsers, key: 'customers', roles: ['SaleStaff', 'TicketStaff'] },
  { to: '/staff', icon: IconUserCog, key: 'staff', roles: [] },
  { to: '/assistant', icon: IconSparkles, key: 'assistant', roles: [] },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout, can } = useAuth();
  const { darkMode, toggleDark } = useTheme();
  const { t, i18n } = useTranslation();
  const isMy = i18n.resolvedLanguage === 'my';
  const visibleItems = NAV_ITEMS.filter(i => can(...i.roles));

  return (
    <aside className={`relative flex flex-col surface-panel border-r transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0`}>
      {/* Collapse handle — pinned to the middle of the right edge, chevron only. */}
      <button
        onClick={onToggle}
        title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        className="absolute top-1/2 -right-3 -translate-y-1/2 z-40 w-6 h-6 rounded-full border border-app bg-card text-mute hover:text-brand hover:border-brand shadow-sm flex items-center justify-center cursor-pointer transition-colors"
      >
        <IconChevronLeft size={14} stroke={2} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

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
      {/* Rows are compact so all nav items fit a ~690px window without scrolling. */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `surface-nav-item flex items-center h-9 mb-0.5 ml-2 text-[15px] active:scale-[0.98] ${isActive
                ? 'is-active font-semibold'
                : 'text-ink/75 hover:text-brand font-normal'
              } ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} mr-2`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} stroke={isActive ? 1.9 : 1.5} className={isActive ? 'text-brand' : 'text-mute'} />
                {!collapsed && <span>{t(`nav.${key}`)}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: user + language + dark toggle + logout */}
      <div className="border-t border-app p-2">
        {!collapsed && (
          <div className="px-2 py-1.5 mb-0.5 flex items-center justify-between gap-2">
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
        <div className={`flex items-center gap-1 mb-0.5 rounded-full border border-app p-0.5 ${collapsed ? 'flex-col' : ''}`}>
          <button
            onClick={() => i18n.changeLanguage('en')}
            className={`flex-1 w-full px-2 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${!isMy ? 'bg-brand text-white' : 'text-sub hover:text-brand'}`}
          >
            EN
          </button>
          <button
            onClick={() => i18n.changeLanguage('my')}
            className={`flex-1 w-full px-2 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${isMy ? 'bg-brand text-white' : 'text-sub hover:text-brand'}`}
          >
            {collapsed ? 'MY' : 'မြန်မာ'}
          </button>
        </div>

        {collapsed && (
          <button onClick={toggleDark} title={darkMode ? t('sidebar.lightMode') : t('sidebar.darkMode')}
            className="flex items-center justify-center w-full h-8 rounded-full text-mute hover:text-brand hover:bg-brand-light transition-colors mb-0.5 cursor-pointer">
            {darkMode ? <IconSun size={18} stroke={1.5} /> : <IconMoon size={18} stroke={1.5} />}
          </button>
        )}
        <button
          onClick={logout}
          className={`flex items-center w-full h-8 rounded-full text-sm text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer ${collapsed ? 'justify-center px-0' : 'gap-2 px-3'}`}
        >
          <IconLogout size={16} stroke={1.5} />
          {!collapsed && <span>{t('sidebar.logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
