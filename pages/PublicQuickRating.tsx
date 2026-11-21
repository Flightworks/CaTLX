import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import ThemeSwitch from '../components/ui/ThemeSwitch';
import QuickRatingPage from './QuickRatingPage';
import { APP_ICON } from '../assets';

export default function PublicQuickRating() {
  const { t } = useTranslation();
  return (
    <div className="workspace-shell min-h-screen">
      <header className="border-b border-separator bg-nasa-gray-800">
        <div className="mx-auto flex max-w-[68rem] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <img src={APP_ICON} alt="" className="size-7 rounded-lg" /> CaTLX
          </Link>
          <div className="flex items-center gap-2.5">
            <Link to="/login" className="text-sm text-accent-ink underline">{t('login.cloud_title')}</Link>
            <LanguageSwitcher />
            <ThemeSwitch />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[68rem] p-4 sm:p-6 lg:p-8"><QuickRatingPage /></main>
    </div>
  );
}
