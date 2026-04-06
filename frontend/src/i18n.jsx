import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from './locales/en.json';
import hi from './locales/hi.json';

const LANGS = { en, hi };
const LANG_KEY = 'prama_lang';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(LANG_KEY) || 'en'; }
    catch { return 'en'; }
  });

  const setLang = useCallback((code) => {
    setLangState(code);
    try { localStorage.setItem(LANG_KEY, code); } catch {}
    document.documentElement.lang = code === 'hi' ? 'hi' : 'en';
  }, []);

  // Set lang attribute on mount
  useEffect(() => {
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
  }, [lang]);

  const t = useCallback((key, fallback) => {
    const dict = LANGS[lang] || LANGS.en;
    return dict[key] || LANGS.en[key] || fallback || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
