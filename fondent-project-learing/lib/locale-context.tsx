"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import zh from "../messages/zh.json";
import en from "../messages/en.json";

type Locale = "zh" | "en";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const messages: Record<Locale, object> = { zh, en };

const LocaleContext = createContext<LocaleContextValue>({
  locale: "zh",
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  // Read persisted locale from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored === "zh" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Shanghai">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

/** Mirror of `useTheme` — returns `{ locale, setLocale }` */
export function useLocale() {
  return useContext(LocaleContext);
}
