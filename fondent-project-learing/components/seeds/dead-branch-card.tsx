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
      className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-opacity"
      style={{
        background: "oklch(0.15 0.020 50)",
        border: "1px solid oklch(0.28 0.040 50 / 0.45)",
        opacity: 0.80,
      }}
    >
      {/* wilted icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
        style={{ background: "oklch(0.20 0.028 50)" }}
      >
        {SEED_ICONS[seed.seed_type] ?? "🌱"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: "oklch(0.62 0.055 50)" }}>
          {t(`seedTypes.${seed.seed_type}`)}
          {seed.task_note && (
            <span style={{ color: "oklch(0.48 0.030 50)" }}> · {seed.task_note}</span>
          )}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "oklch(0.44 0.025 50)" }}>
          {t("deadBranchDesc", { day: seed.wither_day ?? seed.streak_days })}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[10px]" style={{ color: "oklch(0.40 0.020 50)" }}>
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
