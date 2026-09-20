import { IconFlask } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { setDemoMode, useDemoMode } from '../../utils/demoMode';

// Deliberately loud, and on every screen. The whole safety argument for having
// generated data in the app at all is that nobody can be looking at it without
// knowing. A subtle badge in a corner would not carry that.
export default function DemoBanner() {
  const { t } = useTranslation();
  const on = useDemoMode();
  if (!on) return null;

  return (
    <div role="status"
      className="flex-shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 rounded-xl text-[13px]"
      style={{ background: 'var(--status-pending)', color: '#1a1a2e' }}>
      <IconFlask size={16} stroke={1.8} className="flex-shrink-0" />
      <span className="font-semibold">{t('demo.title')}</span>
      <span className="opacity-90 min-w-0">{t('demo.body')}</span>
      <button onClick={() => setDemoMode(false)}
        className="ml-auto px-2.5 py-1 rounded-lg font-semibold underline underline-offset-2 cursor-pointer">
        {t('demo.turnOff')}
      </button>
    </div>
  );
}
