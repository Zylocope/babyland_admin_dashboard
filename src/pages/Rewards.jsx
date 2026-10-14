import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconCoin, IconCoins, IconTicket, IconGift, IconMinus, IconPlus, IconDeviceFloppy, IconArrowBackUp, IconRefresh, IconInfoCircle,
} from '@tabler/icons-react';
import Skeleton from '../components/common/Skeleton';
import { getStoreSettings, updateStoreSetting } from '../services/settingsService';
import { formatMMK } from '../utils/currency';

// Shop-wide reward rules, stored in the backend settings table. Unlike
// Settings (language, theme) these change what every customer earns, so they
// get their own page. Manager only; the backend enforces that as well.
const KEYS = ['kyat_per_point', 'one_point_to_kyat', 'free_ticket_amount'];
const KYAT_PRESETS = [1000, 5000, 10000, 20000];
const TICKET_MIN = 1;
const TICKET_MAX = 50;

function Card({ icon: Icon, title, help, children }) {
  return (
    <section className="surface-card is-sheet p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-brand-light text-brand flex items-center justify-center flex-shrink-0">
          <Icon size={20} stroke={1.7} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-ink">{title}</h3>
          <p className="text-[13px] text-sub mt-0.5">{help}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// Save / Undo under each rule, so one rule can be changed without touching the others.
function Actions({ dirty, saving, onSave, onUndo, message, t }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
      {message?.text && (
        <p role="status" className={`mr-auto text-[12px] ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</p>
      )}
      {dirty && !saving && (
        <button type="button" onClick={onUndo}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-app text-sub hover:text-brand hover:border-brand cursor-pointer">
          <IconArrowBackUp size={16} stroke={1.7} /> {t('rewards.undo')}
        </button>
      )}
      <button type="button" onClick={onSave} disabled={!dirty || saving} className="btn-primary justify-center disabled:opacity-45">
        {saving ? <span className="animate-pulse">{t('settings.saving')}</span>
          : <><IconDeviceFloppy size={16} stroke={1.8} /> {t('common.saveChanges')}</>}
      </button>
    </div>
  );
}

function KyatInput({ id, value, onChange, label }) {
  return (
    <span className="relative inline-block w-40 align-middle">
      <input id={id} type="number" min="1" step="1" inputMode="numeric" value={value} aria-label={label}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-brand/40 bg-brand-light px-3 py-2 pr-14 text-lg font-semibold text-brand tabular-nums focus:outline-none focus:ring-2 focus:ring-brand [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand">MMK</span>
    </span>
  );
}

function Presets({ value, onPick }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {KYAT_PRESETS.map(v => (
        <button key={v} type="button" onClick={() => onPick(String(v))} aria-pressed={Number(value) === v}
          className={`px-3 py-1 text-xs rounded-full border tabular-nums cursor-pointer transition-colors ${Number(value) === v ? 'border-brand bg-brand text-white' : 'border-app text-sub hover:border-brand hover:text-brand'}`}>
          {formatMMK(v)}
        </button>
      ))}
    </div>
  );
}

export default function Rewards() {
  const { t } = useTranslation();
  const [load, setLoad] = useState({ status: 'loading', saved: {}, error: '' });
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState('');
  const [notice, setNotice] = useState({ key: '', type: '', text: '' });

  const fetchRules = () => getStoreSettings().then(rows => {
    const saved = Object.fromEntries((Array.isArray(rows) ? rows : [])
      .filter(r => KEYS.includes(r.key)).map(r => [r.key, String(r.value ?? '')]));
    setLoad({ status: 'ok', saved, error: '' });
    setDrafts(saved);
  });

  useEffect(() => {
    let active = true;
    getStoreSettings()
      .then(rows => {
        if (!active) return;
        const saved = Object.fromEntries((Array.isArray(rows) ? rows : [])
          .filter(r => KEYS.includes(r.key)).map(r => [r.key, String(r.value ?? '')]));
        setLoad({ status: 'ok', saved, error: '' });
        setDrafts(saved);
      })
      .catch(err => { if (active) setLoad({ status: 'error', saved: {}, error: err?.message || t('settings.storeRulesFailed') }); });
    return () => { active = false; };
  }, [t]);

  const retry = () => {
    setLoad({ status: 'loading', saved: {}, error: '' });
    fetchRules().catch(err => setLoad({ status: 'error', saved: {}, error: err?.message || t('settings.storeRulesFailed') }));
  };

  const setDraft = (key, v) => {
    setDrafts(cur => ({ ...cur, [key]: v }));
    if (notice.key === key) setNotice({ key: '', type: '', text: '' });
  };
  const dirty = key => String(drafts[key] ?? '').trim() !== String(load.saved[key] ?? '');
  const undo = key => setDraft(key, load.saved[key]);
  const msg = key => (notice.key === key ? notice : null);

  const save = async (key, integer) => {
    const value = Number(String(drafts[key] ?? '').trim());
    if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
      setNotice({ key, type: 'error', text: t('settings.positiveNumber') });
      return;
    }
    setSaving(key);
    try {
      const updated = await updateStoreSetting(key, { value });
      const v = String(updated?.value ?? value);
      setLoad(cur => ({ ...cur, saved: { ...cur.saved, [key]: v } }));
      setDrafts(cur => ({ ...cur, [key]: v }));
      setNotice({ key, type: 'success', text: t('settings.saved') });
    } catch (err) {
      setNotice({ key, type: 'error', text: err?.message || t('settings.saveFailed') });
    } finally {
      setSaving('');
    }
  };

  if (load.status === 'loading') {
    return (
      <div className="mobile-page max-w-3xl space-y-5 skeleton-row" aria-label={t('common.loading')}>
        {[0, 1, 2].map(i => <div key={i} className="surface-card is-sheet p-6 space-y-3"><Skeleton w={200} h={14} /><Skeleton h={44} /></div>)}
      </div>
    );
  }
  if (load.status === 'error') {
    return (
      <div className="mobile-page max-w-3xl">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex-1 min-w-48">{load.error}</span>
          <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 font-medium cursor-pointer">
            <IconRefresh size={15} /> {t('assistant.retry')}
          </button>
        </div>
      </div>
    );
  }

  const earn = Number(drafts.kyat_per_point);
  const worth = Number(drafts.one_point_to_kyat);
  const tickets = Number(drafts.free_ticket_amount);
  const stepTickets = d => setDraft('free_ticket_amount', String(Math.min(TICKET_MAX, Math.max(TICKET_MIN, (Number.isFinite(tickets) ? tickets : 10) + d))));
  const has = key => key in load.saved;

  return (
    <div className="mobile-page max-w-3xl space-y-5">
      <p className="text-[13px] text-sub">{t('rewards.intro')}</p>

      {has('kyat_per_point') && (
        <Card icon={IconCoin} title={t('rewards.earnTitle')} help={t('rewards.earnHelp')}>
          <p className="text-[15px] text-ink leading-[2.6] flex flex-wrap items-center gap-x-2">
            {t('rewards.earnBefore')}
            <KyatInput id="kyat_per_point" value={drafts.kyat_per_point ?? ''} label={t('rewards.earnTitle')}
              onChange={v => setDraft('kyat_per_point', v)} />
            {t('rewards.earnAfter')}
          </p>
          <Presets value={drafts.kyat_per_point} onPick={v => setDraft('kyat_per_point', v)} />
          {earn > 0 && (
            <p className="mt-3 text-[12px] text-sub">{t('rewards.earnExample', { amount: formatMMK(earn * 5) })}</p>
          )}
          <Actions t={t} dirty={dirty('kyat_per_point')} saving={saving === 'kyat_per_point'} message={msg('kyat_per_point')}
            onSave={() => save('kyat_per_point', false)} onUndo={() => undo('kyat_per_point')} />
        </Card>
      )}

      {has('one_point_to_kyat') && (
        <Card icon={IconCoins} title={t('rewards.worthTitle')} help={t('rewards.worthHelp')}>
          <p className="text-[15px] text-ink leading-[2.6] flex flex-wrap items-center gap-x-2">
            {t('rewards.worthBefore')}
            <KyatInput id="one_point_to_kyat" value={drafts.one_point_to_kyat ?? ''} label={t('rewards.worthTitle')}
              onChange={v => setDraft('one_point_to_kyat', v)} />
          </p>
          <Presets value={drafts.one_point_to_kyat} onPick={v => setDraft('one_point_to_kyat', v)} />
          {/* The two rates together are what the shop is giving away: worth
              per point over spend per point. 10,000 / 10,000 is 100% back. */}
          {earn > 0 && worth > 0 && (
            <p className={`mt-3 text-[12px] ${worth / earn > 0.2 ? 'text-amber-600 font-medium' : 'text-sub'}`}>
              {t('rewards.cashback', { pct: Math.round((worth / earn) * 1000) / 10, points: 100, value: formatMMK(worth * 100) })}
            </p>
          )}
          <p className="mt-2 flex items-start gap-1.5 text-[12px] text-mute">
            <IconInfoCircle size={14} stroke={1.7} className="mt-px flex-shrink-0" /> {t('rewards.worthPending')}
          </p>
          <Actions t={t} dirty={dirty('one_point_to_kyat')} saving={saving === 'one_point_to_kyat'} message={msg('one_point_to_kyat')}
            onSave={() => save('one_point_to_kyat', false)} onUndo={() => undo('one_point_to_kyat')} />
        </Card>
      )}

      {has('free_ticket_amount') && (
        <Card icon={IconTicket} title={t('rewards.ticketTitle')} help={t('rewards.ticketHelp')}>
          <div className="flex items-center justify-center gap-4">
            <button type="button" onClick={() => stepTickets(-1)} disabled={tickets <= TICKET_MIN}
              aria-label={t('rewards.fewer')}
              className="w-12 h-12 rounded-full border border-app text-ink flex items-center justify-center hover:border-brand hover:text-brand disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors">
              <IconMinus size={20} stroke={2} />
            </button>
            <input type="number" min={TICKET_MIN} max={TICKET_MAX} step="1" inputMode="numeric"
              value={drafts.free_ticket_amount ?? ''} aria-label={t('rewards.ticketTitle')}
              onChange={e => setDraft('free_ticket_amount', e.target.value)}
              className="w-24 text-center rounded-xl border border-brand/40 bg-brand-light py-2 text-3xl font-bold text-brand tabular-nums focus:outline-none focus:ring-2 focus:ring-brand [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            <button type="button" onClick={() => stepTickets(1)} disabled={tickets >= TICKET_MAX}
              aria-label={t('rewards.more')}
              className="w-12 h-12 rounded-full border border-app text-ink flex items-center justify-center hover:border-brand hover:text-brand disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors">
              <IconPlus size={20} stroke={2} />
            </button>
          </div>
          {/* The rule drawn out: N paid tickets, then the free one. */}
          {Number.isInteger(tickets) && tickets >= TICKET_MIN && tickets <= TICKET_MAX && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1" aria-hidden="true">
              {Array.from({ length: Math.min(tickets, 20) }, (_, i) => (
                <IconTicket key={i} size={18} stroke={1.5} className="text-mute" />
              ))}
              {tickets > 20 && <span className="text-xs text-mute">+{tickets - 20}</span>}
              <span className="mx-1 text-mute">→</span>
              <IconGift size={22} stroke={1.8} className="text-brand" />
            </div>
          )}
          <p className="mt-2 text-center text-[13px] text-ink">
            {Number.isInteger(tickets) && tickets >= TICKET_MIN ? t('rewards.ticketRule', { count: tickets }) : t('settings.positiveNumber')}
          </p>
          <Actions t={t} dirty={dirty('free_ticket_amount')} saving={saving === 'free_ticket_amount'} message={msg('free_ticket_amount')}
            onSave={() => save('free_ticket_amount', true)} onUndo={() => undo('free_ticket_amount')} />
        </Card>
      )}

      {KEYS.every(k => !has(k)) && <p className="text-sm text-sub">{t('settings.noStoreRules')}</p>}
    </div>
  );
}
