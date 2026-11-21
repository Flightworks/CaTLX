type Theme = 'dark' | 'light';

const key = 'catlx-theme';
const change = new Event('catlx-theme-change');

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f7f9' : '#1a1c21');
  window.dispatchEvent(change);
}

export function initializeTheme() {
  try { apply(localStorage.getItem(key) === 'light' ? 'light' : 'dark'); } catch { apply('dark'); }
  window.addEventListener('storage', event => {
    if (event.key === key) apply(event.newValue === 'light' ? 'light' : 'dark');
  });
}

export function setTheme(theme: Theme) {
  apply(theme);
  try { localStorage.setItem(key, theme); } catch { /* The current tab still uses the selected theme. */ }
}

export function subscribeToTheme(listener: () => void) {
  window.addEventListener(change.type, listener);
  return () => window.removeEventListener(change.type, listener);
}
