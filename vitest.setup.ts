import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './public/locales/en.json';

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    resources: {
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
  });
});

afterEach(() => {
  cleanup();
});
