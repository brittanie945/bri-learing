"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Timer } from "lucide-react";
import { diaryApi, type DiaryListItem, type DiaryCreatePayload } from "@/lib/api/diary";
import DiaryEditor from "@/components/diary-editor";
import { MOOD_COLORS } from "@/components/mood-picker";
import type { Mood } from "@/lib/api/diary";

type View = "list" | "new" | "capsule";

function DiaryCard({ entry, t, onClick }: { entry: DiaryListItem; t: ReturnType<typeof useTranslations>; onClick: () => void }) {
  const isLocked = entry.is_capsule && entry.unlock_at && new Date(entry.unlock_at) > new Date();
  const moodColor = entry.mood ? MOOD_COLORS[entry.mood as Mood] : "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-green-200 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isLocked ? (
            <p className="text-sm font-semibold text-slate-400">{t("locked")}</p>
          ) : (
            <h3 className="font-semibold text-slate-800 truncate group-hover:text-green-700 transition-colors">
              {entry.title}
            </h3>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {new Date(entry.created_at).toLocaleDateString()}
            {isLocked && entry.unlock_at && (
              <span className="ml-2 text-amber-500">
                {t("unlocksOn")} {new Date(entry.unlock_at).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {entry.mood && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${moodColor}`}>
              {entry.mood}
            </span>
          )}
          {entry.is_capsule && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              ⏰
            </span>
          )}
        </div>
      </div>
      {!isLocked && entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {entry.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 bg-green-50 text-green-600 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiaryPage() {
  const t = useTranslations("diary");
  const tm = useTranslations("mood");
  const router = useRouter();
  const [view, setView] = useState<View>("list");
  const [entries, setEntries] = useState<DiaryListItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterMood, setFilterMood] = useState<string>("");
  const [showCapsuleOnly, setShowCapsuleOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await diaryApi.list({
        search: search || undefined,
        mood: filterMood || undefined,
        is_capsule: showCapsuleOnly || undefined,
      });
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [search, filterMood, showCapsuleOnly]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSave = async (payload: DiaryCreatePayload) => {
    await diaryApi.create({ ...payload, is_capsule: view === "capsule" || payload.is_capsule });
    setView("list");
    fetchEntries();
  };

  if (view !== "list") {
    return (
      <div className="space-y-6">
        <button onClick={() => setView("list")} className="text-sm text-green-600 hover:text-green-500 flex items-center gap-1">
          ← {t("cancel")}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {view === "capsule" ? t("newCapsule") : t("newDiary")}
        </h1>
        <DiaryEditor
          onSave={handleSave}
          onCancel={() => setView("list")}
          isCapsuleMode={view === "capsule"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView("capsule")}
            className="px-3 py-1.5 text-sm rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
          >
            <Timer className="h-4 w-4" /> {t("newCapsule")}
          </button>
          <button
            onClick={() => setView("new")}
            className="px-3 py-1.5 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm inline-flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> {t("newDiary")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search")}
          className="flex-1 min-w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        />
        <select
          value={filterMood}
          onChange={(e) => setFilterMood(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
        >
          <option value="">{t("all")}</option>
          {["happy", "sad", "anxious", "calm", "angry", "neutral"].map((m) => (
            <option key={m} value={m}>{tm(m)}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 px-2">
          <input type="checkbox" checked={showCapsuleOnly} onChange={(e) => setShowCapsuleOnly(e.target.checked)} className="accent-amber-500" />
          {t("filterCapsule")}
        </label>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3">{error}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400 text-sm">{t("noEntries")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {entries.map((e) => (
            <DiaryCard key={e.id} entry={e} t={t} onClick={() => router.push(`/diary/${e.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
