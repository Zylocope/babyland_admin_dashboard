import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import my from './my.json';

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
      lookupLocalStorage: 'al_lang',
      caches: ['localStorage'],
    },
  });

// Keep <html lang> in sync so font / line-height rules apply
const applyLang = (lng) => { document.documentElement.lang = lng; };
applyLang(i18n.resolvedLanguage || 'en');
i18n.on('languageChanged', applyLang);

export default i18n;
