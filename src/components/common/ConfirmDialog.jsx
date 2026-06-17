import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sub text-sm mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-app text-sub hover:bg-brand-light transition-colors cursor-pointer">
          Cancel
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`px-4 py-2 text-sm rounded-lg font-medium text-white transition-colors cursor-pointer ${danger ? 'bg-[#EF4444] hover:brightness-95' : 'bg-brand hover:bg-brand-hover'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
