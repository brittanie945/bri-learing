"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { SeedType } from "@/lib/api/seeds";

const SEED_TYPES: SeedType[] = ["happy", "sad", "anxious", "calm", "angry", "neutral"];

// oklch accent per mood, matching existing theme language
const SEED_COLORS: Record<SeedType, { bg: string; border: string; text: string }> = {
  happy:   { bg: "oklch(0.22 0.055 80)",  border: "oklch(0.55 0.18 80 / 0.6)",  text: "oklch(0.85 0.22 80)"  },
  sad:     { bg: "oklch(0.20 0.040 256)", border: "oklch(0.52 0.16 256 / 0.6)", text: "oklch(0.80 0.18 256)" },
  anxious: { bg: "oklch(0.21 0.055 40)",  border: "oklch(0.55 0.18 40 / 0.6)",  text: "oklch(0.82 0.20 40)"  },
  calm:    { bg: "oklch(0.20 0.045 165)", border: "oklch(0.52 0.16 165 / 0.6)", text: "oklch(0.80 0.18 165)" },
  angry:   { bg: "oklch(0.21 0.060 20)",  border: "oklch(0.55 0.20 20 / 0.6)",  text: "oklch(0.82 0.22 20)"  },
  neutral: { bg: "oklch(0.18 0.018 290)", border: "oklch(0.44 0.015 290 / 0.6)",text: "oklch(0.75 0.015 290)"},
};

interface Props {
  onClose: () => void;
  onPlant: (seedType: SeedType, taskNote: string) => Promise<void>;
}

export function PlantModal({ onClose, onPlant }: Props) {
  const t = useTranslations("seeds");
  const [selectedType, setSelectedType] = useState<SeedType | null>(null);
  const [taskNote, setTaskNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePlant() {
    if (!selectedType) return;
    setLoading(true);
    setError("");
    try {
      await onPlant(selectedType, taskNote.trim());
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "种植失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{ background: "oklch(0.08 0.020 290 / 0.75)" }}
          onClick={onClose}
        />

        <motion.div
          className="relative w-full max-w-sm rounded-3xl p-6 space-y-5"
          style={{
            background: "oklch(0.14 0.032 290)",
            border: "1px solid oklch(0.30 0.055 290 / 0.50)",
            boxShadow: "0 24px 64px oklch(0.05 0.025 290 / 0.70)",
          }}
          initial={{ y: 40, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
        >
          <h2 className="text-base font-semibold" style={{ color: "oklch(0.88 0.015 290)" }}>
            {t("plantModalTitle")}
          </h2>

          {/* mood selector */}
          <div>
            <p className="text-xs mb-2.5" style={{ color: "oklch(0.52 0.015 290)" }}>
              {t("plantModalMoodLabel")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SEED_TYPES.map((type) => {
                const c = SEED_COLORS[type];
                const active = selectedType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className="rounded-xl px-2 py-2.5 text-xs font-medium transition-all duration-150 hover:scale-[1.04] active:scale-[0.97]"
                    style={{
                      background: active ? c.bg : "oklch(0.17 0.026 290)",
                      border: `1px solid ${active ? c.border : "oklch(0.26 0.036 290 / 0.40)"}`,
                      color: active ? c.text : "oklch(0.55 0.015 290)",
                      boxShadow: active ? `0 0 14px ${c.bg}` : "none",
                    }}
                  >
                    {t(`seedTypes.${type}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* optional task */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: "oklch(0.52 0.015 290)" }}>
              {t("plantModalTaskLabel")}
            </p>
            <textarea
              rows={2}
              maxLength={80}
              value={taskNote}
              onChange={(e) => setTaskNote(e.target.value)}
              placeholder={t("plantModalTaskPlaceholder")}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none placeholder:opacity-40 transition-colors"
              style={{
                background: "oklch(0.18 0.030 290)",
                border: "1px solid oklch(0.28 0.040 290 / 0.45)",
                color: "oklch(0.85 0.012 290)",
              }}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {/* actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
              style={{
                background: "oklch(0.18 0.026 290)",
                border: "1px solid oklch(0.28 0.038 290 / 0.45)",
                color: "oklch(0.55 0.015 290)",
              }}
            >
              {t("plantModalCancel")}
            </button>
            <button
              onClick={handlePlant}
              disabled={!selectedType || loading}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: selectedType
                  ? `linear-gradient(135deg, oklch(0.55 0.22 145), oklch(0.50 0.20 165))`
                  : "oklch(0.22 0.030 290)",
                color: "oklch(0.95 0.010 145)",
                boxShadow: selectedType ? "0 0 20px oklch(0.45 0.20 145 / 0.40)" : "none",
              }}
            >
              {loading ? "种植中…" : t("plantModalConfirm")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
