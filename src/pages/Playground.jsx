import { Link } from 'react-router-dom';
import { IconTicket, IconDeviceMobile, IconGift, IconArrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import NotConnected from '../components/common/NotConnected';

// This page used to be a second copy of the old staff screen: check in by phone
// number, add a point, free visit at ten. The backend implements none of that.
// A customer is identified by their own Appleland account, staff never look
// anyone up, and every reward counter lives on the customer's account.
//
// There is also nothing for a manager to read. route_admin() exposes exactly
// one playground route — POST /admin/playground/tokens — so no endpoint can
// tell us how many tickets were sold, who claimed them, or what was charged.
// Rather than keep a convincing screen full of browser-only numbers, this says
// what the flow is and what is missing.
const STEPS = [
  { icon: IconTicket, key: 'step1' },
  { icon: IconDeviceMobile, key: 'step2' },
  { icon: IconGift, key: 'step3' },
];

export default function Playground() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl space-y-5">
      <div className="surface-card is-sheet p-6">
        <h2 className="text-lg font-semibold text-ink">{t('playground.howTitle')}</h2>
        <p className="text-[13px] text-sub mt-1">{t('playground.howIntro')}</p>

        <ol className="mt-6 space-y-5">
          {STEPS.map(({ icon: Icon, key }, i) => (
            <li key={key} className="flex gap-4">
              <span className="w-10 h-10 flex-shrink-0 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: 'var(--orange-primary)', color: 'var(--orange-primary)' }}>
                <Icon size={18} stroke={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  {i + 1}. {t(`playground.${key}Title`)}
                </p>
                <p className="text-[13px] text-sub leading-relaxed mt-0.5">{t(`playground.${key}Body`)}</p>
              </div>
            </li>
          ))}
        </ol>

        <Link to="/playground-app"
          className="btn-primary mt-7 inline-flex w-full sm:w-auto justify-center">
          <IconTicket size={18} stroke={1.8} /> {t('playground.openStaffApp')} <IconArrowRight size={16} stroke={1.8} />
        </Link>
      </div>

      <NotConnected>{t('playground.reportingBlocked')}</NotConnected>
    </div>
  );
}
