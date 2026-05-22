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
      className="rounded-2xl px-5 py-4 transition-all duration-150 hover:scale-[1.005] bg-quote-bg-card border border-quote-border-sub shadow-glow-amber"
    >
      <div className="flex items-start gap-2 mb-2">
        <span
          className="text-2xl font-serif leading-none shrink-0 mt-0.5 text-quote-mark"
          aria-hidden
        >
          "
        </span>
        <p
          className="text-sm font-medium leading-relaxed text-quote-text"
        >
          {content}
        </p>
      </div>

      {author && (
        <p
          className="text-right text-[11px] mb-2 text-quote-dim"
        >
          — {author}
          {item.quote.source ? ` · ${item.quote.source}` : ""}
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-1">
        <Bookmark
          className="h-3 w-3 shrink-0 text-quote-icon fill-quote-icon"
          strokeWidth={1.8}
        />
        <span className="text-[10px] text-quote-dim">
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
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-quote-bg-icon"
          >
            <BookOpen
              className="h-4 w-4 text-quote-accent"
              strokeWidth={1.8}
            />
          </div>
          <h1
            className="text-xl font-semibold text-quote-text"
          >
            {t("bookTitle")}
          </h1>
        </div>
        {items !== null && items.length > 0 && (
          <p className="text-xs ml-10 text-quote-label">
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
              className="rounded-2xl h-24 animate-pulse bg-quote-bg-card"
            />
          ))}
        </div>
      )}

      {/* empty state */}
      {items !== null && items.length === 0 && (
        <div
          className="rounded-2xl px-6 py-10 text-center bg-quote-bg-card border border-[oklch(0.24_0.045_68/0.35)]"
        >
          <Bookmark
            className="h-8 w-8 mx-auto mb-3 text-quote-mark"
            strokeWidth={1.4}
          />
          <p
            className="text-sm font-medium mb-1 text-[oklch(0.70_0.018_68)]"
          >
            {t("bookEmpty")}
          </p>
          <p className="text-xs text-quote-dim">
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
