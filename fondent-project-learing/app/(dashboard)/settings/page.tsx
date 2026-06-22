"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Stamp, Clock, BookOpen, Coins, Timer, TrendingUp } from "lucide-react";
import { getUser } from "@/lib/auth-client";
import { diaryApi, type MoodStats } from "@/lib/api/diary";
import { coinsApi, type CoinBalance } from "@/lib/api/coins";

// ────── Mood config (matches existing mood system) ──────
const MOOD_META: Record<string, { label: string; color: string; icon: string }> = {
  happy:   { label: "开心",  color: "oklch(0.80 0.18 80)",  icon: "😊" },
  calm:    { label: "平静",  color: "oklch(0.72 0.16 165)", icon: "😌" },
  sad:     { label: "难过",  color: "oklch(0.70 0.16 256)", icon: "😢" },
  anxious: { label: "焦虑",  color: "oklch(0.74 0.18 40)",  icon: "😰" },
  angry:   { label: "愤怒",  color: "oklch(0.72 0.18 20)",  icon: "😠" },
  neutral: { label: "普通",  color: "oklch(0.68 0.012 290)", icon: "😐" },
};

// ────── Archive grid line background (subtle paper grid) ──────
const GRID_BG = {
  backgroundImage: `
    linear-gradient(oklch(0.28 0.040 290 / 0.12) 1px, transparent 1px),
    linear-gradient(90deg, oklch(0.28 0.040 290 / 0.12) 1px, transparent 1px)
  `,
  backgroundSize: "28px 28px",
};

// ────── Stagger children ──────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.10 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 22 } },
};

// ────── Corner decoration for archive-style cards ──────
function CornerDots({ color = "oklch(0.40 0.055 290 / 0.55)" }: { color?: string }) {
  const s = 5;
  const corners = ["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"];
  return (
    <>
      {corners.map((cls) => (
        <span
          key={cls}
          className={`absolute ${cls} rounded-full`}
          style={{ width: s, height: s, background: color }}
        />
      ))}
    </>
  );
}

