import { useTranslation } from 'react-i18next';
import { PERIOD_KEYS, isMonth, monthOptions } from '../../utils/periods';
import { shopToday, formatShopTime, shopDayStart } from '../../utils/shopDay';

// Fixed ranges as buttons, calendar months in one dropdown.
export default function PeriodPicker({ value, onChange }) {
  const { t, i18n } = useTranslation();
  const months = monthOptions(shopToday());
  const btn = (active) => `flex-1 sm:flex-none whitespace-nowrap px-2 sm:px-3 py-1.5 text-xs cursor-pointer transition-colors ${active ? 'bg-brand text-white' : 'bg-card text-sub hover:bg-brand-light'}`;

  return (
    <div className="period-picker flex sm:inline-flex flex-wrap items-center gap-2 w-full sm:w-auto">
      <div className="period-options flex w-full sm:inline-flex sm:w-auto rounded-lg border border-app overflow-hidden" role="group" aria-label={t('posDash.periodLabel')}>
        {PERIOD_KEYS.map(p => (
          <button key={p} type="button" onClick={() => onChange(p)} aria-pressed={value === p} className={btn(value === p)}>
            {t(`posDash.period_${p}`)}
          </button>
        ))}
      </div>
      <select
        key={i18n.language}
        value={isMonth(value) ? value : ''}
        onChange={e => e.target.value && onChange(e.target.value)}
        aria-label={t('posDash.pickMonth')}
        className={`period-month px-2.5 py-1.5 text-xs rounded-lg border cursor-pointer ${isMonth(value) ? 'border-brand bg-brand-light text-brand font-medium' : 'border-app bg-card text-sub'}`}
      >
        <option value="">{t('posDash.pickMonth')}</option>
        {months.map(m => <option key={m} value={m}>{formatShopTime(shopDayStart(`${m}-01`), 'MMMM YYYY')}</option>)}
      </select>
    </div>
  );
}
