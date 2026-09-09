import { IconX } from '@tabler/icons-react';
import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const titleId = useId();
  const { t } = useTranslation();

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Remember where focus came from so it can go back; otherwise closing a
    // dialog drops the caret to the top of the document.
    returnFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusables = () => [...panel.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter(el => el.offsetParent !== null);

    (focusables()[0] ?? panel).focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab') return;
      // Trap: without this, tabbing walks out of the dialog and into the page
      // behind it, which is still visible but not meant to be reachable.
      const items = focusables();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative surface-card no-lens w-full ${widths[size]} max-h-[90vh] flex flex-col focus:outline-none`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-app">
          <h2 id={titleId} className="text-md font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label={t('common.close')}
            className="p-1.5 rounded-lg text-mute hover:text-ink hover:bg-brand-light transition-colors cursor-pointer">
            <IconX size={18} stroke={1.5} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}
