import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconExternalLink, IconTicket } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import PlaygroundAnalytics from '../components/playground/PlaygroundAnalytics';
import { shopDayStart, shopDaysAgo, shopToday } from '../utils/shopDay';

const PERIODS = ['today', 'week', 'month'];
const PERIOD_DAYS = { today: 1, week: 7, month: 30 };

export default function Playground() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('week');
  const days = PERIOD_DAYS[period];
  const { start, end } = useMemo(() => {
    const last = shopToday();
    return { start: shopDaysAgo(days - 1, shopDayStart(last)), end: last };
  }, [days]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t('playgroundAnalytics.title')}</h2>
          <p className="text-sm text-sub mt-0.5">{t('playgroundAnalytics.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-app overflow-hidden">
            {PERIODS.map(item => (
              <button key={item} type="button" onClick={() => setPeriod(item)}
                className={`px-3 py-1.5 text-xs cursor-pointer transition-colors ${period === item ? 'bg-brand text-white' : 'bg-card text-sub hover:bg-brand-light'}`}>
                {t(`posDash.period_${item}`)}
              </button>
            ))}
          </div>
          <Link to="/playground-app" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-app text-sub hover:text-brand hover:border-brand transition-colors">
            <IconTicket size={14} /> {t('playground.openStaffApp')} <IconExternalLink size={13} />
          </Link>
        </div>
      </div>

      <PlaygroundAnalytics start={start} end={end} days={days} />
    </div>
  );
}
