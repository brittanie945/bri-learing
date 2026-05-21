"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Bookmark, BookOpen } from "lucide-react";
import { quotesApi, type CollectedQuoteItem } from "@/lib/api/quotes";

function QuoteCard({ item }: { item: CollectedQuoteItem }) {
  const locale = useLocale();
  const t = useTranslations("quote");

  const content = locale === "zh" ? item.quote.content_zh : item.quote.content_en;
  const author = item.quote.author;

  const collectedDate = new Date(item.collected_at).toLocaleDateString(
    locale === "zh" ? "zh-CN" : "en-US",
    { year: "numeric", month: "short", day: "numeric" }
  );

  return (
    <div
      className="rounded-2xl px-5 py-4 transition-all duration-150 hover:scale-[1.005]"
      style={{
        background: "oklch(0.14 0.032 68)",
        border: "1px solid oklch(0.26 0.055 68 / 0.40)",
        boxShadow: "0 2px 12px oklch(0.06 0.025 68 / 0.35)",
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <span
          className="text-2xl font-serif leading-none shrink-0 mt-0.5"
          style={{ color: "oklch(0.34 0.050 68)" }}
          aria-hidden
        >
          "
        </span>
        <p
          className="text-sm font-medium leading-relaxed"
          style={{ color: "oklch(0.88 0.022 68)" }}
        >
          {content}
        </p>
      </div>

      {author && (
        <p
          className="text-right text-[11px] mb-2"
          style={{ color: "oklch(0.50 0.038 68)" }}
        >
          — {author}
          {item.quote.source ? ` · ${item.quote.source}` : ""}
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-1">
        <Bookmark
          className="h-3 w-3 shrink-0"
          strokeWidth={1.8}
          style={{ color: "oklch(0.60 0.095 68)", fill: "oklch(0.60 0.095 68)" }}
        />
        <span className="text-[10px]" style={{ color: "oklch(0.44 0.040 68)" }}>
          {t("collectedAt", { date: collectedDate })}
        </span>
      </div>
    </div>
  );
}

export function QuoteBookView() {
  const t = useTranslations("quote");
  const [items, setItems] = useState<CollectedQuoteItem[] | null>(null);

  useEffect(() => {
    quotesApi
      .myCollection()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: "oklch(0.22 0.060 68)" }}
          >
            <BookOpen
              className="h-4 w-4"
              strokeWidth={1.8}
              style={{ color: "oklch(0.72 0.14 68)" }}
            />
          </div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "oklch(0.88 0.022 68)" }}
          >
            {t("bookTitle")}
          </h1>
        </div>
        {items !== null && items.length > 0 && (
          <p className="text-xs ml-10" style={{ color: "oklch(0.48 0.035 68)" }}>
            {items.length} 条
          </p>
        )}
      </div>

      {/* loading skeleton */}
      {items === null && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl h-24 animate-pulse"
              style={{ background: "oklch(0.14 0.032 68)" }}
            />
          ))}
        </div>
      )}

      {/* empty state */}
      {items !== null && items.length === 0 && (
        <div
          className="rounded-2xl px-6 py-10 text-center"
          style={{
            background: "oklch(0.14 0.032 68)",
            border: "1px solid oklch(0.24 0.045 68 / 0.35)",
          }}
        >
          <Bookmark
            className="h-8 w-8 mx-auto mb-3"
            strokeWidth={1.4}
            style={{ color: "oklch(0.36 0.050 68)" }}
          />
          <p
            className="text-sm font-medium mb-1"
            style={{ color: "oklch(0.70 0.018 68)" }}
          >
            {t("bookEmpty")}
          </p>
          <p className="text-xs" style={{ color: "oklch(0.44 0.018 68)" }}>
            {t("bookEmptyDesc")}
          </p>
        </div>
      )}

      {/* list */}
      {items !== null && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <QuoteCard key={`${item.quote.id}-${item.collected_at}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
