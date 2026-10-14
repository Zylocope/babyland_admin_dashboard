import { useEffect, useState } from 'react';
import { IconLanguage, IconSun, IconMoon, IconCheck, IconLock, IconCoin, IconDeviceFloppy, IconRefresh, IconTicket } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import InformationLinks from '../components/common/InformationLinks';
import Skeleton from '../components/common/Skeleton';
import { getStoreSettings, updateStoreSetting } from '../services/settingsService';
import { setLanguage } from '../i18n';

const STYLE_OPTIONS = [
  { id: 'glass',        labelKey: 'settings.styleGlass' },
  { id: 'neumorphism',  labelKey: 'settings.styleNeu' },
  { id: 'flat',         labelKey: 'settings.styleFlat' },
  { id: 'skeuomorphism',labelKey: 'settings.styleSkeu' },
];

// Only expose rules that the backend actually reads. one_point_to_kyat is
// seeded too, but nothing redeems points yet, so a control for it would save
// without changing anything.
const ACTIVE_STORE_SETTINGS = {
  kyat_per_point: {
    labelKey: 'settings.kyatPerPoint',
    helpKey: 'settings.kyatPerPointHelp',
    unitKey: 'settings.mmk',
    icon: IconCoin,
  },
  free_ticket_amount: {
    labelKey: 'settings.freeTicketAmount',
    helpKey: 'settings.freeTicketAmountHelp',
    unitKey: 'settings.tickets',
    icon: IconTicket,
  },
};

function Section({ title, desc, children }) {
  return (
    <div className="surface-card is-sheet p-6">
      <h3 className="font-semibold text-ink">{title}</h3>
      {desc && <p className="text-[13px] text-sub mt-0.5 mb-4">{desc}</p>}
      <div className={desc ? '' : 'mt-4'}>{children}</div>
    </div>
  );
}

