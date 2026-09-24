import { useTranslation } from 'react-i18next';
import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, danger = false }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sub text-sm mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        {/* Was a hardcoded "Cancel", which stayed English on a Burmese screen. */}
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-app text-sub hover:bg-brand-light transition-colors cursor-pointer">
          {t('common.cancel')}
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`px-4 py-2 text-sm rounded-lg font-medium text-white transition-colors cursor-pointer ${danger ? 'bg-[#EF4444] hover:brightness-95' : 'bg-brand hover:bg-brand-hover'}`}
        >
          {confirmLabel ?? t('common.confirm')}
        </button>
      </div>
    </Modal>
  );
}
