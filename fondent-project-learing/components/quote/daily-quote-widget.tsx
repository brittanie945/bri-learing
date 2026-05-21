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
        className="rounded-2xl px-5 py-5 animate-pulse"
        style={{
          background: "oklch(0.15 0.038 68)",
          border: "1px solid oklch(0.28 0.065 68 / 0.40)",
          height: "108px",
        }}
      />
    );
  }

  if (!quote) return null;

  const content = locale === "zh" ? quote.content_zh : quote.content_en;
  const author = quote.author;

  return (
    <div
      onClick={handleCardClick}
      className="rounded-2xl px-5 pt-4 pb-3 select-none cursor-pointer transition-all duration-200 hover:scale-[1.005] active:scale-[0.995]"
      style={{
        background: "oklch(0.15 0.038 68)",
        border: "1px solid oklch(0.28 0.065 68 / 0.45)",
        boxShadow: "0 2px 18px oklch(0.07 0.030 68 / 0.50)",
      }}
    >
      {/* header row */}
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="text-[10px] font-semibold tracking-widest uppercase"
          style={{ color: "oklch(0.55 0.065 68)" }}
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
            className="h-4 w-4"
            strokeWidth={1.8}
            style={{
              color: isCollected
                ? "oklch(0.72 0.14 68)"
                : "oklch(0.42 0.045 68)",
              fill: isCollected ? "oklch(0.72 0.14 68)" : "none",
              transition: "color 300ms ease, fill 300ms ease",
            }}
          />
        </button>
      </div>

      {/* quote body */}
      <div className="mb-2">
        {/* opening mark */}
        <span
          className="text-2xl font-serif leading-none mr-1"
          style={{ color: "oklch(0.36 0.055 68)" }}
          aria-hidden
        >
          "
        </span>
        <span
          className="text-sm font-medium leading-relaxed"
          style={{ color: "oklch(0.88 0.022 68)" }}
        >
          {content}
        </span>
      </div>

      {/* author + source */}
      {author && (
        <p
          className="text-right text-[11px] mb-1"
          style={{ color: "oklch(0.52 0.040 68)" }}
        >
          — {author}
          {quote.source ? ` · ${quote.source}` : ""}
        </p>
      )}

      {/* feedback toast */}
      {feedback && (
        <p
          className="text-[11px] mt-1 text-center transition-opacity duration-300"
          style={{ color: "oklch(0.72 0.14 68)" }}
        >
          {feedback}
        </p>
      )}

      {/* divider + link */}
      <div
        className="mt-2.5 pt-2.5 flex items-center justify-between"
        style={{ borderTop: "1px solid oklch(0.26 0.050 68 / 0.35)" }}
      >
        <span
          className="text-[10px]"
          style={{ color: "oklch(0.42 0.040 68)" }}
        >
          {!isCollected && t("collectHint")}
        </span>
        <Link
          href="/quotes"
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] font-medium transition-colors hover:underline"
          style={{ color: "oklch(0.60 0.080 68)" }}
        >
          {t("viewCollection")} →
        </Link>
      </div>
    </div>
  );
}
