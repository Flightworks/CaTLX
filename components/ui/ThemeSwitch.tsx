import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getTheme, setTheme, subscribeToTheme } from '../../theme';

export default function ThemeSwitch() {
  const { t } = useTranslation();
  const light = useSyncExternalStore(subscribeToTheme, getTheme) === 'light';
  return (
    <button type="button" data-theme-toggle aria-pressed={light} onClick={() => setTheme(light ? 'dark' : 'light')}
      className="rounded border border-separator px-2 py-1 text-xs font-medium text-foreground hover:bg-hover-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink">
      {t('header.light_mode')}
    </button>
  );
}
