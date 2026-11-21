import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getTheme, setTheme, subscribeToTheme } from '../../theme';

export default function ThemeSwitch() {
  const { t } = useTranslation();
  const currentTheme = useSyncExternalStore(subscribeToTheme, getTheme);
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  return (
    <button type="button" onClick={() => setTheme(nextTheme)}
      className="rounded border border-separator px-2 py-1 text-xs font-medium text-foreground hover:bg-hover-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink">
      {t(nextTheme === 'light' ? 'header.switch_to_light_mode' : 'header.switch_to_dark_mode')}
    </button>
  );
}
