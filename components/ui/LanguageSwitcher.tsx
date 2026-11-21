
import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const current = (i18n.language || '').split('-')[0];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center space-x-2">
      <button onClick={() => changeLanguage('en')} className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${current === 'en' ? 'bg-nasa-light-blue text-white' : 'hover:bg-nasa-gray-700'}`} aria-label="English" aria-pressed={current === 'en'}>
        EN
      </button>
      <button onClick={() => changeLanguage('fr')} className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${current === 'fr' ? 'bg-nasa-light-blue text-white' : 'hover:bg-nasa-gray-700'}`} aria-label="Français" aria-pressed={current === 'fr'}>
        FR
      </button>
    </div>
  );
};

export default LanguageSwitcher;
