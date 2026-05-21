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
      className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-medium shadow-xl"
      style={{
        background: "oklch(0.20 0.050 145)",
        border: "1px solid oklch(0.40 0.18 145 / 0.55)",
        color: "oklch(0.88 0.18 145)",
        maxWidth: "88vw",
      }}
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
        <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "oklch(0.55 0.18 290 / 0.5)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-start overflow-x-hidden"
      style={{
        background: "linear-gradient(180deg, oklch(0.18 0.032 290) 0%, oklch(0.12 0.045 120) 100%)",
        paddingBottom: 32,
      }}
    >
      {/* ── Header ── */}
      <div className="w-full max-w-2xl mx-auto pt-8 pb-2 text-center select-none">
        <h1 className="text-2xl font-bold tracking-wide" style={{ color: "oklch(0.92 0.012 290)" }}>
          {t("title")} 🌱
        </h1>
        <p className="text-base mt-1" style={{ color: "oklch(0.60 0.015 290)" }}>
          {t("subtitle")}
        </p>
      </div>

      {/* ── Main animation area ── */}
      <div
        className="relative w-full flex flex-col items-center justify-center"
        style={{ minHeight: 420, height: "40vh", maxHeight: 520 }}
      >
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
              <p className="text-base font-medium" style={{ color: "oklch(0.75 0.015 290)" }}>
                {t("noSeed")}
              </p>
              <p className="text-xs" style={{ color: "oklch(0.48 0.015 290)" }}>
                {t("noSeedDesc")}
              </p>
              <button
                onClick={() => setShowPlant(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all duration-150 hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.22 145), oklch(0.50 0.20 165))",
                  color: "oklch(0.96 0.010 145)",
                  boxShadow: "0 0 22px oklch(0.45 0.20 145 / 0.40)",
                }}
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
                  <p className="text-base font-semibold" style={{ color: "oklch(0.82 0.015 290)" }}>
                    {t("streak", { days: seed.streak_days })}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.015 290)" }}>
                    {t("streakOf", { days: seed.streak_days })}
                  </p>
                </div>
                <StreakDots days={seed.streak_days} />
              </div>

              {seed.task_note && (
                <p className="text-xs rounded-xl px-3 py-2"
                  style={{ background: "oklch(0.18 0.028 290)", color: "oklch(0.60 0.015 290)" }}>
                  🎯 {seed.task_note}
                </p>
              )}

              <button
                onClick={handleWater}
                disabled={isWatering}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, oklch(0.40 0.18 240), oklch(0.45 0.20 200))",
                  color: "oklch(0.94 0.010 220)",
                  boxShadow: "0 0 20px oklch(0.35 0.16 220 / 0.40)",
                }}
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
              <p className="text-lg font-bold" style={{ color: "oklch(0.88 0.22 80)" }}>
                {t("sproutedTitle")}
              </p>
              <p className="text-base" style={{ color: "oklch(0.62 0.015 290)" }}>
                {t("sproutedDesc")}
              </p>
              <p className="text-xs font-semibold" style={{ color: "oklch(0.80 0.18 80)" }}>
                {t("sproutedCoins")}
              </p>
              <button
                onClick={() => setShowPlant(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold mt-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.22 145), oklch(0.50 0.20 165))",
                  color: "oklch(0.96 0.010 145)",
                  boxShadow: "0 0 18px oklch(0.45 0.20 145 / 0.35)",
                }}
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
              <div className="rounded-2xl px-4 py-3 text-center"
                style={{ background: "oklch(0.17 0.022 50)", border: "1px solid oklch(0.30 0.040 50 / 0.40)" }}>
                <p className="text-sm font-medium" style={{ color: "oklch(0.68 0.10 50)" }}>
                  {t("witherTitle")}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "oklch(0.48 0.055 50)" }}>
                  {t("witherDesc")}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPlant(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-medium transition-all hover:scale-[1.02]"
                  style={{
                    background: "oklch(0.18 0.030 290)",
                    border: "1px solid oklch(0.30 0.050 290 / 0.45)",
                    color: "oklch(0.65 0.015 290)",
                  }}
                >
                  <Leaf className="h-3.5 w-3.5" />
                  {t("plantBtn")}
                </button>
                {hasRevivalVoucher ? (
                  <button
                    onClick={handleRevive}
                    disabled={isReviving}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.42 0.18 200), oklch(0.40 0.16 180))",
                      color: "oklch(0.92 0.010 200)",
                      boxShadow: "0 0 14px oklch(0.38 0.15 200 / 0.35)",
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isReviving ? "复活中…" : t("reviveBtn")}
                  </button>
                ) : (
                  <div
                    className="flex-1 flex items-center justify-center gap-1 rounded-2xl py-2.5 text-xs"
                    style={{ background: "oklch(0.16 0.020 290)", color: "oklch(0.42 0.015 290)" }}
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
          <p className="text-xs font-medium tracking-widest" style={{ color: "oklch(0.44 0.018 290)" }}>
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
