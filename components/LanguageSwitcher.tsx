import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { GlobeIcon } from './icons';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as 'en' | 'pt');
  };

  return (
    <div className="relative">
      <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      <select
        value={language}
        onChange={handleLanguageChange}
        className="appearance-none bg-gray-800/50 border border-gray-700 text-gray-300 text-sm rounded-md pl-10 pr-4 py-2 hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-colors"
        aria-label={t('selectLanguage')}
      >
        <option value="en">English</option>
        <option value="pt">Português</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;