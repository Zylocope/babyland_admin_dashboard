import { IconX } from '@tabler/icons-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-card rounded-xl shadow-hover w-full ${widths[size]} max-h-[90vh] flex flex-col border border-app`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-app">
          <h2 className="text-md font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-mute hover:text-ink hover:bg-brand-light transition-colors cursor-pointer">
            <IconX size={18} stroke={1.5} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}
