"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { X, ExternalLink, BookOpen } from "lucide-react";
import { diaryApi, type DiaryDetail, type Mood } from "@/lib/api/diary";
import { MOOD_COLORS } from "@/components/mood-picker";

interface DiaryCanvasProps {
  diaryId: string;
  onClose: () => void;
}

export function DiaryCanvas({ diaryId, onClose }: DiaryCanvasProps) {
  const td = useTranslations("diary");
  const tc = useTranslations("chat");
  const router = useRouter();
  const [diary, setDiary] = useState<DiaryDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDiary(null);
    setLoading(true);
    diaryApi.get(diaryId)
      .then(setDiary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [diaryId]);

  const moodColor = diary?.mood ? MOOD_COLORS[diary.mood as Mood] : "";

  return (
    <div className="w-72 shrink-0 flex flex-col border-l border-[oklch(0.22_0.034_290/0.45)] bg-[oklch(0.105_0.022_290)]">
      {/* 顶部工具栏 */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[oklch(0.22_0.034_290/0.45)]">
        <BookOpen className="h-4 w-4 shrink-0 text-pu-sparkle" />
        <span className="text-xs font-semibold flex-1 truncate text-pu-text-2">
          {loading ? "…" : (diary?.title ?? tc("canvasDiaryTitle"))}
        </span>
        <button
          onClick={() => router.push(`/diary/${diaryId}`)}
          title={td("viewInJournal")}
          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[oklch(0.20_0.040_290)] text-pu-very-dim transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          title={tc("closeCanvas")}
          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg hover:bg-[oklch(0.20_0.040_290)] text-pu-very-dim transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-pu-cursor" />
          </div>
        )}
        {!loading && diary && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {diary.is_ai_generated && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[oklch(0.22_0.055_290/0.50)] text-[oklch(0.72_0.18_290)] border border-[oklch(0.40_0.14_290/0.40)]">
                  ✨ AI
                </span>
              )}
              {diary.mood && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${moodColor}`}>
                  {diary.mood}
                </span>
              )}
              {diary.tags?.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded bg-[oklch(0.20_0.045_290/0.60)] text-pu-label"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-pu-very-dim">
              {new Date(diary.created_at).toLocaleString()}
            </p>
            <div className="rounded-xl px-4 py-3 bg-[oklch(0.14_0.028_290)] border border-[oklch(0.22_0.034_290/0.45)]">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-pu-text-3">
                {diary.content}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
