"use client";

import { useLocale } from "@/lib/locale-context";

const localeLabels: Record<string, string> = {
  zh: "中文",
  en: "EN",
};

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex gap-1">
      {(["zh", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
            l === locale
              ? "bg-green-100 text-green-700"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          }`}
        >
          {localeLabels[l]}
        </button>
      ))}
    </div>
  );
}
