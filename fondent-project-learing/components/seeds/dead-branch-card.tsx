"use client";

import { useTranslations } from "next-intl";
import type { Seed } from "@/lib/api/seeds";

// Seed type mini icons
const SEED_ICONS: Record<string, string> = {
  happy: "☀️", sad: "🌧️", anxious: "⚡", calm: "🌙", angry: "🔥", neutral: "🌫️",
};

interface Props {
  seed: Seed;
}

export function DeadBranchCard({ seed }: Props) {
  const t = useTranslations("seeds");

  const plantedDate = new Date(seed.planted_at).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-opacity opacity-80 bg-branch-bg border border-branch-border"
    >
      {/* wilted icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base bg-branch-bg-icon"
      >
        {SEED_ICONS[seed.seed_type] ?? "🌱"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate text-branch-text">
          {t(`seedTypes.${seed.seed_type}`)}
          {seed.task_note && (
            <span className="text-branch-sub"> · {seed.task_note}</span>
          )}
        </p>
        <p className="text-[11px] mt-0.5 text-branch-muted">
          {t("deadBranchDesc", { day: seed.wither_day ?? seed.streak_days })}
        </p>
      </div>

      <div className="text-right shrink-0">
          <p className="text-[10px] text-branch-dim">
          {plantedDate}
        </p>
        {seed.is_revived && (
          <p className="text-[9px] mt-0.5" style={{ color: "oklch(0.55 0.14 165)" }}>
            曾复活
          </p>
        )}
      </div>
    </div>
  );
}
