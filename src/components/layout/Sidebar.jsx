
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  IconLayoutDashboard, IconPackage, IconShoppingCart, IconGift,
  IconUsers, IconUserCog, IconLogout, IconBabyCarriage,
  IconChevronLeft, IconSun, IconMoon, IconTags, IconCashRegister, IconChartHistogram,
  IconSparkles, IconSettings,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// `roles` = staff roles allowed (besides Manager, who sees everything).
// Keep labels mounted at their natural width; fade them inside clipped rows
// so their size does not compete with the shell's width transition.
const COLLAPSE_MS = 260;
const COLLAPSE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const labelStyle = (collapsed) => ({
  opacity: collapsed ? 0 : 1,
  transform: collapsed ? 'translateX(-4px)' : 'none',
  transition: ['opacity', 'transform']
    .map(prop => `${prop} ${COLLAPSE_MS}ms ${COLLAPSE_EASE}`).join(', '),
  transitionDelay: '0ms',
});

const NAV_ITEMS = [
  // Manager-only from here (roles: []). Neither staff role lands on a dashboard:
  // TicketStaff go to the playground app, SaleStaff to the till.
  { to: '/', icon: IconLayoutDashboard, key: 'dashboard', roles: [] },
  { to: '/pos', icon: IconCashRegister, key: 'pos', roles: ['SaleStaff'] },
  { to: '/sales', icon: IconChartHistogram, key: 'sales', roles: [] },
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
  const navigate = useNavigate();
  const location = useLocation();
  const isMy = i18n.resolvedLanguage === 'my';
  const visibleItems = NAV_ITEMS.filter(i => can(...i.roles));

  const activeIndex = visibleItems.findIndex(item => 
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  );

  const { styleTheme } = useTheme();

  return (
    <aside data-collapsed={collapsed} className={`sidebar-shell relative flex flex-col surface-panel border rounded-2xl ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0`}
      style={{ transition: `width ${COLLAPSE_MS}ms ${COLLAPSE_EASE}` }}>
      {/* Collapse handle — centered on the sidebar edge for a consistent reach target. */}
      <button
        onClick={onToggle}
        title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        aria-expanded={!collapsed}
        aria-controls="sidebar-navigation"
        className="sidebar-toggle w-6 h-6 rounded-full border border-app bg-card text-mute hover:text-brand hover:border-brand shadow-sm flex items-center justify-center cursor-pointer transition-colors"
      >
        <IconChevronLeft size={14} stroke={2}
          style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: `transform ${COLLAPSE_MS}ms ${COLLAPSE_EASE}` }} />
      </button>

      {/* Logo — 64px */}
      <div className="flex items-center h-16 shrink-0 sidebar-logo">
        <div className="bg-brand text-white rounded-lg p-1.5 flex-shrink-0">
          <IconBabyCarriage size={20} stroke={1.5} />
        </div>
        <div className="nav-label min-w-0 overflow-hidden" style={labelStyle(collapsed)}>
          <p className="font-bold text-brand text-md leading-tight whitespace-nowrap">Appleland</p>
          <p className="text-[11px] text-mute whitespace-nowrap">{t('sidebar.subtitle')}</p>
        </div>
      </div>

      {/* Nav */}
      {/* Rows are compact so all nav items fit a ~690px window without scrolling. */}
      <nav id="sidebar-navigation" className="flex-1 py-2 overflow-y-auto relative">
        {activeIndex >= 0 && (
          <div 
            aria-hidden="true"
            className="sidebar-active-pill absolute left-2 right-2 h-9 rounded-full pointer-events-none"
            style={{
              top: '8px', // matches py-2
              background: styleTheme === 'glass' ? 'color-mix(in srgb, var(--c-glass) 36%, transparent)' : 'var(--s-nav-active-bg)',
              boxShadow: styleTheme === 'glass' ? '0 2px 5px color-mix(in srgb, var(--c-dark) 8%, transparent)' : 'var(--s-nav-active-shadow)',
              translate: `0 ${activeIndex * 38}px`,
              transition: 'translate 280ms cubic-bezier(0.22, 0.8, 0.22, 1)',
              zIndex: 0
            }}
          />
        )}
        {visibleItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to} aria-label={t(`nav.${key}`)} title={collapsed ? t(`nav.${key}`) : undefined}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-link surface-nav-item flex items-center h-9 mb-0.5 ml-2 text-[15px] relative z-10 ${isActive
                ? (styleTheme === 'glass' ? 'is-active-glass font-semibold text-brand' : 'is-active font-semibold')
                : 'text-ink/75 hover:text-brand font-normal'
              } mr-2`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} stroke={isActive ? 1.9 : 1.5} className={`sidebar-nav-icon shrink-0 ${isActive ? 'text-brand' : 'text-mute'}`} />
                <span className="nav-label overflow-hidden" style={labelStyle(collapsed)}>{t(`nav.${key}`)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: user + language + dark toggle + logout */}
      <div className="sidebar-footer border-t border-app p-2 shrink-0">
        <div className="sidebar-identity nav-label px-2 min-w-0 overflow-hidden" style={labelStyle(collapsed)}>
          <p className="text-xs font-semibold text-ink truncate">{user?.name}</p>
          <span className="inline-block mt-0.5 text-[11px] text-brand font-medium whitespace-nowrap">{t(`roles.${user?.role}`)}</span>
        </div>

        {/* Language · settings · theme — the three switches sit together, which is
            why the header no longer needs a profile menu. */}
        <div className="sidebar-preferences">
          <div className="sidebar-language rounded-full border border-app">
            <button
              onClick={() => i18n.changeLanguage('en')}
              title="English"
              className={`flex-1 w-full px-2 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${!isMy ? 'bg-brand text-white' : 'text-sub hover:text-brand'}`}
            >
              EN
            </button>
            <button
              onClick={() => i18n.changeLanguage('my')}
              title="မြန်မာ"
              className={`flex-1 w-full px-2 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${isMy ? 'bg-brand text-white' : 'text-sub hover:text-brand'}`}
            >
              MY
            </button>
          </div>
          <button
            onClick={() => navigate('/settings')}
            title={t('nav.settings')}
            aria-label={t('nav.settings')}
            className="press-spring flex items-center justify-center w-8 h-8 flex-shrink-0 rounded-full text-mute hover:text-brand hover:bg-brand-light transition-colors cursor-pointer"
          >
            <IconSettings size={18} stroke={1.5} />
          </button>
          <button
            onClick={toggleDark}
            title={darkMode ? t('sidebar.lightMode') : t('sidebar.darkMode')}
            aria-label={darkMode ? t('sidebar.lightMode') : t('sidebar.darkMode')}
            className="press-spring flex items-center justify-center w-8 h-8 flex-shrink-0 rounded-full text-mute hover:text-brand hover:bg-brand-light transition-colors cursor-pointer"
          >
            {darkMode ? <IconSun size={18} stroke={1.5} /> : <IconMoon size={18} stroke={1.5} />}
          </button>
        </div>
        <button
          onClick={logout} aria-label={t('sidebar.logout')}
          className="sidebar-logout press-spring flex items-center w-full h-8 rounded-full text-sm text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
        >
          <IconLogout size={16} stroke={1.5} />
          <span className="nav-label overflow-hidden" style={labelStyle(collapsed)}>{t('sidebar.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
