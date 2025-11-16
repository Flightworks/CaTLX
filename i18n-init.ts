
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const initI18n = async () => {
  await i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      debug: true,
      fallbackLng: 'en',
      defaultNS: 'translation',
      ns: ['translation'],
      interpolation: {
        escapeValue: false, // not needed for react as it escapes by default
      },
      backend: {
        // Use Vite's base URL so locales resolve correctly when deployed to a sub-path (e.g. GitHub Pages)
        loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}.json`,
      }
    });
};

export default initI18n;
