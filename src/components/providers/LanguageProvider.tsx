"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ContentLanguage = "en" | "ko";

type LanguageContextValue = {
  lang: ContentLanguage;
  setLang: (lang: ContentLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "fate_content_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<ContentLanguage>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ko") {
      setLangState(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang: (next: ContentLanguage) => setLangState(next),
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useContentLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useContentLanguage must be used within LanguageProvider");
  }
  return context;
}
