import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { APP_ICON } from './assets';

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
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}
