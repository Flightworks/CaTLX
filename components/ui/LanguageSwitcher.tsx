
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
      <button onClick={() => changeLanguage('en')} className={`p-1 rounded-md transition-colors ${current === 'en' ? 'bg-nasa-light-blue' : 'hover:bg-nasa-gray-700'}`} aria-label="English">
        <img src="https://flagcdn.com/gb.svg" alt="English" className="w-6 h-4" />
      </button>
      <button onClick={() => changeLanguage('fr')} className={`p-1 rounded-md transition-colors ${current === 'fr' ? 'bg-nasa-light-blue' : 'hover:bg-nasa-gray-700'}`} aria-label="French">
        <img src="https://flagcdn.com/fr.svg" alt="French" className="w-6 h-4" />
      </button>
    </div>
  );
};

export default LanguageSwitcher;
