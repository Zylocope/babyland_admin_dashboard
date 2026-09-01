import { useState, useEffect, useRef } from 'react';
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
  const navigate = useNavigate();
  const location = useLocation();
  const isMy = i18n.resolvedLanguage === 'my';
  const visibleItems = NAV_ITEMS.filter(i => can(...i.roles));

  const activeIndex = visibleItems.findIndex(item => 
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  );

  const prevIndex = useRef(activeIndex);
  // Holds the move that is currently in flight. It has to be state, not a ref:
  // prevIndex is updated inside the effect, so any later render would recompute
  // the distance as zero and swap the long duration out from under a transition
  // that is still running.
  const [move, setMove] = useState(null);

  // A fixed duration is what made long jumps feel wrong. Dashboard -> Categories
  // covers four times the distance of Staff -> Customers, so at one duration it
  // travels four times faster. Apple's motion holds roughly constant *perceived*
  // speed: further takes longer, but sub-linearly, so a nine-row jump is not nine
  // times slower. sqrt gives that shape, clamped so nothing crawls or snaps.
  const rows = move ? move.rows : (Math.abs(activeIndex - prevIndex.current) || 1);
  const duration = Math.round(Math.min(520, 190 + Math.sqrt(rows) * 105));
  // Squash scales with distance too. A one-row hop barely deforms; a long throw
  // stretches, and that is what reads as weight instead of teleporting.
  const stretch = (1 + Math.min(rows * 0.05, 0.28)).toFixed(3);
  const origin = move ? move.origin : (activeIndex >= prevIndex.current ? 'top' : 'bottom');

  useEffect(() => {
    if (prevIndex.current === activeIndex || activeIndex < 0) return;
    const travelled = Math.abs(activeIndex - prevIndex.current) || 1;
    const ms = Math.round(Math.min(520, 190 + Math.sqrt(travelled) * 105));
    setMove({
      rows: travelled,
      origin: activeIndex > prevIndex.current ? 'top' : 'bottom',
    });
    prevIndex.current = activeIndex;
    const timer = setTimeout(() => setMove(null), ms);
    return () => clearTimeout(timer);
  }, [activeIndex]);

  const { styleTheme } = useTheme();

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
      <nav className="flex-1 py-2 overflow-y-auto relative">
        {styleTheme === 'glass' && activeIndex >= 0 && (
          <div 
            className="absolute left-2 right-2 h-9 rounded-full pointer-events-none"
            style={{
              top: '8px', // matches py-2
              backgroundColor: 'color-mix(in srgb, var(--c-glass) 36%, transparent)',
              boxShadow: `
                inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
                inset 2px 1px 0px -1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent), 
                inset -1.5px -1px 0px -1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 80%), transparent), 
                inset -2px -6px 1px -5px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 60%), transparent), 
                inset -1px 2px 3px -1px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 20%), transparent), 
                inset 0px -4px 1px -2px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 10%), transparent), 
                0px 3px 6px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 8%), transparent)`,
              // `translate`, not `transform`. The squash keyframes animate `scale`,
              // and a keyframe's `transform` REPLACES an inline one — so with
              // translateY here the pill lost its offset for the whole 440ms and
              // snapped to the first row and back. translate and scale are
              // independent properties, so they compose. This is exactly what the
              // original switcher does (`translate: 76px 0` + `scale: 1.2 1`).
              translate: `0 ${activeIndex * 38}px`,
              // Origin follows the direction of travel, so the pill stretches out
              // behind itself rather than from its middle.
              transformOrigin: origin,
              // cubic-bezier(0.32, 0.72, 0, 1): leaves fast, lands slow and long.
              // That asymmetric settle is what reads as Apple rather than as a
              // slide — an even ease in/out looks mechanical over long distances.
              ['--stretch']: stretch,
              transition: `translate ${duration}ms cubic-bezier(0.32, 0.72, 0, 1)`,
              animation: move ? `scaleToggleY ${duration}ms cubic-bezier(0.32, 0.72, 0, 1)` : 'none',
              zIndex: 0
            }}
          />
        )}
        {visibleItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `surface-nav-item press-spring flex items-center h-9 mb-0.5 ml-2 text-[15px] relative z-10 ${isActive
                ? (styleTheme === 'glass' ? 'is-active-glass font-semibold text-brand' : 'is-active font-semibold')
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
          <div className="px-2 py-1.5 mb-0.5 min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{user?.name}</p>
            <span className="inline-block mt-0.5 text-[11px] text-brand font-medium">{t(`roles.${user?.role}`)}</span>
          </div>
        )}

        {/* Language · settings · theme — the three switches sit together, which is
            why the header no longer needs a profile menu. */}
        <div className={`flex items-center gap-1 mb-0.5 ${collapsed ? 'flex-col' : ''}`}>
          <div className={`flex items-center gap-1 rounded-full border border-app p-0.5 ${collapsed ? 'flex-col w-full' : 'flex-grow'}`}>
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
              {collapsed ? 'MY' : 'မြန်မာ'}
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
          onClick={logout}
          className={`press-spring flex items-center w-full h-8 rounded-full text-sm text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer ${collapsed ? 'justify-center px-0' : 'gap-2 px-3'}`}
        >
          <IconLogout size={16} stroke={1.5} />
          {!collapsed && <span>{t('sidebar.logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
