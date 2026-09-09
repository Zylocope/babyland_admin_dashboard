import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';

const TITLE_KEYS = {
  '/':          'dashboard',
  '/pos':       'pos',
  '/sales':     'sales',
  '/products':  'products',
  '/categories': 'categories',
  '/orders':    'orders',
  '/playground': 'playground',
  '/customers': 'customers',
  '/staff':     'staff',
  '/settings':  'settings',
  '/assistant': 'assistant',
};

// Below lg the 240px rail leaves too little content column to work with -- at
// 390px it takes 240 of them. Admin and sale staff are desktop-first but must
// still be usable on a phone, so the sidebar collapses itself to the 64px rail
// there. Playground staff have their own app and never see this shell.
const NARROW = '(max-width: 1023px)';

export default function AppLayout() {
  // Seeded from the query so a phone starts collapsed with no transition on
  // mount -- the animation should only ever play in response to something.
  const [collapsed, setCollapsed] = useState(() => window.matchMedia(NARROW).matches);

  // The breakpoint sets the default rather than overriding the choice. Forcing
  // it would leave the collapse button visibly doing nothing on a phone, which
  // is exactly the dead-control problem the Dashboard link had.
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    let was = mq.matches;
    // Only on an actual crossing. Syncing on every resize event would undo a
    // manual collapse the moment the window moved at all.
    const sync = () => {
      if (mq.matches === was) return;
      was = mq.matches;
      setCollapsed(mq.matches);
    };
    mq.addEventListener('change', sync);
    // Belt to that braces: the change event is not delivered under some
    // viewport emulation, and resize is, so neither alone is relied on.
    window.addEventListener('resize', sync);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  // Match on the first path segment so nested routes (/products/new,
  // /products/:id/edit) resolve to their section title.
  const titleKey = TITLE_KEYS['/' + (pathname.split('/')[1] || '')] ?? 'dashboard';

  return (
    <div className="flex h-screen overflow-hidden gap-4 p-4">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex flex-col flex-1 min-w-0 gap-4">
        <Header titleKey={titleKey} />

        {/* Welcome banner */}
        <div className="px-1 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-ink">{t('banner.welcome', { name: user?.name?.split(' ')[0] ?? 'Admin' })}</h2>
            <p className="text-[13px] text-sub mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-1 pt-1 pb-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
