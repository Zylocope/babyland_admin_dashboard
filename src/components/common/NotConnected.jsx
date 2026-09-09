import { IconPlugConnectedX } from '@tabler/icons-react';

// Says plainly that a screen is not wired to the backend.
//
// The empty tables already said "no backend endpoint yet", but only once the
// table was reached and only when it was empty — which reads as "no data today"
// rather than "this is not connected". Anything that looks like a real screen
// full of real numbers has to admit when it is not.
export default function NotConnected({ children }) {
  return (
    <div
      className="surface-card p-4 flex items-start gap-3 border-l-4"
      style={{ borderLeftColor: 'var(--status-pending)' }}
      role="status"
    >
      <IconPlugConnectedX size={18} stroke={1.7} className="mt-0.5 flex-shrink-0"
        style={{ color: 'var(--status-pending)' }} />
      <p className="text-[13px] text-sub leading-relaxed">{children}</p>
    </div>
  );
}
