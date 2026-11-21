
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { APP_ICON } from './assets';
import initI18n from './i18n-init';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Set the favicon dynamically from the assets file
const faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
if (faviconLink) {
  faviconLink.href = APP_ICON;
  const typeMatch = APP_ICON.match(/\.([^.]+)$/);
  if (typeMatch) {
    faviconLink.type = `image/${typeMatch[1]}`;
  }
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


