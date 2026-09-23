"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { UI, type UIStrings } from "@/lib/i18n";
import type { L, Lang } from "@/lib/site-types";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: UIStrings;
  /** Texto en el idioma activo (si falta la traducción, español). */
  pick: (text: L) => string;
}

const LangContext = createContext<LangContextValue | null>(null);
const STORAGE_KEY = "lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  // Idioma recordado (solo en el navegador; el HTML inicial siempre sale en español).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "es" || saved === "en") setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const pick = useCallback((text: L) => (lang === "en" ? text.en ?? text.es : text.es), [lang]);

  return <LangContext.Provider value={{ lang, setLang, t: UI[lang], pick }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang debe usarse dentro de <LangProvider>");
  return ctx;
}
