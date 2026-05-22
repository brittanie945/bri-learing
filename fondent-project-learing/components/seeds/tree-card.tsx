"use client";

import type { Seed } from "@/lib/api/seeds";

const SEED_ICONS: Record<string, string> = {
  happy: "☀️", sad: "🌧️", anxious: "⚡", calm: "🌙", angry: "🔥", neutral: "🌫️",
};

const SEED_LABEL: Record<string, string> = {
  happy: "开心", sad: "难过", anxious: "焦虑", calm: "平静", angry: "愤怒", neutral: "普通",
};

const TREE_EMOJI: Record<string, string> = {
  happy: "🌳", sad: "🌲", anxious: "🎄", calm: "🍀", angry: "🌴", neutral: "🌿",
};

interface Props {
  seed: Seed;
  index: number; // 第几棵树（从 1 开始）
}

export function TreeCard({ seed, index }: Props) {
  const plantedDate = new Date(seed.planted_at).toLocaleDateString("zh-CN", {
    year: "numeric", month: "short", day: "numeric",
  });
  const sproutedDate = seed.sprouted_at
    ? new Date(seed.sprouted_at).toLocaleDateString("zh-CN", {
        month: "short", day: "numeric",
      })
    : null;

  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-[oklch(0.17_0.038_145/0.50)] border border-[oklch(0.38_0.14_145/0.35)]">
      {/* 大树序号 + 图标 */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl bg-[oklch(0.22_0.055_145/0.60)]">
          {TREE_EMOJI[seed.seed_type] ?? "🌳"}
        </div>
        <span className="text-[9px] font-bold text-[oklch(0.58_0.16_145)]">
          #{index}
        </span>
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{SEED_ICONS[seed.seed_type] ?? "🌱"}</span>
          <p className="text-xs font-semibold text-[oklch(0.82_0.12_145)] truncate">
            {SEED_LABEL[seed.seed_type] ?? seed.seed_type} 时光树
          </p>
        </div>
        {seed.task_note && (
          <p className="text-[11px] mt-0.5 truncate text-[oklch(0.55_0.08_145)]">
            🎯 {seed.task_note}
          </p>
        )}
        <p className="text-[10px] mt-0.5 text-[oklch(0.48_0.06_145)]">
          {plantedDate} 种下 · 坚持 {seed.streak_days} 天
        </p>
      </div>

      {/* 发芽日期 */}
      {sproutedDate && (
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-[oklch(0.65_0.15_145)]">🌸 {sproutedDate}</p>
          <p className="text-[9px] text-[oklch(0.48_0.06_145)]">发芽</p>
        </div>
      )}
    </div>
  );
}
