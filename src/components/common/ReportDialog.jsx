import { useState } from 'react';
import { IconPrinter, IconFileSpreadsheet, IconDownload, IconLoader2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

// Pick what goes in the report, then print it or take it away as a file.
//
// The old export followed whichever view was on screen, so the manager sitting
// on the channel view got a five-row metric table and nothing else — with no way
// to ask for the daily breakdown without navigating there first. Every dataset is
// already in memory regardless of view; this just lets you choose.
export default function ReportDialog({ open, onClose, sections, onPrint, onExcel, onCsv }) {
  const { t } = useTranslation();
  // A section either carries its rows already, or knows how to fetch them. The
  // second kind reports a count up front so the list is honest about size
  // without paying for the request until it is wanted.
  const available = sections.filter(s => (s.load ? s.count > 0 : s.rows.length > 0));
  const [picked, setPicked] = useState(() => available.filter(s => !s.load).map(s => s.key));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (key) =>
    setPicked(list => (list.includes(key) ? list.filter(k => k !== key) : [...list, key]));

  const chosen = available.filter(s => picked.includes(s.key));

  const run = async (fn) => {
    if (!chosen.length || busy) return;
    setError('');
    setBusy(true);
    try {
      // Resolve the lazy ones first, so whatever runs next has real rows.
      const ready = await Promise.all(chosen.map(async section =>
        (section.load ? { ...section, rows: await section.load() } : section)
      ));
      fn(ready.filter(section => section.rows.length > 0));
      onClose();
    } catch (err) {
      setError(err?.message || t('report.loadFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('report.title')} size="md">
      <p className="text-[13px] text-sub mb-4">{t('report.intro')}</p>

      <div className="space-y-1">
        {available.map(section => (
          <label key={section.key}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-app hover:border-brand cursor-pointer transition-colors">
            <input type="checkbox" checked={picked.includes(section.key)}
              onChange={() => toggle(section.key)} className="w-4 h-4 accent-[var(--orange-primary)]" />
            <span className="flex-1 min-w-0 text-sm text-ink">{section.name}</span>
            <span className="text-[11px] text-mute tabular-nums flex-shrink-0">
              {t('report.rows', { count: section.load ? section.count : section.rows.length })}
            </span>
          </label>
        ))}
      </div>

      {/* An empty dataset is not offered at all — a sheet with only headers is
          a worse answer than not listing it. */}
      {available.length === 0 && (
        <p className="py-6 text-center text-sm text-mute">{t('report.nothing')}</p>
      )}

      <div className="flex flex-wrap gap-2 mt-6">
        <button type="button" onClick={() => run(onPrint)} disabled={!chosen.length || busy}
          className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
          {busy ? <IconLoader2 size={17} className="animate-spin" /> : <IconPrinter size={17} stroke={1.8} />} {t('report.print')}
        </button>
        <button type="button" onClick={() => run(onExcel)} disabled={!chosen.length || busy}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-xl border border-app text-sub hover:text-brand hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
          <IconFileSpreadsheet size={16} stroke={1.7} /> {t('subbar.exportExcel')}
        </button>
        <button type="button" onClick={() => run(onCsv)} disabled={!chosen.length || busy}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-xl border border-app text-sub hover:text-brand hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
          <IconDownload size={16} stroke={1.7} /> {t('subbar.exportCsv')}
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-red-500 mt-3">{error}</p>}
      <p className="text-[11px] text-mute mt-3">{t('report.printHint')}</p>
    </Modal>
  );
}
