"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Timer } from "lucide-react";
import { diaryApi, type DiaryListItem, type DiaryCreatePayload } from "@/lib/api/diary";
import { coinsApi, type VoucherType, type VoucherInventoryItem } from "@/lib/api/coins";
import DiaryEditor from "@/components/diary-editor";
import { MOOD_COLORS } from "@/components/mood-picker";
import type { Mood } from "@/lib/api/diary";

type View = "list" | "new" | "capsule";

// ────── Coins toast ──────
function CoinToast({ amount, onDone }: { amount: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <div className="rounded-2xl px-5 py-3 shadow-2xl text-sm font-bold flex items-center gap-2"
        style={{ background: "linear-gradient(135deg, oklch(0.22 0.070 290), oklch(0.18 0.050 290))", color: "oklch(0.82 0.22 290)", border: "1px solid oklch(0.40 0.14 290 / 0.60)" }}>
        🪙 +{amount} 时光币
      </div>
    </div>
  );
}

// ────── Voucher confirm modal ──────
function VoucherModal({
  type, entryId, onClose, onSuccess,
}: {
  type: VoucherType; entryId: string; onClose: () => void; onSuccess: (msg: string, newBalance: number) => void;
}) {
  const t = useTranslations("coins");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const warnings: Record<VoucherType, string> = {
    TIME_ACCELERATE: t("accelerateWarning"),
    TIME_FREEZE: t("freezeWarning"),
    REWIND: t("rewindWarning"),
    SEED_REVIVAL: "",
  };
  const icons: Record<VoucherType, string> = {
    TIME_ACCELERATE: "⚡",
    TIME_FREEZE: "❄️",
    REWIND: "🔄",
    SEED_REVIVAL: "💧",
  };
  const names: Record<VoucherType, string> = {
    TIME_ACCELERATE: t("accelerate"),
    TIME_FREEZE: t("freeze"),
    REWIND: t("rewind"),
    SEED_REVIVAL: t("seedRevival"),
  };

  const hueMap: Record<VoucherType, number> = {
    TIME_ACCELERATE: 70, TIME_FREEZE: 220, REWIND: 290, SEED_REVIVAL: 165,
  };
  const hue = hueMap[type];

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await coinsApi.useVoucher(type, entryId);
      onSuccess(res.message, res.new_balance);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[oklch(0.04_0.020_290/0.80)] backdrop-blur-md" />
      <div className="relative rounded-3xl p-6 max-w-sm w-full space-y-4"
        style={{ background: "oklch(0.11 0.030 290)", border: `1px solid oklch(0.32 0.060 ${hue} / 0.50)` }}
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-3xl"
            style={{ background: `linear-gradient(135deg, oklch(0.26 0.070 ${hue}), oklch(0.18 0.045 ${hue}))`, boxShadow: `0 0 20px oklch(0.50 0.18 ${hue} / 0.35)` }}>
            {icons[type]}
          </div>
          <h3 className="text-base font-bold" style={{ color: "oklch(0.88 0.015 290)" }}>{names[type]}</h3>
          <p className="text-xs leading-relaxed" style={{ color: "oklch(0.55 0.015 290)" }}>{warnings[type]}</p>
          <p className="text-xs font-semibold rounded-xl px-3 py-1.5 inline-block"
            style={{ background: `oklch(0.20 0.055 ${hue} / 0.50)`, color: `oklch(0.78 0.20 ${hue})` }}>
            消耗 1 张 {icons[type]}（背包库存）
          </p>
        </div>
        {error && <p className="text-xs text-center" style={{ color: "oklch(0.72 0.18 15)" }}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-2xl py-2 text-sm font-medium"
            style={{ background: "oklch(0.18 0.032 290)", color: "oklch(0.55 0.015 290)" }}>
            {t("cancel")}
          </button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 rounded-2xl py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, oklch(0.62 0.22 ${hue}), oklch(0.55 0.20 ${hue + 25}))`, color: "white" }}>
            {loading ? t("using") : t("confirmUse")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ────── DiaryCard ──────
function DiaryCard({
  entry, t, onClick, onVoucher, inventory,
}: {
  entry: DiaryListItem;
  t: ReturnType<typeof useTranslations>;
  onClick: () => void;
  onVoucher: (type: VoucherType, id: string) => void;
  inventory: VoucherInventoryItem[];
}) {
  const isLocked = entry.is_capsule && entry.unlock_at && new Date(entry.unlock_at) > new Date();
  const moodColor = entry.mood ? MOOD_COLORS[entry.mood as Mood] : "bg-slate-100 text-slate-500 border-slate-200";
  const accelQty = inventory.find((i) => i.voucher_type === "TIME_ACCELERATE")?.quantity ?? 0;
  const freezeQty = inventory.find((i) => i.voucher_type === "TIME_FREEZE")?.quantity ?? 0;

  return (
    <div className="rounded-2xl border p-4 transition-all"
      style={{ background: "oklch(0.14 0.030 290)", borderColor: "oklch(0.26 0.038 290 / 0.50)" }}>
      <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={onClick}>
        <div className="flex-1 min-w-0">
          {isLocked ? (
            <p className="text-sm font-semibold" style={{ color: "oklch(0.52 0.015 290)" }}>{t("locked")}</p>
          ) : (
            <h3 className="font-semibold truncate" style={{ color: "oklch(0.85 0.015 290)" }}>
              {entry.title}
            </h3>
          )}
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.44 0.015 290)" }}>
            {new Date(entry.created_at).toLocaleDateString()}
            {isLocked && entry.unlock_at && (
              <span className="ml-2" style={{ color: "oklch(0.70 0.18 70)" }}>
                {t("unlocksOn")} {new Date(entry.unlock_at).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {entry.mood && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${moodColor}`}>{entry.mood}</span>
          )}
          {entry.is_capsule && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "oklch(0.22 0.055 70 / 0.40)", color: "oklch(0.72 0.18 70)" }}>⏰</span>
          )}
        </div>
      </div>

      {/* Voucher buttons for locked capsules */}
      {isLocked && (accelQty > 0 || freezeQty > 0) && (
        <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {accelQty > 0 && (
            <button onClick={() => onVoucher("TIME_ACCELERATE", entry.id)}
              className="flex-1 rounded-xl py-1.5 text-xs font-medium transition-colors"
              style={{ background: "oklch(0.22 0.050 70 / 0.50)", color: "oklch(0.75 0.18 70)", border: "1px solid oklch(0.40 0.14 70 / 0.40)" }}>
              ⚡ 加速开启 <span className="opacity-70">({accelQty}张)</span>
            </button>
          )}
          {freezeQty > 0 && (
            <button onClick={() => onVoucher("TIME_FREEZE", entry.id)}
              className="flex-1 rounded-xl py-1.5 text-xs font-medium transition-colors"
              style={{ background: "oklch(0.18 0.040 220 / 0.50)", color: "oklch(0.72 0.18 220)", border: "1px solid oklch(0.38 0.12 220 / 0.40)" }}>
              ❄️ 冻结延期 <span className="opacity-70">({freezeQty}张)</span>
            </button>
          )}
        </div>
      )}

      {!isLocked && entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {entry.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: "oklch(0.20 0.045 290 / 0.60)", color: "oklch(0.62 0.015 290)" }}>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ────── Page ──────
