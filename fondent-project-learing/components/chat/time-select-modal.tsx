import { Sparkles } from "lucide-react";

export const TIME_PRESETS = [
  { key: "all", labelKey: "allTime",     icon: "🌌" },
  { key: "3m",  labelKey: "recent3m",    icon: "🌱" },
  { key: "6m",  labelKey: "halfYear",    icon: "🍂" },
  { key: "1y",  labelKey: "oneYearAgo",  icon: "📅" },
  { key: "2y",  labelKey: "twoYearsAgo", icon: "⏳" },
] as const;

export type TimePreset = (typeof TIME_PRESETS)[number]["key"];

interface TimeSelectModalProps {
  onSelect: (preset: TimePreset) => void;
  onClose: () => void;
  t: (key: string) => string;
}

export function TimeSelectModal({ onSelect, onClose, t }: TimeSelectModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{ background: "oklch(0.06 0.028 290 / 0.75)", backdropFilter: "blur(8px)" }}
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{
          background: "oklch(0.14 0.032 290)",
          border: "1px solid oklch(0.30 0.055 290 / 0.55)",
          boxShadow: "0 24px 60px oklch(0.05 0.030 290 / 0.80)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 图标 + 标题 */}
        <div className="text-center mb-6">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-3"
            style={{
              background: "linear-gradient(135deg, oklch(0.52 0.24 290), oklch(0.48 0.24 330))",
              boxShadow: "0 0 28px oklch(0.40 0.28 300 / 0.45)",
            }}
          >
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-bold" style={{ color: "oklch(0.93 0.010 290)" }}>
            {t("selectTime")}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "oklch(0.52 0.015 290)" }}>
            {t("selectTimeDesc")}
          </p>
        </div>

        {/* 预设选项 */}
        <div className="grid grid-cols-1 gap-2.5">
          {TIME_PRESETS.map(({ key, labelKey, icon }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-150 hover:scale-[1.01]"
              style={{
                background: "oklch(0.18 0.040 290)",
                border: "1px solid oklch(0.32 0.055 290 / 0.45)",
                color: "oklch(0.85 0.015 290)",
              }}
            >
              <span className="text-xl">{icon}</span>
              <span className="font-medium text-sm">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
