import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconExternalLink, IconTicket } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import PlaygroundAnalytics from '../components/playground/PlaygroundAnalytics';
import { shopToday } from '../utils/shopDay';
import PeriodPicker from '../components/common/PeriodPicker';
import { periodRange } from '../utils/periods';

export default function Playground() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('week');
  const { start, end } = useMemo(() => periodRange(period, shopToday()), [period]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t('playgroundAnalytics.title')}</h2>
          <p className="text-sm text-sub mt-0.5">{t('playgroundAnalytics.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker value={period} onChange={setPeriod} />
          <Link to="/playground-app" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-app text-sub hover:text-brand hover:border-brand transition-colors">
            <IconTicket size={14} /> {t('playground.openStaffApp')} <IconExternalLink size={13} />
          </Link>
        </div>
      </div>

      <PlaygroundAnalytics start={start} end={end} />
    </div>
  );
}
