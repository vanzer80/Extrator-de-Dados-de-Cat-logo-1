import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';

type Language = 'en' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getNavigatorLanguage = (): Language => {
  const lang = navigator.language.split('-')[0];
  return lang === 'pt' ? 'pt' : 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(getNavigatorLanguage());
  const [translations, setTranslations] = useState<{ [key: string]: { [key: string]: string } } | null>(null);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // Fetch from the root, as that's where index.html is served from.
        const enResponse = await fetch('./locales/en.json');
        const en = await enResponse.json();
        const ptResponse = await fetch('./locales/pt.json');
        const pt = await ptResponse.json();
        setTranslations({ en, pt });
      } catch (error) {
        console.error('Failed to load translations:', error);
        // In case of error, set empty objects to avoid crashes.
        setTranslations({ en: {}, pt: {} });
      }
    };
    loadTranslations();
  }, []);


  const t = useCallback((key: string, replacements?: { [key: string]: string | number }) => {
    if (!translations) {
      return key; // Return key if translations are not loaded yet
    }
    
    let translation = translations[language]?.[key] || translations['en']?.[key] || key;
    
    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        translation = translation.replace(`{{${placeholder}}}`, String(replacements[placeholder]));
      });
    }
    
    return translation;
  }, [language, translations]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
