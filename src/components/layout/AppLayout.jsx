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
  const titleKey = TITLE_KEYS[pathname] ?? 'dashboard';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header titleKey={titleKey} />

        {/* Banner: greeting only on Dashboard; quick actions always, enlarged */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 flex-shrink-0 flex-wrap">
          {pathname === '/' ? (
            <div>
              <h2 className="text-xl font-bold text-ink">{t('banner.welcome', { name: user?.name?.split(' ')[0] ?? 'Admin' })}</h2>
              <p className="text-[13px] text-sub mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
          ) : <div />}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand text-white text-base font-semibold hover:bg-brand-hover transition-colors cursor-pointer shadow-card active:scale-[0.98]"
            >
              <IconPlus size={20} stroke={2.2} /> {t('banner.newOrder')}
            </button>
            <button
              onClick={() => navigate('/tickets')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass text-ink text-base font-semibold border border-brand/40 hover:shadow-hover transition-all cursor-pointer active:scale-[0.98]"
            >
              <IconTicket size={20} stroke={1.9} className="text-brand" /> {t('banner.sellTicket')}
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
