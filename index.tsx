
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { APP_ICON } from './assets';
import initI18n from './i18n-init';

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
  await initI18n();
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();


