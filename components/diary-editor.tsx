"use client";

import { useState, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MoodPicker from "@/components/mood-picker";
import type { Mood, Weather, DiaryCreatePayload } from "@/lib/api/diary";

const WEATHERS: Weather[] = ["sunny", "cloudy", "rainy", "snowy", "windy", "stormy"];

const WEATHER_EMOJI: Record<Weather, string> = {
  sunny: "☀️", cloudy: "☁️", rainy: "🌧", snowy: "❄️", windy: "💨", stormy: "⛈",
};

interface Props {
  initialValues?: Partial<DiaryCreatePayload>;
  onSave: (payload: DiaryCreatePayload) => Promise<void>;
  onCancel: () => void;
  isCapsuleMode?: boolean;
}

export default function DiaryEditor({ initialValues, onSave, onCancel, isCapsuleMode = false }: Props) {
  const t = useTranslations("diary");
  const tw = useTranslations("weather");

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [mood, setMood] = useState<Mood | null>((initialValues?.mood as Mood) ?? null);
  const [weather, setWeather] = useState<Weather | null>((initialValues?.weather as Weather) ?? null);
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [isCapsule, setIsCapsule] = useState(initialValues?.is_capsule ?? isCapsuleMode);
  const [unlockAt, setUnlockAt] = useState(initialValues?.unlock_at?.slice(0, 16) ?? "");
  const [selfDestructDays, setSelfDestructDays] = useState(initialValues?.self_destruct_days ?? 0);
  const [loading, setLoading] = useState(false);

  const addTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        title,
        content,
        mood: mood ?? undefined,
        weather: weather ?? undefined,
        tags,
        is_capsule: isCapsule,
        unlock_at: isCapsule && unlockAt ? new Date(unlockAt).toISOString() : undefined,
        self_destruct_days: selfDestructDays,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label>{t("titleLabel")}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          required
          className="focus-visible:ring-green-500/30 focus-visible:border-green-500"
        />
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <Label>{t("contentLabel")}</Label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("contentPlaceholder")}
          required
          rows={8}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 resize-none transition-colors"
        />
      </div>

      {/* Mood */}
      <div className="space-y-1.5">
        <Label>{t("moodLabel")}</Label>
        <MoodPicker value={mood} onChange={setMood} />
      </div>

      {/* Weather */}
      <div className="space-y-1.5">
        <Label>{t("weatherLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {WEATHERS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeather(weather === w ? null : w)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                weather === w
                  ? "bg-sky-100 text-sky-700 border-sky-300 ring-2 ring-sky-400 scale-105"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {WEATHER_EMOJI[w]} {tw(w)}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label>{t("tagsLabel")}</Label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
              #{tag}
              <button type="button" onClick={() => removeTag(tag)} className="text-green-500 hover:text-green-700">×</button>
            </span>
          ))}
        </div>
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={addTag}
          placeholder={t("tagsPlaceholder")}
          className="focus-visible:ring-green-500/30 focus-visible:border-green-500"
        />
      </div>

      {/* Capsule */}
      {!isCapsuleMode && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isCapsule}
            onChange={(e) => setIsCapsule(e.target.checked)}
            className="w-4 h-4 accent-green-600"
          />
          <span className="text-sm text-slate-700">{t("capsuleLabel")}</span>
        </label>
      )}

      {isCapsule && (
        <div className="space-y-1.5">
          <Label>{t("unlockAtLabel")}</Label>
          <Input
            type="datetime-local"
            value={unlockAt}
            onChange={(e) => setUnlockAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            required
            className="focus-visible:ring-green-500/30 focus-visible:border-green-500"
          />
        </div>
      )}

      {/* Self destruct */}
      <div className="space-y-1.5">
        <Label>{t("selfDestructLabel")}</Label>
        <Input
          type="number"
          min={0}
          max={3650}
          value={selfDestructDays}
          onChange={(e) => setSelfDestructDays(Number(e.target.value))}
          className="focus-visible:ring-green-500/30 focus-visible:border-green-500"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="bg-linear-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-200 hover:shadow-lg hover:shadow-green-300 transition-all"
        >
          {loading ? t("saving") : t("save")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
