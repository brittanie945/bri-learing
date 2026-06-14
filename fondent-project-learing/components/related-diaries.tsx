"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { diaryApi, type RelatedDiaryItem } from "@/lib/api/diary";
import { MOOD_COLORS } from "@/components/mood-picker";
import type { Mood } from "@/lib/api/diary";

interface RelatedDiariesProps {
  diaryId: string;
}

export default function RelatedDiaries({ diaryId }: RelatedDiariesProps) {
  const t = useTranslations("diary");
  const router = useRouter();
  const [items, setItems] = useState<RelatedDiaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    diaryApi
      .getRelated(diaryId, 5)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [diaryId]);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-48 h-28 rounded-xl animate-pulse bg-[oklch(0.17_0.035_290)] border border-[oklch(0.26_0.038_290/0.50)]"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-pu-very-dim italic">{t("noRelatedMemories")}</p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {items.map((item) => {
        const moodColor = item.mood ? MOOD_COLORS[item.mood as Mood] : "";
        const pct = Math.round(item.similarity * 100);

        return (
          <button
            key={item.id}
            onClick={() => router.push(`/diary/${item.id}`)}
            className="shrink-0 w-52 rounded-xl p-3.5 text-left transition-all hover:scale-[1.02] bg-[oklch(0.15_0.032_290)] border border-[oklch(0.26_0.038_290/0.50)]"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <h4 className="text-sm font-semibold truncate flex-1 text-pu-text-3">
                {item.title}
              </h4>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-[oklch(0.22_0.055_290/0.45)] text-[oklch(0.72_0.18_290)]">
                {t("relevanceLabel", { pct })}
              </span>
            </div>
            <p className="text-xs line-clamp-2 mb-2 text-pu-label">
              {item.content_preview}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-pu-very-dim">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
              {item.mood && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full border ${moodColor}`}>
                  {item.mood}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
