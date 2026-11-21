import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './public/locales/en.json';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

await i18n.use(initReactI18next).init({
  lng: 'en', resources: { en: { translation: en } }, interpolation: { escapeValue: false },
});

afterEach(() => {
  cleanup();
});
