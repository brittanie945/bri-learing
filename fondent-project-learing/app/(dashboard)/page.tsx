"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Calendar, Mail, Timer, Pencil } from "lucide-react";
import { getUser } from "@/lib/auth-client";
import { diaryApi, type MoodStats } from "@/lib/api/diary";

// 根据小时返回时段
function getGreetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

// 炫紫星云功能卡配置
const FEATURES = [
  {
    key: "diary",    href: "/diary",    Icon: BookOpen,
    // 紫罗兰
    accent: "oklch(0.78 0.24 290)",
    bg:     "oklch(0.19 0.055 290)",
    border: "oklch(0.32 0.090 290 / 0.50)",
  },
  {
    key: "calendar", href: "/calendar", Icon: Calendar,
    // 品红
    accent: "oklch(0.78 0.22 330)",
    bg:     "oklch(0.19 0.050 330)",
    border: "oklch(0.32 0.085 330 / 0.50)",
  },
  {
    key: "drift",    href: "/drift",    Icon: Mail,
    // 电光蓝
    accent: "oklch(0.76 0.22 256)",
    bg:     "oklch(0.19 0.048 256)",
    border: "oklch(0.32 0.080 256 / 0.50)",
  },
  {
    key: "capsule",  href: "/diary",   Icon: Timer,
    // 霓虹青
    accent: "oklch(0.80 0.18 195)",
    bg:     "oklch(0.19 0.042 195)",
    border: "oklch(0.32 0.075 195 / 0.50)",
  },
] as const;

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const user = getUser();
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [capsuleCount, setCapsuleCount] = useState(0);
  const greeting = getGreetingKey();

  useEffect(() => {
    diaryApi.moodStats().then(setStats).catch(() => {});
    diaryApi.list({ is_capsule: true }).then((r) => setCapsuleCount(r.length)).catch(() => {});
  }, []);

  // 今天日期
  const today = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  return (
    <div className="max-w-xl mx-auto space-y-8">

      {/* ── 暖光问候区 ── */}
      <div>
        <p className="text-xs font-medium tracking-widest mb-2" style={{color: "oklch(0.50 0.012 62)"}}>
          {today}
        </p>
        <h1 className="text-2xl font-semibold leading-snug" style={{color: "oklch(0.90 0.012 75)"}}>
          {t(greeting, { username: user?.username || "" })}
        </h1>
        <p className="mt-1 text-sm" style={{color: "oklch(0.52 0.012 62)"}}>
          {t("writePrompt")}
        </p>
      </div>

      {/* ── 主 CTA ── */}
      <button
        onClick={() => router.push("/diary")}
        className="group w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: "oklch(0.16 0.030 290)",
          border: "1px solid oklch(0.34 0.055 290 / 0.55)",
          boxShadow: "0 2px 16px oklch(0.06 0.030 290 / 0.50)",
        }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{background: "linear-gradient(135deg, oklch(0.70 0.24 290), oklch(0.68 0.24 330))", boxShadow: "0 0 16px oklch(0.45 0.28 290 / 0.45)"}}>
          <Pencil className="h-4.5 w-4.5 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{color: "oklch(0.88 0.015 290)"}}>{t("writeBtn")}</p>
          <p className="text-xs mt-0.5" style={{color: "oklch(0.50 0.015 290)"}}>
            {t("diaryDesc")}
          </p>
        </div>
        <span className="text-base transition-transform group-hover:translate-x-1" style={{color: "oklch(0.72 0.22 290)"}}>→</span>
      </button>

      {/* ── 数据小条 ── */}
      <div className="flex items-center gap-6">
        {[
          { label: t("totalDiaries"), value: stats?.total ?? "—", accent: "oklch(0.78 0.24 290)" },
          { label: t("streak"), value: stats != null ? `${stats.streak}${t("streakUnit")}` : "—", accent: "oklch(0.78 0.22 330)" },
          { label: t("capsuleCount"), value: capsuleCount, accent: "oklch(0.80 0.18 195)" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span className="text-xl font-bold tabular-nums" style={{color: accent}}>{value}</span>
            <span className="text-[10px] tracking-wide" style={{color: "oklch(0.48 0.015 290)"}}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── 功能导航 2×2 ── */}
      <div>
        <p className="text-xs font-medium tracking-widest mb-3" style={{color: "oklch(0.44 0.018 290)"}}>
          探索功能
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(({ key, href, Icon, accent, bg, border }) => (
            <Link key={key} href={href}
              className="group flex flex-col gap-3 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{background: bg, border: `1px solid ${border}`, boxShadow: `0 4px 20px ${bg}`}}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{background: `${accent}26`}}>
                <Icon className="h-4.5 w-4.5" style={{color: accent}} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{color: "oklch(0.90 0.012 290)"}}>{t(`${key}Title`)}</p>
                <p className="text-[11px] leading-relaxed mt-0.5" style={{color: "oklch(0.52 0.015 290)"}}>{t(`${key}Desc`)}</p>
              </div>
              <span className="text-xs font-medium mt-auto transition-all group-hover:translate-x-0.5" style={{color: accent}}>
                {t(`${key}Action`)} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

