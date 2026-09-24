import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { Skeleton } from './Skeleton';
import { getSaleDetail } from '../../services/salesService';
import { formatMMK } from '../../utils/currency';
import { formatShopTime } from '../../utils/shopDay';

// What was actually in a sale.
//
// The receipts list could only ever say "this sale was 45,000 MMK" — the line
// items exist in the POS and on the server, and nothing in the UI called for
// them. This is also the only place the cashier appears: `by_admin` is on the
// detail response but not on the list rows, so until that changes, opening a
// receipt is how you find out who rang it up.
export default function ReceiptDialog({ saleId, onClose }) {
  const { t } = useTranslation();
  // The id the state belongs to rides along with it, so opening a second
  // receipt shows a skeleton by comparison at render rather than by resetting
  // state from inside the effect — which would cost a render and, for a frame,
  // show the previous receipt's lines under the new one's heading.
  const [state, setState] = useState({ id: null, status: 'loading', sale: null });

  useEffect(() => {
    if (!saleId) return;
    let active = true;
    getSaleDetail(saleId)
      .then(sale => { if (active) setState({ id: saleId, status: 'ok', sale }); })
      .catch(() => { if (active) setState({ id: saleId, status: 'error', sale: null }); });
    return () => { active = false; };
  }, [saleId]);

  const { status, sale } = state.id === saleId ? state : { status: 'loading', sale: null };
  const items = sale?.sale_items ?? [];

  return (
    <Modal open={!!saleId} onClose={onClose} title={t('salesTable.receiptTitle')} size="md">
      {status === 'loading' && (
        <div className="space-y-3 skeleton-row">
          <Skeleton w="55%" h={12} />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3" style={{ '--i': i }}>
              <Skeleton style={{ flex: 1, height: 14 }} />
              <Skeleton w={40} h={14} />
              <Skeleton w={80} h={14} />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <p role="alert" className="py-8 text-center text-sm text-mute">{t('salesTable.receiptFailed')}</p>
      )}

      {status === 'ok' && (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-sub mb-4">
            <span className="font-mono">{sale.id.slice(0, 8)}</span>
            <span className="tabular-nums">{formatShopTime(sale.created_at, 'YYYY-MM-DD HH:mm')}</span>
            <span>{sale.is_instore_sale ? t('posDash.chInstore') : t('posDash.chOnline')}</span>
            {/* An online sale has no cashier, which is a fact worth printing
                rather than an empty space. */}
            <span>{sale.by_admin?.username ?? t('salesTable.noCashier')}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-mute text-xs">
                  <th className="py-2 font-medium text-left">{t('table.item')}</th>
                  <th className="py-2 font-medium text-right">{t('table.qty')}</th>
                  <th className="py-2 font-medium text-right">{t('table.price')}</th>
                  <th className="py-2 font-medium text-right">{t('table.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {items.map(item => (
                  <tr key={item.id}>
                    {/* The name is the one the product had when it sold, kept on
                        the sale row — so a receipt still reads correctly after
                        the product is renamed or deleted. */}
                    <td className="py-2.5 text-ink">{item.product_name}</td>
                    <td className="py-2.5 text-right text-ink tabular-nums">{item.quantity}</td>
                    <td className="py-2.5 text-right text-sub tabular-nums">{formatMMK(Number(item.selling_price))}</td>
                    <td className="py-2.5 text-right text-ink font-medium tabular-nums">
                      {formatMMK(Number(item.selling_price) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-app">
            <span className="text-sm text-sub">{t('table.total')}</span>
            <span className="text-lg font-bold text-ink tabular-nums">{formatMMK(Number(sale.total_amount))}</span>
          </div>
        </>
      )}
    </Modal>
  );
}
