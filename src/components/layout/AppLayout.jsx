import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Header from './Header';
import RouteFallback from '../common/RouteFallback';

const TITLE_KEYS = {
  '/': 'dashboard', '/pos': 'pos', '/sales': 'sales', '/products': 'products',
  '/categories': 'categories', '/orders': 'orders', '/playground': 'playground',
  '/customers': 'customers', '/staff': 'staff', '/settings': 'settings', '/assistant': 'assistant',
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const titleKey = TITLE_KEYS['/' + (pathname.split('/')[1] || '')] ?? 'dashboard';
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    let was = mq.matches;
    const sync = () => {
      if (mq.matches === was) return;
      was = mq.matches;
      setCollapsed(mq.matches);
    };
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <div className="app-shell flex overflow-hidden gap-3 p-3 lg:gap-4 lg:p-4">
      <a className="skip-link" href="#main-content">{t('navigation.skip')}</a>
      <div className="sidebar-slot">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>
      <div className="flex flex-col flex-1 min-w-0 min-h-0 gap-3 lg:gap-4">
        <Header titleKey={titleKey} />
        <main id="main-content" tabIndex={-1} key={pathname}
          className={`page-enter workspace-main flex-1 min-h-0 overflow-y-auto p-1 ${pathname === '/pos' ? 'workspace-pos' : ''}`}>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