// ────── Stamp badge component ──────
function StampBadge({
  icon, label, desc, unlocked,
}: { icon: string; label: string; desc: string; unlocked: boolean }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col items-center gap-1.5 text-center"
    >
      <div
        className="relative flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-all"
        style={{
          border: `2px dashed ${unlocked ? "oklch(0.60 0.18 290 / 0.80)" : "oklch(0.32 0.030 290 / 0.45)"}`,
          background: unlocked
            ? "oklch(0.18 0.055 290)"
            : "oklch(0.14 0.020 290)",
          boxShadow: unlocked ? "0 0 18px oklch(0.38 0.18 290 / 0.35)" : "none",
          opacity: unlocked ? 1 : 0.42,
          filter: unlocked ? "none" : "grayscale(0.7)",
        }}
      >
        {icon}
        {unlocked && (
          <span
            className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-bold bg-[oklch(0.55_0.22_145)] text-[oklch(0.96_0.010_145)]"
          >
            ✓
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold leading-tight"
          style={{ color: unlocked ? "oklch(0.80 0.015 290)" : "oklch(0.42 0.015 290)" }}>
          {label}
        </p>
        <p className="text-[10px] leading-tight mt-0.5"
          style={{ color: unlocked ? "oklch(0.50 0.015 290)" : "oklch(0.35 0.012 290)" }}>
          {desc}
        </p>
      </div>
    </motion.div>
  );
}

// ────── Main page ──────
export default function SettingsPage() {
  const t = useTranslations("settings");
  const tMood = useTranslations("mood");
  const user = getUser();

  const [moodStats, setMoodStats] = useState<MoodStats | null>(null);
  const [coinData, setCoinData] = useState<CoinBalance | null>(null);
  const [capsuleCount, setCapsuleCount] = useState(0);

  useEffect(() => {
    diaryApi.moodStats().then(setMoodStats).catch(() => {});
    coinsApi.getBalance().then(setCoinData).catch(() => {});
    diaryApi.list({ is_capsule: true }).then((r) => setCapsuleCount(r.length)).catch(() => {});
  }, []);

  const archiveId = user?.id?.replace(/-/g, "").slice(0, 8).toUpperCase() ?? "--------";
  const createdDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const totalDiaries = moodStats?.total ?? 0;
  const streak = moodStats?.streak ?? 0;
  const totalEarned = coinData?.total_earned ?? 0;
  const coinBalance = coinData?.balance ?? 0;

  // Stats grid
  const STATS = [
    { icon: <BookOpen className="h-4 w-4" />, label: t("statDiaries"),  value: totalDiaries,          accent: "oklch(0.78 0.22 290)" },
    { icon: <TrendingUp className="h-4 w-4" />, label: t("statStreak"), value: `${streak}${t("streakUnit")}`, accent: "oklch(0.78 0.22 330)" },
    { icon: <Coins className="h-4 w-4" />,    label: t("statCoins"),    value: coinBalance,            accent: "oklch(0.80 0.18 80)"  },
    { icon: <Timer className="h-4 w-4" />,    label: t("statCapsules"), value: capsuleCount,           accent: "oklch(0.80 0.18 195)" },
    { icon: <TrendingUp className="h-4 w-4" />, label: t("statEarned"), value: `+${totalEarned}`,     accent: "oklch(0.75 0.18 80)"  },
  ];

  // Achievement unlock conditions
  const BADGES = [
    { id: "init",      icon: "📁", label: t("badge_init"),      desc: t("badge_init_desc"),      unlocked: true },
    { id: "writer",    icon: "✍️",  label: t("badge_writer"),    desc: t("badge_writer_desc"),    unlocked: totalDiaries >= 5 },
    { id: "streak",    icon: "🔥", label: t("badge_streak"),    desc: t("badge_streak_desc"),    unlocked: streak >= 3 },
    { id: "capsule",   icon: "⏳", label: t("badge_capsule"),   desc: t("badge_capsule_desc"),   unlocked: capsuleCount >= 1 },
    { id: "rich",      icon: "💰", label: t("badge_rich"),      desc: t("badge_rich_desc"),      unlocked: totalEarned >= 50 },
  ];

  // Mood spectrum data
  const sortedMoods = [...(moodStats?.stats ?? [])]
    .filter((s) => s.mood && s.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxMoodCount = sortedMoods[0]?.count ?? 1;

  return (
    <motion.div
      className="max-w-md mx-auto space-y-5 pb-10"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── 档案封面 ── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl p-6"
        style={{
          ...GRID_BG,
          background: "oklch(0.14 0.032 290)",
          border: "1px solid oklch(0.30 0.055 290 / 0.50)",
          boxShadow: "0 8px 32px oklch(0.06 0.025 290 / 0.60)",
        }}
      >
        <CornerDots />

        {/* watermark */}
        <div
          className="pointer-events-none absolute -right-4 -top-2 text-[88px] font-black select-none rotate-12 text-[oklch(0.22_0.040_290/0.30)] leading-none"
          aria-hidden
        >
          档案
        </div>

        {/* archive number badge */}
        <div className="flex items-center justify-between mb-5">
          <span
            className="rounded-lg px-2.5 py-1 font-mono text-[10px] tracking-widest bg-[oklch(0.20_0.040_290)] text-[oklch(0.55_0.12_290)] border border-[oklch(0.30_0.055_290/0.50)]"
          >
            #{archiveId}
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium bg-[oklch(0.18_0.055_145)] text-[oklch(0.72_0.18_145)] border border-[oklch(0.35_0.12_145/0.50)]"
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-[oklch(0.65_0.20_145)]" />
            {t("archiveStatus")}
          </span>
        </div>

        {/* avatar + identity */}
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.24 290), oklch(0.50 0.22 330))",
              boxShadow: "0 0 24px oklch(0.40 0.22 290 / 0.45)",
              color: "white",
            }}
          >
            {user?.username?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate text-pu-text">
              {user?.username ?? "—"}
            </h1>
            <p className="text-xs truncate mt-0.5 text-pu-dim">
              {user?.email ?? "—"}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <Clock className="h-3 w-3 shrink-0 text-pu-very-dim" />
              <span className="text-[10px] text-pu-very-dim">
                {t("archiveCreated")} {createdDate}
              </span>
            </div>
          </div>
        </div>

        {/* divider — dashed like a tear line */}
        <div className="mt-5 border-t border-dashed border-[oklch(0.28_0.040_290/0.50)]" />

        {/* file stamp at bottom */}
        <div className="mt-4 flex items-center gap-2">
          <Stamp className="h-3.5 w-3.5 shrink-0 text-[oklch(0.45_0.055_290)]" />
          <span className="font-mono text-[10px] tracking-widest text-[oklch(0.38_0.040_290)]">
            HEARTCAVE · PERSONAL ARCHIVE · {new Date().getFullYear()}
          </span>
        </div>
      </motion.div>

      {/* ── 时光印记 ── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl p-5"
        style={{
          background: "oklch(0.13 0.028 290)",
          border: "1px solid oklch(0.26 0.042 290 / 0.45)",
        }}
      >
        <CornerDots color="oklch(0.35 0.050 290 / 0.45)" />
        <p className="text-xs font-semibold tracking-widest mb-4 text-pu-very-dim">
        </p>
        <div className="grid grid-cols-3 gap-3">
          {STATS.map(({ icon, label, value, accent }) => (
            <div
              key={label}
              className="relative flex flex-col items-center gap-1.5 rounded-2xl py-3"
              style={{ background: "oklch(0.16 0.032 290)", border: `1px solid ${accent}22` }}
            >
              <div style={{ color: accent }}>{icon}</div>
              <span className="text-lg font-bold tabular-nums leading-none" style={{ color: accent }}>
                {value}
              </span>
              <span className="text-[10px] text-center leading-tight px-1 text-pu-very-dim">
                {label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── 心情光谱 ── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl p-5"
        style={{
          background: "oklch(0.13 0.028 290)",
          border: "1px solid oklch(0.26 0.042 290 / 0.45)",
        }}
      >
        <CornerDots color="oklch(0.35 0.050 290 / 0.45)" />
        <p className="text-xs font-semibold tracking-widest mb-4 text-pu-very-dim">
        </p>

        {sortedMoods.length === 0 ? (
          <p className="text-xs text-center py-3 text-pu-ghost">
            {t("moodEmpty")}
          </p>
        ) : (
          <div className="space-y-2.5">
            {sortedMoods.map(({ mood, count }) => {
              const meta = MOOD_META[mood ?? "neutral"] ?? MOOD_META.neutral;
              const pct = Math.round((count / maxMoodCount) * 100);
              return (
                <div key={mood} className="flex items-center gap-3">
                  <span className="w-5 text-center text-base leading-none">{meta.icon}</span>
                  <div className="flex-1 relative h-5 rounded-full overflow-hidden bg-[oklch(0.18_0.028_290)]">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: meta.color, opacity: 0.75 }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    />
                    <span className="absolute inset-0 flex items-center px-2.5 text-[10px] font-medium text-pu-text-2">
                      {tMood(mood ?? "neutral")} · {count}
                    </span>
                  </div>
                  <span className="w-7 text-right text-[10px] tabular-nums shrink-0 text-pu-very-dim">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── 成就印章 ── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl p-5"
        style={{
          background: "oklch(0.13 0.028 290)",
          border: "1px solid oklch(0.26 0.042 290 / 0.45)",
        }}
      >
        <CornerDots color="oklch(0.35 0.050 290 / 0.45)" />
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-semibold tracking-widest text-pu-very-dim">
            {t("badgesTitle")}
          </p>
          <span className="text-[10px] text-pu-ghost">
            {BADGES.filter((b) => b.unlocked).length} / {BADGES.length}
          </span>
        </div>
        <motion.div
          className="grid grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {BADGES.map((badge) => (
            <StampBadge key={badge.id} {...badge} />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

