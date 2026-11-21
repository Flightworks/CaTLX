
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import initI18n from './i18n-init';
import './index.css';
import { initializeTheme } from './theme';

initializeTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

(async () => {
  const siteUrl = import.meta.env.MODE !== 'github-pages' ? import.meta.env.VITE_CATLX_SITE_URL : undefined;
  if (siteUrl && window.location.origin !== new URL(siteUrl).origin) {
    window.location.replace(siteUrl);
    return;
  }

  await initI18n();
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();


