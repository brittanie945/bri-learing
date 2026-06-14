import { useState } from "react";
import { Sparkles, Search } from "lucide-react";
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
  onSelect: (preset: TimePreset, query?: string, useSemantic?: boolean) => void;
  onClose: () => void;
  t: (key: string) => string;
}

export function TimeSelectModal({ open, onSelect, onClose, t }: TimeSelectModalProps) {
  const [mode, setMode] = useState<"time" | "smart">("time");
  const [query, setQuery] = useState("");

  const handleClose = () => {
    setMode("time");
    setQuery("");
    onClose();
  };

  const handleSmartSubmit = () => {
    if (!query.trim()) return;
    onSelect("all", query.trim(), true);
    setQuery("");
    setMode("time");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent
        showCloseButton
        className="max-w-md bg-pu-surface border border-pu-border-md p-6"
      >
        <DialogHeader className="items-center text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-1 bg-gradient-icon shadow-icon-glow">
            {mode === "smart" ? (
              <Search className="h-7 w-7 text-white" />
            ) : (
              <Sparkles className="h-7 w-7 text-white" />
            )}
          </div>
          <DialogTitle className="text-lg font-bold text-pu-text">
            {mode === "smart" ? t("smartTopic") : t("selectTime")}
          </DialogTitle>
          <DialogDescription className="text-sm text-pu-muted">
            {mode === "smart" ? t("smartTopicDesc") : t("selectTimeDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* 模式切换标签 */}
        <div className="flex rounded-xl p-0.5 bg-[oklch(0.18_0.040_290)] border border-[oklch(0.30_0.045_290/0.50)]">
          <button
            onClick={() => setMode("time")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mode === "time"
                ? "bg-pu-surface-hi text-pu-text-2 shadow-sm"
                : "text-pu-label"
            }`}
          >
            {t("useTime")}
          </button>
          <button
            onClick={() => setMode("smart")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mode === "smart"
                ? "bg-pu-surface-hi text-pu-text-2 shadow-sm"
                : "text-pu-label"
            }`}
          >
            {t("useSmart")}
          </button>
        </div>

        {/* 时间预设模式 */}
        {mode === "time" && (
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
        )}

        {/* 智能搜索模式 */}
        {mode === "smart" && (
          <div className="space-y-3">
            <p className="text-sm text-pu-muted">{t("smartTopicLabel")}</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSmartSubmit(); }}
              placeholder={t("smartTopicPlaceholder")}
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none bg-[oklch(0.17_0.035_290)] border border-[oklch(0.30_0.045_290/0.50)] text-pu-text-3 placeholder:text-pu-ghost"
              autoFocus
            />
            <button
              onClick={handleSmartSubmit}
              disabled={!query.trim()}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-40 bg-gradient-chat-cta text-white"
            >
              {t("startNewSession")}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
