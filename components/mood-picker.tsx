"use client";

import { useTranslations } from "next-intl";
import type { Mood } from "@/lib/api/diary";

const MOODS: Mood[] = ["happy", "sad", "anxious", "calm", "angry", "neutral"];

const MOOD_COLORS: Record<Mood, string> = {
  happy: "bg-yellow-100 text-yellow-700 border-yellow-300",
  sad: "bg-blue-100 text-blue-700 border-blue-300",
  anxious: "bg-orange-100 text-orange-700 border-orange-300",
  calm: "bg-green-100 text-green-700 border-green-300",
  angry: "bg-red-100 text-red-700 border-red-300",
  neutral: "bg-slate-100 text-slate-600 border-slate-300",
};

const MOOD_RING: Record<Mood, string> = {
  happy: "ring-yellow-400",
  sad: "ring-blue-400",
  anxious: "ring-orange-400",
  calm: "ring-green-400",
  angry: "ring-red-400",
  neutral: "ring-slate-400",
};

interface Props {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
}

export default function MoodPicker({ value, onChange }: Props) {
  const t = useTranslations("mood");

  return (
    <div className="flex flex-wrap gap-2">
      {MOODS.map((mood) => (
        <button
          key={mood}
          type="button"
          onClick={() => onChange(value === mood ? null : mood)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${MOOD_COLORS[mood]} ${
            value === mood ? `ring-2 ${MOOD_RING[mood]} scale-105` : "opacity-70 hover:opacity-100"
          }`}
        >
          {t(mood)}
        </button>
      ))}
    </div>
  );
}

export { MOOD_COLORS, MOODS };
