"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { diaryApi, type DiaryDetail, type DiaryCreatePayload } from "@/lib/api/diary";
import DiaryEditor from "@/components/diary-editor";
import RelatedDiaries from "@/components/related-diaries";
import { MOOD_COLORS } from "@/components/mood-picker";
import type { Mood } from "@/lib/api/diary";

export default function DiaryDetailPage() {
  const t = useTranslations("diary");
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<DiaryDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    diaryApi.get(id)
      .then(setEntry)
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (payload: DiaryCreatePayload) => {
    const updated = await diaryApi.update(id, payload);
    setEntry(updated);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm(t("confirmDelete"))) return;
    setDeleting(true);
    try {
      await diaryApi.delete(id);
      router.push("/diary");
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3">{error}</p>;
  }

  if (!entry) return null;

  const isLocked = entry.is_capsule && entry.unlock_at && new Date(entry.unlock_at) > new Date();
  const moodColor = entry.mood ? MOOD_COLORS[entry.mood as Mood] : "";

  if (isLocked) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.push("/diary")} className="text-sm text-green-600 hover:text-green-500">
          ← {t("back")}
        </button>
        <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-12 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-amber-700">{t("capsuleStillLocked")}</h2>
          {entry.unlock_at && (
            <p className="text-sm text-amber-600 mt-2">
              {t("unlocksOn")} {new Date(entry.unlock_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <button onClick={() => setEditing(false)} className="text-sm text-green-600 hover:text-green-500">
          ← {t("cancel")}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{t("editDiary")}</h1>
        <DiaryEditor
          initialValues={{ ...entry, mood: entry.mood ?? undefined, weather: entry.weather ?? undefined } as Partial<import("@/lib/api/diary").DiaryCreatePayload>}
          onSave={handleUpdate}
          onCancel={() => setEditing(false)}
          isCapsuleMode={!!entry.is_capsule}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => router.push("/diary")} className="text-sm text-green-600 hover:text-green-500">
        ← {t("back")}
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{entry.title}</h1>
          <p className="text-sm text-slate-400 mt-1">{new Date(entry.created_at).toLocaleString()}</p>
        </div>
        {!entry.is_capsule && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {t("edit")}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              {deleting ? "…" : t("delete")}
            </button>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-2">
        {entry.mood && (
          <span className={`text-xs px-2.5 py-1 rounded-full border ${moodColor}`}>{entry.mood}</span>
        )}
        {entry.weather && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-600 border border-sky-200">{entry.weather}</span>
        )}
        {entry.is_capsule && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
            ⏰ {t("capsuleLabel")}
          </span>
        )}
        {entry.is_ai_generated && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
            ✨ {t("aiGenerated")}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{entry.content}</p>
      </div>

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-200">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Related Memories */}
      {!entry.is_capsule && (
        <section className="pt-6 border-t border-[oklch(0.26_0.038_290/0.40)]">
          <h2 className="text-lg font-bold mb-1 text-pu-text-2">{t("relatedMemories")}</h2>
          <p className="text-sm mb-4 text-pu-muted">{t("relatedMemoriesDesc")}</p>
          <RelatedDiaries diaryId={entry.id} />
        </section>
      )}
    </div>
  );
}
