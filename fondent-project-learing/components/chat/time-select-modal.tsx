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
        className="absolute inset-0 backdrop-blur-[8px] bg-[oklch(0.06_0.028_290/0.75)]"
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 bg-pu-surface border border-pu-border-md shadow-modal-light"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 图标 + 标题 */}
        <div className="text-center mb-6">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-3 bg-gradient-icon shadow-icon-glow"
          >
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-pu-text">
            {t("selectTime")}
          </h2>
          <p className="mt-1 text-sm text-pu-muted">
            {t("selectTimeDesc")}
          </p>
        </div>

        {/* 预设选项 */}
        <div className="grid grid-cols-1 gap-2.5">
          {TIME_PRESETS.map(({ key, labelKey, icon }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-150 hover:scale-[1.01] bg-[oklch(0.18_0.040_290)] border border-[oklch(0.32_0.055_290/0.45)] text-pu-text-3"
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
