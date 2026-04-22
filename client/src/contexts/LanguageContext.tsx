import { createContext, useContext, useState, type ReactNode } from "react";
import { type Language, type Translations, translations, ru } from "./translations";

export type { Language, Translations };
export { translations };

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ru",
  setLang: () => {},
  t: ru,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("kc_lang");
    return (saved === "uz" || saved === "ru") ? saved : "ru";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("kc_lang", newLang);
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
