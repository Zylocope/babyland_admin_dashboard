import { IconCash, IconClock, IconCircleCheck, IconAlertTriangle, IconDatabase } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/common/StatCard';
import { formatMMKShort } from '../utils/currency';

export default function Dashboard() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={IconCash} tone="store" label={t('dashboard.storeSales')} value={t('dashboard.noData')} />
        <StatCard icon={IconClock} tone="pending" label={t('dashboard.pendingOrders')} value={t('dashboard.noData')} />
        <StatCard icon={IconCircleCheck} tone="completed" label={t('dashboard.completedOrders')} value={t('dashboard.noData')} />
        <StatCard icon={IconAlertTriangle} tone="low" label={t('dashboard.lowStockItems')} value={t('dashboard.noData')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 surface-card p-6">
          <h3 className="font-semibold text-ink mb-4">{t('dashboard.revenue7d')}</h3>
          <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
            <IconDatabase size={28} stroke={1.2} />
            {t('dashboard.noRevenueData')}
          </div>
        </div>

        <div className="xl:col-span-4 surface-card p-6">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <IconAlertTriangle size={16} stroke={1.5} className="text-[#EF4444]" /> {t('dashboard.lowStockAlerts')}
          </h3>
          <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
            <IconDatabase size={28} stroke={1.2} />
            {t('dashboard.noLowStockData')}
          </div>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="px-6 py-4 border-b border-app">
          <h3 className="font-semibold text-ink">{t('dashboard.recentOrders')}</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
          <IconDatabase size={28} stroke={1.2} />
          {t('dashboard.noOrderData')}
        </div>
      </div>
    </div>
  );
}
