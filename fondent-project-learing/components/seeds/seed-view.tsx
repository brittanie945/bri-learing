"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Leaf, Droplets, Sparkles, RefreshCw } from "lucide-react";
import { seedsApi, type Seed, type CurrentSeedResponse } from "@/lib/api/seeds";
import { coinsApi } from "@/lib/api/coins";
import { SeedAnimation } from "./seed-animation";
import { PlantModal } from "./plant-modal";
import { DeadBranchCard } from "./dead-branch-card";
import type { SeedType } from "@/lib/api/seeds";

// Streak progress bar dots
function StreakDots({ days }: { days: number }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((d) => (
        <motion.div
          key={d}
          className="rounded-full"
          style={{
            width: 10,
            height: 10,
            background: d <= days
              ? "oklch(0.65 0.22 145)"
              : "oklch(0.24 0.036 290 / 0.50)",
            boxShadow: d <= days ? "0 0 8px oklch(0.55 0.20 145 / 0.60)" : "none",
          }}
          initial={false}
          animate={{ scale: d === days ? [1, 1.35, 1] : 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// Floating toast message
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3200);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <motion.div
      className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-medium shadow-xl bg-[oklch(0.20_0.050_145)] border border-[oklch(0.40_0.18_145/0.55)] text-[oklch(0.88_0.18_145)] max-w-[88vw]"
      initial={{ y: 24, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 12, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      {message}
    </motion.div>
  );
}

export function SeedView() {
  const t = useTranslations("seeds");
  const [data, setData] = useState<CurrentSeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlant, setShowPlant] = useState(false);
  const [isWatering, setIsWatering] = useState(false);
  const [isReviving, setIsReviving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hasRevivalVoucher, setHasRevivalVoucher] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [current, vouchers] = await Promise.all([
        seedsApi.getCurrent(),
        coinsApi.getMyVouchers(),
      ]);
      setData(current);
      setHasRevivalVoucher(
        vouchers.some((v) => v.voucher_type === "SEED_REVIVAL" && v.quantity > 0)
      );
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handlePlant(seedType: SeedType, taskNote: string) {
    await seedsApi.plant(seedType, taskNote || undefined);
    await refresh();
    setToast("种子种下了！记得每天浇水 🌱");
  }

  async function handleWater() {
    if (!data?.active_seed || isWatering) return;
    setIsWatering(true);
    try {
      const res = await seedsApi.water();
      await refresh();
      if (res.already_watered) {
        setToast(t("alreadyWatered"));
      } else {
        setToast(res.encouragement_message);
      }
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "浇水失败");
    } finally {
      setTimeout(() => setIsWatering(false), 900);
    }
  }

  async function handleRevive() {
    if (isReviving) return;
    setIsReviving(true);
    try {
      await seedsApi.revive();
      await refresh();
      setToast(t("reviveSuccess"));
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "复活失败");
    } finally {
      setIsReviving(false);
    }
  }

  const seed: Seed | null = data?.active_seed ?? null;
  const witherSeeds = data?.withered_seeds ?? [];
  const latestWithered = witherSeeds.find((s) => !s.is_revived) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin border-[oklch(0.55_0.18_290/0.5)]" />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-start overflow-x-hidden bg-[linear-gradient(180deg,oklch(0.18_0.032_290)_0%,oklch(0.12_0.045_120)_100%)] pb-8"
    >
      {/* ── Header ── */}
      <div className="w-full max-w-2xl mx-auto pt-8 pb-2 text-center select-none">
        <h1 className="text-2xl font-bold tracking-wide text-pu-text">
          {t("title")} 🌱
        </h1>
        <p className="text-base mt-1 text-pu-label">
          {t("subtitle")}
        </p>
      </div>

      {/* ── Main animation area ── */}
      <div
        className="relative w-full flex flex-col items-center justify-center"
        style={{ minHeight: 420, height: "40vh", maxHeight: 520 }}>
      <SeedAnimation
          status={seed?.status ?? null}
          streakDays={seed?.streak_days ?? 0}
          isWatering={isWatering}
          size={Math.min(window?.innerWidth ? window.innerWidth * 0.7 : 340, 420)}
        />
        {/* 预留大树空间，可后续扩展为大树动画 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full flex flex-col items-center pointer-events-none" style={{ height: 120 }}>
          {/* 这里可放大树根/树干/未来成长动画 */}
        </div>
      </div>

      {/* ── 操作区 ── */}
      <div className="w-full max-w-lg mx-auto mt-2 flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          {/* no seed */}
          {!seed && (
            <motion.div
              key="no-seed"
              className="text-center space-y-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <p className="text-base font-medium text-pu-text-3">
                {t("noSeed")}
              </p>
              <p className="text-xs text-pu-very-dim">
                {t("noSeedDesc")}
              </p>
              <button
                onClick={() => setShowPlant(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all duration-150 hover:scale-[1.03] active:scale-[0.97] bg-[linear-gradient(135deg,oklch(0.55_0.22_145),oklch(0.50_0.20_165))] text-[oklch(0.96_0.010_145)] shadow-[0_0_22px_oklch(0.45_0.20_145/0.40)]"
              >
                <Leaf className="h-4 w-4" />
                {t("plantBtn")}
              </button>
            </motion.div>
          )}

          {/* growing */}
          {seed?.status === "growing" && (
            <motion.div
              key="growing"
              className="space-y-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-pu-text-2">
                    {t("streak", { days: seed.streak_days })}
                  </p>
                  <p className="text-xs mt-0.5 text-pu-dim">
                    {t("streakOf", { days: seed.streak_days })}
                  </p>
                </div>
                <StreakDots days={seed.streak_days} />
              </div>

              {seed.task_note && (
                <p className="text-xs rounded-xl px-3 py-2 bg-[oklch(0.18_0.028_290)] text-pu-label">
                  🎯 {seed.task_note}
                </p>
              )}

              <button
                onClick={handleWater}
                disabled={isWatering}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 bg-[linear-gradient(135deg,oklch(0.40_0.18_240),oklch(0.45_0.20_200))] text-[oklch(0.94_0.010_220)] shadow-[0_0_20px_oklch(0.35_0.16_220/0.40)]"
              >
                <Droplets className="h-4 w-4" />
                {isWatering ? "浇水中…" : t("waterBtn")}
              </button>
            </motion.div>
          )}

          {/* sprouted */}
          {seed?.status === "sprouted" && (
            <motion.div
              key="sprouted"
              className="text-center space-y-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-lg font-bold text-amber">
                {t("sproutedTitle")}
              </p>
              <p className="text-base text-branch-text">
                {t("sproutedDesc")}
              </p>
              <p className="text-xs font-semibold text-[oklch(0.80_0.18_80)]">
                {t("sproutedCoins")}
              </p>
              <button
                onClick={() => setShowPlant(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold mt-2 transition-all hover:scale-[1.02] active:scale-[0.98] bg-[linear-gradient(135deg,oklch(0.55_0.22_145),oklch(0.50_0.20_165))] text-[oklch(0.96_0.010_145)] shadow-[0_0_18px_oklch(0.45_0.20_145/0.35)]"
              >
                <Leaf className="h-4 w-4" />
                种下新种子
              </button>
            </motion.div>
          )}

          {/* withered — show revive option if latest withered and has voucher */}
          {!seed && latestWithered && (
            <motion.div
              key="withered-revive"
              className="space-y-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="rounded-2xl px-4 py-3 text-center bg-[oklch(0.17_0.022_50)] border border-[oklch(0.30_0.040_50/0.40)]">
                <p className="text-sm font-medium text-[oklch(0.68_0.10_50)]">
                  {t("witherTitle")}
                </p>
                <p className="text-xs mt-0.5 text-[oklch(0.48_0.055_50)]">
                  {t("witherDesc")}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPlant(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-medium transition-all hover:scale-[1.02] bg-[oklch(0.18_0.030_290)] border border-[oklch(0.30_0.050_290/0.45)] text-pu-label"
                >
                  <Leaf className="h-3.5 w-3.5" />
                  {t("plantBtn")}
                </button>
                {hasRevivalVoucher ? (
                  <button
                    onClick={handleRevive}
                    disabled={isReviving}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 bg-[linear-gradient(135deg,oklch(0.42_0.18_200),oklch(0.40_0.16_180))] text-[oklch(0.92_0.010_200)] shadow-[0_0_14px_oklch(0.38_0.15_200/0.35)]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isReviving ? "复活中…" : t("reviveBtn")}
                  </button>
                ) : (
                  <div
                    className="flex-1 flex items-center justify-center gap-1 rounded-2xl py-2.5 text-xs bg-[oklch(0.16_0.020_290)] text-[oklch(0.42_0.015_290)]"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t("noRevivalVoucher")}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Dead branch records ── */}
      {witherSeeds.length > 0 && (
        <div className="w-full max-w-2xl mx-auto mt-8 space-y-2.5 px-2">
          <p className="text-xs font-medium tracking-widest text-pu-very-dim">
            {t("deadBranchTitle")}
          </p>
          {witherSeeds.map((s) => (
            <DeadBranchCard key={s.id} seed={s} />
          ))}
        </div>
      )}

      {/* ── Plant modal ── */}
      {showPlant && (
        <PlantModal
          onClose={() => setShowPlant(false)}
          onPlant={handlePlant}
        />
      )}

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
