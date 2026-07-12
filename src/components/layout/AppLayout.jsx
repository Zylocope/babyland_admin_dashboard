import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IconPlus, IconTicket } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';

const TITLE_KEYS = {
  '/':          'dashboard',
  '/products':  'products',
  '/categories': 'categories',
  '/orders':    'orders',
  '/tickets':   'tickets',
  '/customers': 'customers',
  '/reports':   'reports',
  '/staff':     'staff',
  '/settings':  'settings',
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  // Match on the first path segment so nested routes (/products/new,
  // /products/:id/edit) resolve to their section title.
  const titleKey = TITLE_KEYS['/' + (pathname.split('/')[1] || '')] ?? 'dashboard';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header titleKey={titleKey} />

        {/* Welcome banner */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 flex-shrink-0 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-ink">{t('banner.welcome', { name: user?.name?.split(' ')[0] ?? 'Admin' })}</h2>
            <p className="text-[13px] text-sub mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-[15px] font-medium hover:bg-brand-hover transition-colors cursor-pointer shadow-card"
            >
              <IconPlus size={16} stroke={2} /> {t('banner.newOrder')}
            </button>
            <button
              onClick={() => navigate('/tickets')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg glass text-ink text-[15px] font-medium hover:shadow-hover transition-all cursor-pointer"
            >
              <IconTicket size={16} stroke={1.8} className="text-brand" /> {t('banner.sellTicket')}
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-6 pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
