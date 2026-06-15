import { createContext, useContext, useState } from "react";
import { translations } from "../i18n/translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    () => localStorage.getItem("ac_lang") ?? "en"
  );

  const setLanguage = (l) => {
    setLang(l);
    localStorage.setItem("ac_lang", l);
  };

  // t("key") — with optional interpolation: t("hello_{name}", { name: "Alice" })
  const t = (key, vars) => {
    const str = translations[lang]?.[key] ?? translations["en"]?.[key] ?? key;
    if (!vars) return str;
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, v),
      str
    );
  };

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
