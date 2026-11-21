import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import ThemeSwitch from '../components/ui/ThemeSwitch';
import QuickRatingPage from './QuickRatingPage';
import { APP_ICON } from '../assets';

export default function PublicQuickRating() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-nasa-gray-900">
      <header className="bg-nasa-gray-800">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 font-bold">
            <img src={APP_ICON} alt="" className="w-8 h-8" /> CaTLX
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="underline">{t('login.cloud_title')}</Link>
            <LanguageSwitcher />
          <ThemeSwitch />
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8"><QuickRatingPage /></main>
    </div>
  );
}
