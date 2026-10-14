import { IconLanguage, IconSun, IconMoon, IconCheck, IconLock, IconAward, IconChevronRight } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import InformationLinks from '../components/common/InformationLinks';
import { setLanguage } from '../i18n';

const STYLE_OPTIONS = [
  { id: 'glass',        labelKey: 'settings.styleGlass' },
  { id: 'neumorphism',  labelKey: 'settings.styleNeu' },
  { id: 'flat',         labelKey: 'settings.styleFlat' },
  { id: 'skeuomorphism',labelKey: 'settings.styleSkeu' },
];

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
      {/* Shop-wide reward rules live on their own page, not here: these
          settings only change this browser's view. */}
      {isManager && (
        <Link to="/rewards" className="surface-card is-sheet p-5 flex items-center gap-3 hover:border-brand transition-colors">
          <div className="w-9 h-9 rounded-full bg-brand-light text-brand flex items-center justify-center flex-shrink-0">
            <IconAward size={18} stroke={1.7} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{t('nav.rewards')}</p>
            <p className="text-[12px] text-sub">{t('rewards.settingsLink')}</p>
          </div>
          <IconChevronRight size={18} stroke={1.6} className="text-mute" />
        </Link>
      )}
      <footer className="pt-2 pb-3 border-t border-app">
        <InformationLinks />
      </footer>
    </div>
  );
}

