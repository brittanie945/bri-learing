"use client";
import { useTranslations } from "next-intl";
import { BookOpen, ChevronRight } from "lucide-react";

interface DiarySavedCardProps {
  title: string;
  isActive: boolean;
  onClick: () => void;
}

export function DiarySavedCard({ title, isActive, onClick }: DiarySavedCardProps) {
  const t = useTranslations("chat");
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer my-3 mx-4 flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all group ${
        isActive
          ? "bg-[oklch(0.22_0.060_290/0.70)] border-[oklch(0.45_0.15_290/0.65)]"
          : "bg-[oklch(0.17_0.040_290/0.55)] border-[oklch(0.28_0.055_290/0.50)] hover:bg-[oklch(0.21_0.055_290/0.60)]"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.42_0.14_290)] to-[oklch(0.30_0.09_290)]">
        <BookOpen className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-pu-muted mb-0.5">{t("diarySavedCard")}</p>
        <p className="text-sm font-semibold text-pu-text-2 truncate">《{title}》</p>
      </div>
      <ChevronRight
        className={`h-4 w-4 shrink-0 transition-colors ${
          isActive ? "text-[oklch(0.60_0.12_290)]" : "text-pu-very-dim group-hover:text-pu-muted"
        }`}
      />
    </div>
  );
}
