// Status indicator — UPPERCASE text + colored underline only. No background, no pill.
const variants = {
  Pending:    'text-amber-600  border-amber-500',
  Processing: 'text-blue-600   border-blue-500',
  Shipped:    'text-emerald-600 border-emerald-500',
  Delivered:  'text-green-600  border-green-500',
  Cancelled:  'text-red-600    border-red-500',
  Refunded:   'text-orange-600 border-orange-500',
  Confirmed:  'text-green-600  border-green-500',
  Used:       'text-gray-500   border-gray-400',
  Manager:     'text-orange-600 border-orange-500',
  Staff:       'text-blue-600   border-blue-500',
  SaleStaff:   'text-blue-600   border-blue-500',
  TicketStaff: 'text-emerald-600 border-emerald-500',
  Active:     'text-green-600  border-green-500',
  Hidden:     'text-gray-500   border-gray-400',
  Low:        'text-red-600    border-red-500',
};

import { useTranslation } from 'react-i18next';

export default function Badge({ label }) {
  const { t } = useTranslation();
  const cls = variants[label] ?? 'text-gray-500 border-gray-400';
  return (
    <span className={`inline-block pb-0.5 border-b-2 text-[11px] font-bold uppercase tracking-[0.06em] whitespace-nowrap ${cls}`}>
      {t(`badge.${label}`, label)}
    </span>
  );
}
