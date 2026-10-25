"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Language } from "@/lib/api";

const KEY = "ask-sikhi:lang";

const LanguageContext = createContext<{ lang: Language; setLang: (l: Language) => void }>({ lang: "en", setLang: () => {} });

/** The reader's language choice, remembered on this device. Answers and key labels follow it. */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "pa" || saved === "en") setLangState(saved);
    } catch {
      // Storage blocked: stay in English.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "pa" ? "pa" : "en";
  }, [lang]);

  function setLang(l: Language) {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // The choice lasts for this page only.
    }
  }

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

const STRINGS = {
  today: { en: "Today", pa: "ਅੱਜ" },
  vichaar: { en: "Vichaar", pa: "ਵਿਚਾਰ" },
  library: { en: "Library", pa: "ਲਾਇਬ੍ਰੇਰੀ" },
  news: { en: "News", pa: "ਖ਼ਬਰਾਂ" },
  gurbani: { en: "Gurbani", pa: "ਗੁਰਬਾਣੀ" },
  answer: { en: "Answer", pa: "ਜਵਾਬ" },
  related: { en: "Related", pa: "ਹੋਰ ਸਵਾਲ" },
  gurbaniBehind: { en: "Gurbani behind this answer", pa: "ਇਸ ਜਵਾਬ ਪਿੱਛੇ ਗੁਰਬਾਣੀ" },
  askPlaceholder: { en: "Ask anything about Sikhi…", pa: "ਸਿੱਖੀ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ…" },
  followUpPlaceholder: { en: "Ask a follow-up…", pa: "ਅਗਲਾ ਸਵਾਲ ਪੁੱਛੋ…" },
  discussPlaceholder: { en: "Ask anything about this shabad…", pa: "ਇਸ ਸ਼ਬਦ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ…" },
  keepDiscussing: { en: "Keep discussing…", pa: "ਵਿਚਾਰ ਜਾਰੀ ਰੱਖੋ…" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function useT() {
  const { lang } = useLanguage();
  return (key: StringKey) => STRINGS[key][lang];
}

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
        EN
      </button>
      <button type="button" aria-pressed={lang === "pa"} onClick={() => setLang("pa")} lang="pa" aria-label="ਪੰਜਾਬੀ">
        ਪੰ
      </button>
    </div>
  );
}
