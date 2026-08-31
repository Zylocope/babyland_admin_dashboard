import { useState, useRef, useEffect } from 'react';
import { IconChevronDown, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

// Selection on the left (which slice of this resource), actions on the right.
// Keeping one entity per section is what lets the actions stay stable while the
// view changes.
export default function SubBar({ views, view, onView, children }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = views.find(v => v.key === view) ?? views[0];

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-app bg-card text-ink hover:border-brand transition-colors cursor-pointer min-w-52 justify-between"
        >
          <span className="inline-flex items-center gap-2">
            {current.icon && <current.icon size={16} stroke={1.7} className="text-brand" />}
            {current.label}
          </span>
          <IconChevronDown size={15} stroke={1.7} className={`text-mute transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-0 mt-1.5 w-64 surface-menu py-1.5 z-40">
            <p className="px-3.5 pb-1.5 text-[11px] uppercase tracking-wide text-mute">{t('subbar.view')}</p>
            {views.map(v => {
              const active = v.key === current.key;
              return (
                <button
                  key={v.key}
                  onClick={() => { onView(v.key); setOpen(false); }}
                  className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-sm transition-colors cursor-pointer ${active ? 'text-brand bg-brand-light font-medium' : 'text-sub hover:bg-brand-light hover:text-brand'}`}
                >
                  {v.icon && <v.icon size={16} stroke={1.7} />}
                  <span className="flex-1 text-left">{v.label}</span>
                  {active && <IconCheck size={15} stroke={2} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
