"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getUser } from "@/lib/auth-client";
import { diaryApi, type MoodStats } from "@/lib/api/diary";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const user = getUser();
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [capsuleCount, setCapsuleCount] = useState(0);

  useEffect(() => {
    diaryApi.moodStats().then(setStats).catch(() => {});
    diaryApi.list({ is_capsule: true }).then((r) => setCapsuleCount(r.length)).catch(() => {});
  }, []);

  const features = [
    {
      key: "diary",
      href: "/diary",
      icon: (
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      gradient: "from-green-400 to-emerald-500",
      bg: "bg-green-50",
      border: "border-green-100",
      iconBg: "bg-green-500",
      actionColor: "text-green-600 hover:text-green-700",
    },
    {
      key: "calendar",
      href: "/calendar",
      icon: (
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      gradient: "from-teal-400 to-cyan-500",
      bg: "bg-teal-50",
      border: "border-teal-100",
      iconBg: "bg-teal-500",
      actionColor: "text-teal-600 hover:text-teal-700",
    },
    {
      key: "drift",
      href: "/drift",
      icon: (
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      gradient: "from-blue-400 to-indigo-500",
      bg: "bg-blue-50",
      border: "border-blue-100",
      iconBg: "bg-blue-500",
      actionColor: "text-blue-600 hover:text-blue-700",
    },
    {
      key: "capsule",
      href: "/diary",
      icon: (
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: "from-amber-400 to-orange-500",
      bg: "bg-amber-50",
      border: "border-amber-100",
      iconBg: "bg-amber-500",
      actionColor: "text-amber-600 hover:text-amber-700",
    },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t("welcome", { username: user?.username || "-" })}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("welcomeSubtitle")}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-green-100 bg-green-50 p-5">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wide">{t("totalDiaries")}</p>
          <p className="mt-1.5 text-3xl font-bold text-green-700">{stats?.total ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-5">
          <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">{t("streak")}</p>
          <p className="mt-1.5 text-3xl font-bold text-teal-700">
            {stats != null ? `${stats.streak}` : "—"}
            {stats != null && <span className="text-base font-medium ml-0.5">{t("streakUnit")}</span>}
          </p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">{t("capsuleCount")}</p>
          <p className="mt-1.5 text-3xl font-bold text-amber-700">{capsuleCount ?? "—"}</p>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.key}
            className={`rounded-2xl border ${f.border} ${f.bg} p-6 flex flex-col gap-4`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${f.iconBg} text-white shadow-sm`}>
                {f.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 text-base">{t(`${f.key}Title`)}</h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">{t(`${f.key}Desc`)}</p>
              </div>
            </div>
            <Link
              href={f.href}
              className={`self-start text-sm font-medium ${f.actionColor} flex items-center gap-1 transition-colors`}
            >
              {t(`${f.key}Action`)} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