function Toggle({ active, onClick, children }) {
  return (
    <button
      onClick={onClick} aria-pressed={active}
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
        active ? 'bg-brand text-white border-brand' : 'bg-card text-sub border-app hover:border-brand hover:text-brand'
      }`}
    >
      {children}
    </button>
  );
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { isManager } = useAuth();
  const { darkMode, toggleDark, styleTheme, setStyle, activeStyles } = useTheme();
  const isMy = i18n.resolvedLanguage === 'my';
  const [store, setStore] = useState({ status: 'loading', rows: [], error: '' });
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState('');
  const [notice, setNotice] = useState({ key: '', type: '', text: '' });

  useEffect(() => {
    if (!isManager) return undefined;
    let active = true;
    getStoreSettings()
      .then(rows => {
        if (!active) return;
        const supported = (Array.isArray(rows) ? rows : []).filter(row => ACTIVE_STORE_SETTINGS[row.key]);
        setStore({ status: 'ok', rows: supported, error: '' });
        setDrafts(Object.fromEntries(supported.map(row => [row.key, String(row.value ?? '')])));
      })
      .catch(err => {
        if (active) setStore({ status: 'error', rows: [], error: err?.message || t('settings.storeRulesFailed') });
      });
    return () => { active = false; };
  }, [isManager, t]);

  const retryStoreSettings = () => {
    setStore({ status: 'loading', rows: [], error: '' });
    setNotice({ key: '', type: '', text: '' });
    getStoreSettings()
      .then(rows => {
        const supported = (Array.isArray(rows) ? rows : []).filter(row => ACTIVE_STORE_SETTINGS[row.key]);
        setStore({ status: 'ok', rows: supported, error: '' });
        setDrafts(Object.fromEntries(supported.map(row => [row.key, String(row.value ?? '')])));
      })
      .catch(err => setStore({ status: 'error', rows: [], error: err?.message || t('settings.storeRulesFailed') }));
  };

  const saveStoreSetting = async (row) => {
    const raw = String(drafts[row.key] ?? '').trim();
    const value = Number(raw);
    if (!raw || !Number.isFinite(value) || value <= 0 || (row.value_type === 'integer' && !Number.isInteger(value))) {
      setNotice({ key: row.key, type: 'error', text: t('settings.positiveNumber') });
      return;
    }

    setSaving(row.key);
    setNotice({ key: row.key, type: '', text: '' });
    try {
      const updated = await updateStoreSetting(row.key, { value });
      setStore(current => ({
        ...current,
        rows: current.rows.map(item => item.key === row.key ? updated : item),
      }));
      setDrafts(current => ({ ...current, [row.key]: String(updated.value ?? value) }));
      setNotice({ key: row.key, type: 'success', text: t('settings.saved') });
    } catch (err) {
      setNotice({ key: row.key, type: 'error', text: err?.message || t('settings.saveFailed') });
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="mobile-page settings-page max-w-3xl space-y-5">
      {/* Language */}
      <Section title={t('settings.language')} desc={t('settings.languageDesc')}>
        <div className="flex items-center gap-2">
          <IconLanguage size={18} stroke={1.5} className="text-mute mr-1" />
          <Toggle active={!isMy} onClick={() => setLanguage('en')}>English</Toggle>
          <Toggle active={isMy} onClick={() => setLanguage('my')}>မြန်မာ</Toggle>
        </div>
      </Section>

      {/* Appearance mode */}
      <Section title={t('settings.mode')} desc={t('settings.modeDesc')}>
        <div className="flex items-center gap-2">
          <Toggle active={!darkMode} onClick={() => darkMode && toggleDark()}>
            <span className="inline-flex items-center gap-1.5"><IconSun size={16} stroke={1.5} /> {t('settings.light')}</span>
          </Toggle>
          <Toggle active={darkMode} onClick={() => !darkMode && toggleDark()}>
            <span className="inline-flex items-center gap-1.5"><IconMoon size={16} stroke={1.5} /> {t('settings.dark')}</span>
          </Toggle>
        </div>
      </Section>

      {/* Theme style */}
      <Section title={t('settings.theme')} desc={t('settings.themeDesc')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STYLE_OPTIONS.map(opt => {
            const enabled = activeStyles.includes(opt.id);
            const selected = styleTheme === opt.id;
            return (
              <button
                key={opt.id}
                disabled={!enabled} aria-pressed={selected}
                onClick={() => enabled && setStyle(opt.id)}
                className={`relative rounded-xl border p-4 text-left transition-colors ${
                  selected ? 'border-brand ring-2 ring-brand/30' : 'border-app'
                } ${enabled ? 'cursor-pointer hover:border-brand bg-card' : 'opacity-55 cursor-not-allowed bg-base'}`}
              >
                <div aria-hidden="true" className={`theme-preview preview-${opt.id} mb-4`}><i /><span><b /><b /><b /></span></div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{t(opt.labelKey)}</span>
                  {selected && <IconCheck size={16} stroke={2} className="text-brand" />}
                  {!enabled && <IconLock size={14} stroke={1.5} className="text-mute" />}
                </div>
                <p className="text-[11px] text-mute mt-1">
                  {enabled ? t('settings.available') : t('settings.comingSoon')}
                </p>
              </button>
            );
          })}
        </div>
      </Section>

      {isManager && (
        <Section title={t('settings.storeRules')} desc={t('settings.storeRulesDesc')}>
          {store.status === 'loading' && (
            <div className="space-y-3 skeleton-row" aria-label={t('common.loading')}>
              <Skeleton w={180} h={14} />
              <Skeleton h={42} />
            </div>
          )}

          {store.status === 'error' && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="flex-1 min-w-48">{store.error}</span>
              <button type="button" onClick={retryStoreSettings} className="inline-flex items-center gap-1.5 font-medium cursor-pointer">
                <IconRefresh size={15} /> {t('assistant.retry')}
              </button>
            </div>
          )}

          {store.status === 'ok' && store.rows.length === 0 && (
            <p className="text-sm text-sub">{t('settings.noStoreRules')}</p>
          )}

          {store.status === 'ok' && store.rows.map(row => {
            const meta = ACTIVE_STORE_SETTINGS[row.key];
            const Icon = meta.icon;
            const unchanged = String(row.value ?? '') === String(drafts[row.key] ?? '').trim();
            const message = notice.key === row.key ? notice : null;
            return (
              <div key={row.key} className="rounded-xl border border-app bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-light text-brand flex items-center justify-center flex-shrink-0">
                    <Icon size={18} stroke={1.7} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`setting-${row.key}`} className="text-sm font-semibold text-ink">{t(meta.labelKey)}</label>
                    <p className="text-[12px] text-sub mt-0.5">{t(meta.helpKey)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <input
                      id={`setting-${row.key}`}
                      type="number"
                      min="1"
                      step={row.value_type === 'integer' ? '1' : 'any'}
                      inputMode="decimal"
                      value={drafts[row.key] ?? ''}
                      onChange={event => {
                        setDrafts(current => ({ ...current, [row.key]: event.target.value }));
                        if (notice.key === row.key) setNotice({ key: '', type: '', text: '' });
                      }}
                      className="w-full rounded-lg border border-app bg-card px-3 py-2 pr-16 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-mute">{t(meta.unitKey)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveStoreSetting(row)}
                    disabled={saving === row.key || unchanged}
                    className="btn-primary justify-center sm:min-w-28 disabled:opacity-45"
                  >
                    {saving === row.key
                      ? <span className="animate-pulse">{t('settings.saving')}</span>
                      : <><IconDeviceFloppy size={16} stroke={1.8} /> {t('common.saveChanges')}</>}
                  </button>
                </div>
                {message?.text && (
                  <p role="status" className={`mt-2 text-[12px] ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {message.text}
                  </p>
                )}
              </div>
            );
          })}
        </Section>
      )}
      <footer className="pt-2 pb-3 border-t border-app">
        <InformationLinks />
      </footer>
    </div>
  );
}

