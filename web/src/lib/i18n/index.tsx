"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  dictionaries,
  type Locale,
  type TranslationKey,
} from "./dictionaries";

export { LOCALES } from "./dictionaries";
export type { Locale, TranslationKey } from "./dictionaries";

const STORAGE_KEY = "app.locale";
const DEFAULT_LOCALE: Locale = "de";

type TParams = Record<string, string | number>;

/** Translate a key, replacing `{name}` tokens with the matching param. */
export type TFunc = (key: TranslationKey, params?: TParams) => string;

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunc;
};

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{${key}}`,
  );
}

function isLocale(value: string | null): value is Locale {
  return value === "de" || value === "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Start at the default so the server render and the first client render agree
  // (no hydration mismatch); the stored choice is applied right after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback<TFunc>(
    (key, params) => {
      const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
      return interpolate(template, params);
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** Convenience hook for components that only need the translate function. */
export function useT(): TFunc {
  return useI18n().t;
}
