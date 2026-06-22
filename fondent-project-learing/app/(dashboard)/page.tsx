"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Timer, Pencil } from "lucide-react";
import { getUser } from "@/lib/auth-client";
import { diaryApi, type MoodStats } from "@/lib/api/diary";
import { DailyQuoteWidget } from "@/components/quote/daily-quote-widget";

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
    <div className="mx-auto max-w-5xl space-y-8 lg:space-y-10">

      {/* ── 今日箴言 ── */}
      <DailyQuoteWidget />

      {/* ── 暖光问候区 ── */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-pu-very-dim">
          {today}
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-[oklch(0.95_0.012_290)] md:text-4xl md:leading-[1.05]">
          {t(greeting, { username: user?.username || "" })}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-pu-muted md:text-base">
          {t("writePrompt")}
        </p>
      </div>

      {/* ── 主 CTA ── */}
      <button
        onClick={() => router.push("/diary")}
        className="group flex w-full items-center gap-4 rounded-[1.5rem] border border-white/8 bg-[linear-gradient(135deg,oklch(0.17_0.030_290),oklch(0.13_0.025_290))] px-5 py-4 text-left transition-all duration-200 hover:border-white/12 hover:shadow-[0_18px_40px_rgba(2,6,23,0.22)] active:scale-[0.99]"
      >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-logo shadow-icon-glow">
            <Pencil className="h-4.5 w-4.5 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-pu-text-2">{t("writeBtn")}</p>
            <p className="mt-0.5 text-xs leading-5 text-pu-muted">
            {t("diaryDesc")}
          </p>
        </div>
          <span className="text-base text-pu-accent transition-transform group-hover:translate-x-1">→</span>
      </button>

      {/* ── 数据小条 ── */}
      <div className="flex items-center gap-6">
        {[
          { label: t("totalDiaries"), value: stats?.total ?? "—", accent: "oklch(0.78 0.24 290)" },
          { label: t("streak"), value: stats != null ? `${stats.streak}${t("streakUnit")}` : "—", accent: "oklch(0.78 0.22 330)" },
          { label: t("capsuleCount"), value: capsuleCount, accent: "oklch(0.80 0.18 195)" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span className="text-xl font-bold tabular-nums" style={{"--c-accent": accent, color: "var(--c-accent)"} as React.CSSProperties}>{value}</span>
            <span className="text-[10px] tracking-wide text-pu-dim">{label}</span>
          </div>
        ))}
      </div>

      {/* ── 功能导航 2×2 ── */}
      <div>
        <p className="text-xs font-medium tracking-widest mb-3 text-pu-very-dim">
          探索功能
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(({ key, href, Icon, accent, bg, border }) => (
            <Link key={key} href={href}
              className="group flex flex-col gap-3 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ "--c-bg": bg, "--c-border": border, "--c-accent": accent, background: "var(--c-bg)", border: "1px solid var(--c-border)", boxShadow: `0 4px 20px ${bg}` } as React.CSSProperties}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{background: `${accent}26`}}>
                <Icon className="h-4.5 w-4.5" style={{color: "var(--c-accent)"}} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-semibold text-pu-text-2">{t(`${key}Title`)}</p>
                <p className="text-[11px] leading-relaxed mt-0.5 text-pu-muted">{t(`${key}Desc`)}</p>
              </div>
              <span className="text-xs font-medium mt-auto transition-all group-hover:translate-x-0.5" style={{color: "var(--c-accent)"}}>
                {t(`${key}Action`)} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

