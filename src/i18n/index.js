import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import my from './my.json';

const LANG_KEY = 'al_lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      my: { translation: my },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'my'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_KEY,
      // NOT ['localStorage']. The detector's cache writes back whatever it
      // RESOLVED, not what the user chose — so any single resolution that lands
      // on the fallback overwrites a stored preference for good. The browser
      // here reports navigator.languages as ['en-US', 'my'], and 'en-US' is not
      // in supportedLngs, so resolution is one cleanup rule away from 'en'
      // every time it runs. That is a one-way door: Burmese silently becomes
      // English and never comes back, which is exactly what was seen.
      //
      // The stored value is now only ever written by setLanguage below, i.e.
      // when a person actually picks a language.
      caches: [],
    },
  });

// Keep <html lang> in sync so font / line-height rules apply
const applyLang = (lng) => { document.documentElement.lang = lng; };
applyLang(i18n.resolvedLanguage || 'en');
i18n.on('languageChanged', applyLang);

// The only writer of the stored preference. Every language control calls this
// rather than i18n.changeLanguage directly.
export const setLanguage = (lng) => {
  try { localStorage.setItem(LANG_KEY, lng); } catch { /* private mode: honour it for this session only */ }
  return i18n.changeLanguage(lng);
};

export default i18n;
