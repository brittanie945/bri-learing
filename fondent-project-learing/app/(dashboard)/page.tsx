"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Calendar, Mail, Timer, Pencil, Droplets } from "lucide-react";
import { getUser } from "@/lib/auth-client";
import { diaryApi, type MoodStats } from "@/lib/api/diary";
import { seedsApi, type Seed } from "@/lib/api/seeds";
import { SeedAnimation } from "@/components/seeds/seed-animation";
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

// ── 种子小组件（首页嵌入）──
function SeedWidget() {
  const tSeeds = useTranslations("seeds");
  const [seed, setSeed] = useState<Seed | null | undefined>(undefined); // undefined = loading
  const [isWatering, setIsWatering] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    seedsApi.getCurrent()
      .then((r) => setSeed(r.active_seed))
      .catch(() => setSeed(null));
  }, []);

  async function handleWater(e: React.MouseEvent) {
    e.preventDefault();
    if (!seed || isWatering) return;
    setIsWatering(true);
    try {
      const res = await seedsApi.water();
      setSeed(res.seed);
      setMsg(res.encouragement_message);
      setTimeout(() => setMsg(null), 3000);
    } catch { /* ignore */ }
    finally { setTimeout(() => setIsWatering(false), 900); }
  }

  // still loading
  if (seed === undefined) return null;

  return (
    <Link href="/seeds"
      className="group flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-seed-bg border border-seed-border shadow-glow-green"
    >
      {/* mini animation */}
      <div className="shrink-0">
        <SeedAnimation
          status={seed?.status ?? null}
          streakDays={seed?.streak_days ?? 0}
          isWatering={isWatering}
          seedType={seed?.seed_type ?? null}
          size={52}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-seed-text">
          {tSeeds("title")}
        </p>
        {msg ? (
          <p className="text-xs mt-0.5 truncate text-[oklch(0.65_0.15_145)]">{msg}</p>
        ) : seed ? (
          <p className="text-xs mt-0.5 text-pu-muted">
            {tSeeds("streakOf", { days: seed.streak_days })}
          </p>
        ) : (
          <p className="text-xs mt-0.5 text-pu-very-dim">
            {tSeeds("noSeedDesc")}
          </p>
        )}
      </div>

      {seed?.status === "growing" && (
        <button
          onClick={handleWater}
          className="shrink-0 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-all hover:scale-[1.05] active:scale-[0.95] bg-[oklch(0.28_0.065_200)] text-seed-water"
        >
          <Droplets className="h-3.5 w-3.5" />
          {isWatering ? "…" : tSeeds("waterBtn")}
        </button>
      )}
    </Link>
  );
}

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

      {/* ── 今日箴言 ── */}
      <DailyQuoteWidget />

      {/* ── 暖光问候区 ── */}
      <div>
        <p className="text-xs font-medium tracking-widest mb-2 text-[oklch(0.50_0.012_62)]">
          {today}
        </p>
        <h1 className="text-2xl font-semibold leading-snug text-[oklch(0.90_0.012_75)]">
          {t(greeting, { username: user?.username || "" })}
        </h1>
        <p className="mt-1 text-sm text-[oklch(0.52_0.012_62)]">
          {t("writePrompt")}
        </p>
      </div>

      {/* ── 主 CTA ── */}
      <button
        onClick={() => router.push("/diary")}
        className="group w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-[oklch(0.16_0.030_290)] border border-[oklch(0.34_0.055_290/0.55)] shadow-glow-purple"
      >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-logo shadow-icon-glow">
            <Pencil className="h-4.5 w-4.5 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-pu-text-2">{t("writeBtn")}</p>
            <p className="text-xs mt-0.5 text-pu-muted">
            {t("diaryDesc")}
          </p>
        </div>
          <span className="text-base transition-transform group-hover:translate-x-1 text-pu-accent">→</span>
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

      {/* ── 时光种子小组件 ── */}
      <SeedWidget />

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

