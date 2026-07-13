import { IconLanguage, IconSun, IconMoon, IconCheck, IconLock } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const STYLE_OPTIONS = [
  { id: 'glass',        labelKey: 'settings.styleGlass' },
  { id: 'neumorphism',  labelKey: 'settings.styleNeu' },
  { id: 'flat',         labelKey: 'settings.styleFlat' },
  { id: 'skeuomorphism',labelKey: 'settings.styleSkeu' },
];

function Section({ title, desc, children }) {
  return (
    <div className="surface-card p-6">
      <h3 className="font-semibold text-ink">{title}</h3>
      {desc && <p className="text-[13px] text-sub mt-0.5 mb-4">{desc}</p>}
      <div className={desc ? '' : 'mt-4'}>{children}</div>
    </div>
  );
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { darkMode, toggleDark, styleTheme, setStyle, activeStyles } = useTheme();
  const isMy = i18n.resolvedLanguage === 'my';

  const Toggle = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
        active ? 'bg-brand text-white border-brand' : 'bg-card text-sub border-app hover:border-brand hover:text-brand'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="max-w-3xl space-y-5">
      {/* Language */}
      <Section title={t('settings.language')} desc={t('settings.languageDesc')}>
        <div className="flex items-center gap-2">
          <IconLanguage size={18} stroke={1.5} className="text-mute mr-1" />
          <Toggle active={!isMy} onClick={() => i18n.changeLanguage('en')}>English</Toggle>
          <Toggle active={isMy} onClick={() => i18n.changeLanguage('my')}>မြန်မာ</Toggle>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STYLE_OPTIONS.map(opt => {
            const enabled = activeStyles.includes(opt.id);
            const selected = styleTheme === opt.id;
            return (
              <button
                key={opt.id}
                disabled={!enabled}
                onClick={() => enabled && setStyle(opt.id)}
                className={`relative rounded-xl border p-4 text-left transition-all ${
                  selected ? 'border-brand ring-2 ring-brand/30' : 'border-app'
                } ${enabled ? 'cursor-pointer hover:border-brand bg-card' : 'opacity-55 cursor-not-allowed bg-base'}`}
              >
                <div className="flex items-center justify-between">
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
    </div>
  );
}
