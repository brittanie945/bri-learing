import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const TIME_PRESETS = [
  { key: "all", labelKey: "allTime",     icon: "🌌" },
  { key: "3m",  labelKey: "recent3m",    icon: "🌱" },
  { key: "6m",  labelKey: "halfYear",    icon: "🍂" },
  { key: "1y",  labelKey: "oneYearAgo",  icon: "📅" },
  { key: "2y",  labelKey: "twoYearsAgo", icon: "⏳" },
] as const;

export type TimePreset = (typeof TIME_PRESETS)[number]["key"];

interface TimeSelectModalProps {
  open: boolean;
  onSelect: (preset: TimePreset) => void;
  onClose: () => void;
  t: (key: string) => string;
}

export function TimeSelectModal({ open, onSelect, onClose, t }: TimeSelectModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton
        className="max-w-md bg-pu-surface border border-pu-border-md p-6"
      >
        <DialogHeader className="items-center text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-1 bg-gradient-icon shadow-icon-glow">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <DialogTitle className="text-lg font-bold text-pu-text">
            {t("selectTime")}
          </DialogTitle>
          <DialogDescription className="text-sm text-pu-muted">
            {t("selectTimeDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* 预设选项 */}
        <div className="grid grid-cols-1 gap-2.5 mt-2">
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
      </DialogContent>
    </Dialog>
  );
}
