import { formatMMK } from '../utils/currency';
import { IconAlertTriangle, IconDownload, IconDatabase } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export default function Reports() {
  const { t: tr } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-light text-brand rounded-xl p-5">
          <p className="text-xs font-medium opacity-70 mb-1">{tr('reports.storeRevenue7d')}</p>
          <p className="text-2xl font-bold">{tr('reports.noData')}</p>
        </div>
        <div className="bg-red-50 text-red-600 rounded-xl p-5">
          <p className="text-xs font-medium opacity-70 mb-1">{tr('reports.lowStockItems')}</p>
          <p className="text-2xl font-bold">{tr('reports.noData')}</p>
        </div>
      </div>

      <div className="surface-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink">{tr('reports.revenueBreakdown')}</h3>
          <button className="text-xs text-sub flex items-center gap-1.5 border border-app px-3 py-1.5 rounded-lg hover:bg-brand-light transition-colors">
            <IconDownload stroke={1.5} size={13} /> {tr('common.export')}
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
          <IconDatabase size={28} stroke={1.2} />
          {tr('reports.noRevenueData')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-app">
            <h3 className="font-semibold text-ink">{tr('reports.onlineSales')}</h3>
            <button className="text-xs text-mute flex items-center gap-1.5 hover:text-sub"><IconDownload stroke={1.5} size={13} /> {tr('common.export')}</button>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
            <IconDatabase size={28} stroke={1.2} />
            {tr('reports.noOrderData')}
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-app">
            <h3 className="font-semibold text-ink flex items-center gap-2">
              <IconAlertTriangle stroke={1.5} size={15} className="text-red-500" /> {tr('reports.lowStockList')}
            </h3>
            <button className="text-xs text-mute flex items-center gap-1.5 hover:text-sub"><IconDownload stroke={1.5} size={13} /> {tr('common.export')}</button>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
            <IconDatabase size={28} stroke={1.2} />
            {tr('reports.noLowStockData')}
          </div>
        </div>
      </div>
    </div>
  );
}
