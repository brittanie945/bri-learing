"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { diaryApi, type MoodStats } from "@/lib/api/diary";
import { MOOD_COLORS } from "@/components/mood-picker";
import type { Mood } from "@/lib/api/diary";

const MOOD_DOT: Record<string, string> = {
  happy: "bg-yellow-400",
  sad: "bg-blue-400",
  anxious: "bg-orange-400",
  calm: "bg-green-400",
  angry: "bg-red-400",
  neutral: "bg-slate-300",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

export default function CalendarPage() {
  const t = useTranslations("calendar");
  const tm = useTranslations("mood");
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [moodStats, setMoodStats] = useState<MoodStats | null>(null);
  // date -> mood string
  const [dateMoods, setDateMoods] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const stats = await diaryApi.moodStats();
        setMoodStats(stats);
        // Fetch all entries for this month to build date→mood map
        const entries = await diaryApi.list({ limit: 100 });
        const map: Record<string, string> = {};
        for (const e of entries) {
          if (!e.mood) continue;
          const d = new Date(e.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          map[key] = e.mood; // last entry of day wins
        }
        setDateMoods(map);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(year, i, 1).toLocaleString("default", { month: "long" })
  );
  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Stats row */}
          {moodStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{moodStats.streak}</p>
                <p className="text-xs text-green-600 mt-0.5">{t("streak")}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-700">{moodStats.total}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t("totalEntries")}</p>
              </div>
              {moodStats.stats.slice(0, 2).map((s) => (
                <div key={s.mood} className={`rounded-xl border p-4 text-center ${MOOD_COLORS[s.mood as Mood] ?? "bg-slate-50 border-slate-200"}`}>
                  <p className="text-2xl font-bold">{s.count}</p>
                  <p className="text-xs mt-0.5">{tm(s.mood)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Calendar */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">‹</button>
              <span className="text-sm font-semibold text-slate-700">
                {months[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">›</button>
            </div>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {weekdays.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-slate-400">{d}</div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }).map((_, i) => {
                const dayNum = i - firstDow + 1;
                if (dayNum < 1 || dayNum > daysInMonth) {
                  return <div key={i} className="h-14 border-b border-r border-slate-50 last:border-r-0" />;
                }
                const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const mood = dateMoods[dateKey];
                const isToday = year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate();

                return (
                  <div
                    key={i}
                    onClick={() => router.push(`/diary?date=${dateKey}`)}
                    className="h-14 border-b border-r border-slate-50 last:border-r-0 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium transition-all ${
                      isToday ? "bg-green-500 text-white shadow-sm" : "text-slate-700"
                    }`}>{dayNum}</span>
                    {mood && (
                      <span className={`w-2 h-2 rounded-full ${MOOD_DOT[mood] ?? "bg-slate-300"}`} title={mood} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mood legend */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t("legend")}</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(MOOD_DOT).map(([mood, dot]) => (
                <span key={mood} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                  {tm(mood)}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