export default function DiaryPage() {
  const t = useTranslations("diary");
  const tm = useTranslations("mood");
  const router = useRouter();
  const [view, setView] = useState<View>("list");
  const [entries, setEntries] = useState<DiaryListItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterMood, setFilterMood] = useState<string>("");
  const [showCapsuleOnly, setShowCapsuleOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coinToast, setCoinToast] = useState(0);
  const [voucherModal, setVoucherModal] = useState<{ type: VoucherType; id: string } | null>(null);
  const [voucherMsg, setVoucherMsg] = useState("");
  const [inventory, setInventory] = useState<VoucherInventoryItem[]>([]);

  const refreshInventory = useCallback(() => {
    coinsApi.getMyVouchers().then(setInventory).catch(() => {});
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await diaryApi.list({
        search: search || undefined,
        mood: filterMood || undefined,
        is_capsule: showCapsuleOnly || undefined,
      });
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [search, filterMood, showCapsuleOnly]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  const handleSave = async (payload: DiaryCreatePayload) => {
    const res = await diaryApi.create({ ...payload, is_capsule: view === "capsule" || payload.is_capsule }) as { coins_earned?: number } & typeof payload;
    if (res.coins_earned > 0) setCoinToast(res.coins_earned);
    setView("list");
    fetchEntries();
  };

  const handleVoucherSuccess = (msg: string, _newBalance: number) => {
    setVoucherMsg(`${msg}`);
    setTimeout(() => setVoucherMsg(""), 3000);
    fetchEntries();
    refreshInventory();
  };

  if (view !== "list") {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <button onClick={() => setView("list")} className="text-sm flex items-center gap-1 transition-colors"
          style={{ color: "oklch(0.65 0.18 290)" }}>
          ← {t("cancel")}
        </button>
        <h1 className="text-2xl font-bold" style={{ color: "oklch(0.88 0.015 290)" }}>
          {view === "capsule" ? t("newCapsule") : t("newDiary")}
        </h1>
        <DiaryEditor
          onSave={handleSave}
          onCancel={() => setView("list")}
          isCapsuleMode={view === "capsule"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "oklch(0.88 0.015 290)" }}>{t("title")}</h1>
        <div className="flex gap-2">
          <button onClick={() => setView("capsule")}
            className="px-3 py-1.5 text-sm rounded-xl inline-flex items-center gap-1 font-medium transition-colors"
            style={{ background: "oklch(0.22 0.055 70 / 0.40)", color: "oklch(0.75 0.18 70)", border: "1px solid oklch(0.40 0.14 70 / 0.40)" }}>
            <Timer className="h-4 w-4" /> {t("newCapsule")}
          </button>
          <button onClick={() => setView("new")}
            className="px-3 py-1.5 text-sm rounded-xl inline-flex items-center gap-1 font-semibold transition-colors"
            style={{ background: "linear-gradient(135deg, oklch(0.68 0.24 290), oklch(0.65 0.24 330))", color: "white" }}>
            <Plus className="h-4 w-4" /> {t("newDiary")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")}
          className="flex-1 min-w-40 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
          style={{ background: "oklch(0.17 0.035 290)", border: "1px solid oklch(0.30 0.045 290 / 0.50)", color: "oklch(0.85 0.012 290)" }} />
        <select value={filterMood} onChange={(e) => setFilterMood(e.target.value)}
          className="rounded-xl px-3 py-1.5 text-sm focus:outline-none"
          style={{ background: "oklch(0.17 0.035 290)", border: "1px solid oklch(0.30 0.045 290 / 0.50)", color: "oklch(0.75 0.012 290)" }}>
          <option value="">{t("all")}</option>
          {["happy", "sad", "anxious", "calm", "angry", "neutral"].map((m) => (
            <option key={m} value={m}>{tm(m)}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm px-2" style={{ color: "oklch(0.60 0.015 290)" }}>
          <input type="checkbox" checked={showCapsuleOnly} onChange={(e) => setShowCapsuleOnly(e.target.checked)} className="accent-amber-500" />
          {t("filterCapsule")}
        </label>
      </div>

      {/* Voucher success msg */}
      {voucherMsg && (
        <p className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "oklch(0.16 0.045 140)", color: "oklch(0.75 0.18 140)", border: "1px solid oklch(0.35 0.12 140 / 0.40)" }}>
          ✓ {voucherMsg}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "oklch(0.65 0.18 290)", borderTopColor: "transparent" }} />
        </div>
      ) : error ? (
        <p className="text-sm rounded-xl px-4 py-3" style={{ color: "oklch(0.75 0.18 15)", background: "oklch(0.16 0.040 15)" }}>{error}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border-dashed border p-12 text-center" style={{ borderColor: "oklch(0.28 0.038 290 / 0.50)" }}>
          <p className="text-sm" style={{ color: "oklch(0.44 0.015 290)" }}>{t("noEntries")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {entries.map((e: DiaryListItem) => (
            <DiaryCard key={e.id} entry={e} t={t} inventory={inventory}
              onClick={() => router.push(`/diary/${e.id}`)}
              onVoucher={(type, id) => setVoucherModal({ type, id })} />
          ))}
        </div>
      )}

      {/* Coin toast */}
      {coinToast > 0 && <CoinToast amount={coinToast} onDone={() => setCoinToast(0)} />}

      {/* Voucher modal */}
      {voucherModal && (
        <VoucherModal
          type={voucherModal.type}
          entryId={voucherModal.id}
          onClose={() => setVoucherModal(null)}
          onSuccess={handleVoucherSuccess}
        />
      )}
    </div>
  );
}
