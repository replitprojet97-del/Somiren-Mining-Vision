import { createContext, useContext, useState, type ReactNode } from "react";
import translations, { type Lang, type Translations } from "@/i18n/translations";

type LanguageContextType = {
  lang: Lang;
  t: Translations;
  setLang: (l: Lang) => void;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "fr",
  t: translations.fr as unknown as Translations,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("somiren:lang");
    return stored === "en" ? "en" : "fr";
  });

  const setLang = (l: Lang) => {
    localStorage.setItem("somiren:lang", l);
    setLangState(l);
  };

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang] as unknown as Translations, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
