"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { seedsApi, type Seed } from "@/lib/api/seeds";

const SEED_ICONS: Record<string, string> = {
  happy: "☀️", sad: "🌧️", anxious: "⚡", calm: "🌙", angry: "🔥", neutral: "🌫️",
};
const SEED_LABEL: Record<string, string> = {
  happy: "阳光", sad: "雨天", anxious: "风暴", calm: "静谧", angry: "火焰", neutral: "云朵",
};
// 发芽后的大树图标 — 每种心情对应不同的树
const TREE_EMOJI: Record<string, string> = {
  happy:   "🌳",  // 金色橡树
  sad:     "🌲",  // 墨绿杉树
  anxious: "🎄",  // 棱角分明的针叶树
  calm:    "🍀",  // 四叶草 / 禅意小景
  angry:   "🌴",  // 火焰树（棕榈）
  neutral: "🌿",  // 安静的灌木
};
// 每种心情对应的大树颜色主题
const TREE_THEME: Record<string, { bg: string; border: string; accent: string; glow: string }> = {
  happy:   { bg: "oklch(0.19 0.045 80)",  border: "oklch(0.40 0.14 80 / 0.45)",  accent: "oklch(0.78 0.18 80)",  glow: "oklch(0.55 0.16 80 / 0.30)" },
  sad:     { bg: "oklch(0.17 0.035 240)", border: "oklch(0.38 0.12 240 / 0.45)", accent: "oklch(0.72 0.16 240)", glow: "oklch(0.50 0.14 240 / 0.30)" },
  anxious: { bg: "oklch(0.17 0.042 300)", border: "oklch(0.40 0.14 300 / 0.45)", accent: "oklch(0.76 0.20 300)", glow: "oklch(0.52 0.16 300 / 0.30)" },
  calm:    { bg: "oklch(0.17 0.032 260)", border: "oklch(0.36 0.10 260 / 0.45)", accent: "oklch(0.74 0.14 260)", glow: "oklch(0.50 0.12 260 / 0.30)" },
  angry:   { bg: "oklch(0.18 0.045 25)",  border: "oklch(0.42 0.16 25 / 0.45)",  accent: "oklch(0.76 0.20 25)",  glow: "oklch(0.54 0.18 25 / 0.30)" },
  neutral: { bg: "oklch(0.17 0.018 270)", border: "oklch(0.36 0.08 270 / 0.45)", accent: "oklch(0.72 0.10 270)", glow: "oklch(0.50 0.08 270 / 0.30)" },
};

function TreeBlock({ seed, index }: { seed: Seed; index: number }) {
  const theme = TREE_THEME[seed.seed_type] ?? TREE_THEME.neutral;
  const plantedDate = new Date(seed.planted_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  const sproutedDate = seed.sprouted_at
    ? new Date(seed.sprouted_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex flex-col gap-2 rounded-2xl p-4"
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        boxShadow: `0 4px 20px ${theme.glow}`,
      }}
    >
      {/* 大树图标 + 序号 */}
      <div className="flex items-start justify-between">
        <div className="text-3xl leading-none">{TREE_EMOJI[seed.seed_type] ?? "🌱"}</div>
        <span
          className="text-[10px] font-bold rounded-full px-2 py-0.5"
          style={{ color: theme.accent, background: `${theme.bg}`, border: `1px solid ${theme.border}` }}
        >
          #{index}
        </span>
      </div>

      {/* 种类 */}
      <div className="flex items-center gap-1.5">
        <span className="text-base">{SEED_ICONS[seed.seed_type] ?? "🌱"}</span>
        <span className="text-xs font-semibold" style={{ color: theme.accent }}>
          {SEED_LABEL[seed.seed_type] ?? seed.seed_type}树
        </span>
      </div>

      {/* 任务备注 */}
      {seed.task_note && (
        <p className="text-[11px] leading-snug line-clamp-2 text-[oklch(0.60_0.015_290)]">
          🎯 {seed.task_note}
        </p>
      )}

      {/* 日期信息 */}
      <div className="mt-auto pt-1 border-t border-[oklch(0.30_0.020_290/0.30)] space-y-0.5">
        <p className="text-[10px] text-[oklch(0.50_0.012_290)]">
          {plantedDate} 种下 · 坚持 {seed.streak_days} 天
        </p>
        {sproutedDate && (
          <p className="text-[10px]" style={{ color: theme.accent }}>
            🌸 {sproutedDate} 发芽
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function ForestView() {
  const router = useRouter();
  const [trees, setTrees] = useState<Seed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedsApi.getCurrent()
      .then((r) => setTrees(r.sprouted_seeds))
      .catch(() => setTrees([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,oklch(0.13_0.028_290)_0%,oklch(0.11_0.038_145)_100%)] px-4 py-6">
      <div className="max-w-2xl mx-auto">

        {/* 顶部 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center h-8 w-8 rounded-xl transition-colors hover:bg-[oklch(0.20_0.032_290)] text-pu-very-dim"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-pu-text">我的时光森林</h1>
            <p className="text-xs text-pu-muted mt-0.5">每一棵树都是你坚持过的证明</p>
          </div>
          {trees.length > 0 && (
            <span className="ml-auto text-sm font-bold text-[oklch(0.70_0.16_145)]">
              {trees.length} 棵
            </span>
          )}
        </div>

        {/* 加载中 */}
        {loading && (
          <div className="flex justify-center py-24">
            <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin border-[oklch(0.55_0.16_145/0.6)]" />
          </div>
        )}

        {/* 空状态 */}
        {!loading && trees.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="text-5xl">🌱</div>
            <p className="text-sm font-medium text-pu-text-3">森林还没有树</p>
            <p className="text-xs text-pu-very-dim max-w-xs">
              种下一颗种子，连续浇水 3 天就能发芽成树，留在这里记录你的坚持
            </p>
            <button
              onClick={() => router.push("/seeds")}
              className="mt-2 rounded-xl px-4 py-2 text-xs font-medium bg-[oklch(0.20_0.055_145/0.60)] text-[oklch(0.78_0.18_145)] border border-[oklch(0.38_0.14_145/0.35)]"
            >
              去种一棵种子
            </button>
          </div>
        )}

        {/* 大树网格 */}
        {!loading && trees.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {trees.map((tree, i) => (
              <TreeBlock key={tree.id} seed={tree} index={trees.length - i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
