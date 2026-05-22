"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Bookmark } from "lucide-react";
import { quotesApi, type DailyQuote } from "@/lib/api/quotes";

export function DailyQuoteWidget() {
  const t = useTranslations("quote");
  const locale = useLocale();

  const [quote, setQuote] = useState<DailyQuote | null>(null);
  const [isCollected, setIsCollected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    quotesApi
      .getToday()
      .then((res) => {
        setQuote(res.quote);
        setIsCollected(res.is_collected);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCollect() {
    if (!quote || isAnimating) return;
    setIsAnimating(true);
    try {
      const res = await quotesApi.collect(quote.id);
      setIsCollected(true);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      setFeedback(res.message);
      feedbackTimer.current = setTimeout(() => setFeedback(null), 2800);
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsAnimating(false), 400);
    }
  }

  // double-click handler
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCardClick() {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      if (clickCount.current >= 2) {
        handleCollect();
      }
      clickCount.current = 0;
    }, 280);
  }

  if (isLoading) {
    return (
      <div
        className="rounded-2xl px-5 py-5 animate-pulse bg-quote-bg border border-quote-border"
        style={{ height: "108px" }}
      />
    );
  }

  if (!quote) return null;

  const content = locale === "zh" ? quote.content_zh : quote.content_en;
  const author = quote.author;

  return (
    <div
      onClick={handleCardClick}
      className="rounded-2xl px-5 pt-4 pb-3 select-none cursor-pointer transition-all duration-200 hover:scale-[1.005] active:scale-[0.995] bg-quote-bg border border-quote-border shadow-glow-amber"
    >
      {/* header row */}
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="text-[10px] font-semibold tracking-widest uppercase text-quote-label"
        >
          {t("title")}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isCollected) handleCollect();
          }}
          aria-label={isCollected ? t("alreadyCollected") : t("collectHint")}
          className="transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            transform: isAnimating ? "scale(1.25)" : undefined,
            transition: "transform 200ms ease",
          }}
        >
          <Bookmark
            className={`h-4 w-4 transition-[color,fill] duration-300 ease-in-out ${
              isCollected
                ? "text-quote-accent fill-quote-accent"
                : "text-quote-pin fill-none"
            }`}
            strokeWidth={1.8}
          />
        </button>
      </div>

      {/* quote body */}
      <div className="mb-2">
        {/* opening mark */}
        <span
          className="text-2xl font-serif leading-none mr-1 text-quote-mark"
          aria-hidden
        >
          "
        </span>
        <span
          className="text-sm font-medium leading-relaxed text-quote-text"
        >
          {content}
        </span>
      </div>

      {/* author + source */}
      {author && (
        <p
          className="text-right text-[11px] mb-1 text-quote-muted"
        >
          — {author}
          {quote.source ? ` · ${quote.source}` : ""}
        </p>
      )}

      {/* feedback toast */}
      {feedback && (
        <p
          className="text-[11px] mt-1 text-center transition-opacity duration-300 text-quote-accent"
        >
          {feedback}
        </p>
      )}

      {/* divider + link */}
      <div
        className="mt-2.5 pt-2.5 flex items-center justify-between border-t border-quote-border-sub"
      >
        <span
          className="text-[10px] text-quote-pin"
        >
          {!isCollected && t("collectHint")}
        </span>
        <Link
          href="/quotes"
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] font-medium transition-colors hover:underline text-quote-link"
        >
          {t("viewCollection")} →
        </Link>
      </div>
    </div>
  );
}
