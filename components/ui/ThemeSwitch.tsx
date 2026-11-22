import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getTheme, setTheme, subscribeToTheme } from '../../theme';

export default function ThemeSwitch() {
  const { t } = useTranslation();
  const currentTheme = useSyncExternalStore(subscribeToTheme, getTheme);
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  const label = t(nextTheme === 'light' ? 'header.switch_to_light_mode' : 'header.switch_to_dark_mode');
  return (
    <button type="button" onClick={() => setTheme(nextTheme)} title={label} aria-label={label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-nasa-gray-300 hover:bg-hover-surface hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink">
      <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {nextTheme === 'light' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
          </>
        ) : (
          <path d="M20.9 13.35A9 9 0 0 1 10.65 3.1 9 9 0 1 0 20.9 13.35Z" />
        )}
      </svg>
    </button>
  );
}
