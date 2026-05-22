"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { driftApi, type BottleItem, type BottleWithReplies } from "@/lib/api/drift";
import { coinsApi, type VoucherInventoryItem } from "@/lib/api/coins";

function MyBottleCard({
  bottle, t, onExpand, onRewind, rewindQty,
}: {
  bottle: BottleItem;
  t: ReturnType<typeof useTranslations>;
  onExpand: () => void;
  onRewind: (id: string) => void;
  rewindQty: number;
}) {
  return (
    <div className="rounded-2xl p-4 space-y-3 transition-all bg-[oklch(0.14_0.030_290)] border border-[oklch(0.26_0.038_290/0.50)]">
      <div className="cursor-pointer" onClick={onExpand}>
        <p className="text-sm line-clamp-2 text-[oklch(0.75_0.012_290)]">{bottle.content}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-pu-very-dim">
            {new Date(bottle.created_at).toLocaleDateString()}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={bottle.is_picked
              ? { background: "oklch(0.20 0.050 220 / 0.50)", color: "oklch(0.72 0.18 220)" }
              : { background: "oklch(0.20 0.050 140 / 0.50)", color: "oklch(0.72 0.18 140)" }}>
            {bottle.is_picked ? t("picked") : t("floating")}
          </span>
        </div>
      </div>
      {!bottle.is_picked && rewindQty > 0 && (
        <button onClick={(e) => { e.stopPropagation(); onRewind(bottle.id); }}
          className="w-full rounded-xl py-1.5 text-xs font-medium transition-colors bg-[oklch(0.20_0.045_15/0.50)] text-err-soft border border-[oklch(0.38_0.12_15/0.35)]">
          🔄 倒带召回 <span className="opacity-70">({rewindQty}张)</span>
        </button>
      )}
      {!bottle.is_picked && rewindQty === 0 && (
        <p className="text-xs text-center text-pu-ghost">
          无倒带券，去<a href="/shop" className="underline text-pu-cursor">商城</a>购买
        </p>
      )}
    </div>
  );
}

function BottleDetailModal({ bottle, t, onClose, onReply }: {
  bottle: BottleWithReplies;
  t: ReturnType<typeof useTranslations>;
  onClose: () => void;
  onReply: (content: string) => Promise<void>;
}) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await onReply(replyText.trim());
      setReplyText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[oklch(0.06_0.028_290/0.75)] backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl p-6 space-y-5 bg-[oklch(0.13_0.030_290)] border border-[oklch(0.28_0.045_290/0.60)]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-pu-text-3">{t("bottleDetail")}</h3>
          <button onClick={onClose} className="text-xl leading-none text-pu-muted">×</button>
        </div>
        <div className="rounded-xl p-4 bg-[oklch(0.18_0.045_220/0.40)] border border-[oklch(0.35_0.10_220/0.40)]">
          <p className="text-sm leading-relaxed text-[oklch(0.78_0.012_290)]">{bottle.content}</p>
          <p className="text-xs mt-2 text-pu-very-dim">{new Date(bottle.created_at).toLocaleString()}</p>
        </div>
        {bottle.replies && bottle.replies.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-pu-muted">{t("replies")}</p>
            {bottle.replies.map((r) => (
              <div key={r.id} className="rounded-lg p-3 bg-[oklch(0.17_0.032_290)] border border-[oklch(0.26_0.038_290/0.45)]">
                <p className="text-sm text-[oklch(0.72_0.012_290)]">{r.content}</p>
                <p className="text-xs mt-1 text-[oklch(0.42_0.015_290)]">{new Date(r.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
            placeholder={t("replyPlaceholder")} rows={3}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none resize-none bg-[oklch(0.18_0.038_290)] border border-[oklch(0.30_0.045_290/0.55)] text-pu-text-2" />
          <button onClick={submitReply} disabled={sending || !replyText.trim()}
            className="w-full py-2 text-sm rounded-xl disabled:opacity-50 font-medium bg-gradient-cta text-white">
            {sending ? "…" : t("sendReply")}
          </button>
        </div>
      </div>
    </div>
  );
}

function RewindConfirmModal({ bottleId, onClose, onSuccess }: {
  bottleId: string; onClose: () => void; onSuccess: () => void;
}) {
  const tc = useTranslations("coins");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await coinsApi.useVoucher("REWIND", bottleId);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[oklch(0.06_0.028_290/0.75)] backdrop-blur-sm" />
      <div className="relative rounded-2xl p-6 max-w-sm w-full space-y-4 bg-[oklch(0.13_0.030_290)] border border-[oklch(0.28_0.045_290/0.60)]"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center space-y-2">
          <span className="text-4xl">🔄</span>
          <h3 className="text-base font-bold text-pu-text-3">{tc("rewind")}</h3>
          <p className="text-xs leading-relaxed text-pu-label">{tc("rewindWarning")}</p>
          <p className="text-xs font-semibold rounded-xl px-3 py-1.5 inline-block bg-[oklch(0.20_0.045_15/0.50)] text-err-soft">
            消耗 1 张 🔄（背包库存）
          </p>
        </div>
        {error && <p className="text-xs text-center text-err-soft">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl py-2 text-sm font-medium bg-[oklch(0.20_0.035_290)] text-pu-label">
            {tc("cancel")}
          </button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 rounded-xl py-2 text-sm font-semibold disabled:opacity-50 bg-[linear-gradient(135deg,oklch(0.65_0.22_15),oklch(0.60_0.22_30))] text-white">
            {loading ? "召回中…" : tc("confirmUse")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DriftPage() {
  const t = useTranslations("drift");
  const [throwContent, setThrowContent] = useState("");
  const [throwing, setThrowing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickedBottle, setPickedBottle] = useState<BottleWithReplies | null>(null);
  const [myBottles, setMyBottles] = useState<BottleItem[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [expandedBottle, setExpandedBottle] = useState<BottleWithReplies | null>(null);
  const [pickError, setPickError] = useState("");
  const [rewindId, setRewindId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<VoucherInventoryItem[]>([]);

  const refreshInventory = useCallback(() => {
    coinsApi.getMyVouchers().then(setInventory).catch(() => {});
  }, []);

  const rewindQty = inventory.find((i) => i.voucher_type === "REWIND")?.quantity ?? 0;

  const fetchMine = useCallback(async () => {
    setLoadingMine(true);
    try {
      const data = await driftApi.myBottles();
      setMyBottles(data);
    } finally {
      setLoadingMine(false);
    }
  }, []);

  useEffect(() => { void fetchMine(); }, [fetchMine]);
  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  const handleThrow = async () => {
    if (!throwContent.trim()) return;
    setThrowing(true);
    try {
      await driftApi.throw(throwContent.trim());
      setThrowContent("");
      toast.success(t("throwSuccess"));
      fetchMine();
    } finally {
      setThrowing(false);
    }
  };

  const handlePick = async () => {
    setPicking(true);
    setPickError("");
    try {
      const bottle = await driftApi.pick();
      setPickedBottle(bottle);
      toast.success(t("picked") + "!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setPickError(msg.includes("429") || msg.includes("limit") ? t("pickLimitReached") : t("noBottlesAvailable"));
    } finally {
      setPicking(false);
    }
  };

  const handleExpandBottle = async (id: string) => {
    try {
      const data = await driftApi.getBottle(id);
      setExpandedBottle(data);
    } catch { /* ignore */ }
  };

  const handleReply = async (content: string) => {
    if (!expandedBottle) return;
    await driftApi.reply(expandedBottle.id, content);
    const updated = await driftApi.getBottle(expandedBottle.id);
    setExpandedBottle(updated);
  };

  const handlePickedReply = async (content: string) => {
    if (!pickedBottle) return;
    await driftApi.reply(pickedBottle.id, content);
    const updated = await driftApi.getBottle(pickedBottle.id);
    setPickedBottle(updated);
  };

  const handleRewindSuccess = () => {
    toast.success("漂流瓶已成功召回 🔄");
    fetchMine();
    refreshInventory();
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-pu-text-2">{t("title")}</h1>

      {/* Throw a bottle */}
      <section className="rounded-2xl p-6 space-y-4 bg-[oklch(0.13_0.030_290)] border border-[oklch(0.26_0.038_290/0.50)]">
        <h2 className="font-semibold text-[oklch(0.78_0.015_290)]">{t("throwTitle")}</h2>
        <textarea value={throwContent} onChange={(e) => setThrowContent(e.target.value)}
          placeholder={t("throwPlaceholder")} rows={5}
          className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none bg-[oklch(0.18_0.038_290)] border border-[oklch(0.30_0.045_290/0.55)] text-pu-text-2" />
        <button onClick={handleThrow} disabled={throwing || !throwContent.trim()}
          className="px-5 py-2 text-sm rounded-xl font-semibold disabled:opacity-50 transition-all bg-gradient-cta text-white">
          {throwing ? t("throwing") : t("throw")}
        </button>
      </section>

      {/* Pick a bottle */}
      <section className="rounded-2xl p-6 space-y-4 bg-[oklch(0.13_0.030_290)] border border-[oklch(0.26_0.038_290/0.50)]">
        <h2 className="font-semibold text-[oklch(0.78_0.015_290)]">{t("pickTitle")}</h2>
        <p className="text-sm text-pu-muted">{t("pickDesc")}</p>
        {pickError && (
          <p className="text-sm rounded-xl px-3 py-2 text-[oklch(0.72_0.18_70)] bg-[oklch(0.18_0.045_70/0.50)]">{pickError}</p>
        )}
        {!pickedBottle ? (
          <button onClick={handlePick} disabled={picking}
            className="px-5 py-2 text-sm rounded-xl font-medium disabled:opacity-50 transition-colors bg-[oklch(0.20_0.050_220/0.60)] text-[oklch(0.72_0.18_220)] border border-[oklch(0.38_0.12_220/0.45)]">
            {picking ? t("picking") : t("pick")}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl p-4 bg-[oklch(0.18_0.045_220/0.40)] border border-[oklch(0.35_0.10_220/0.40)]">
              <p className="text-sm leading-relaxed text-[oklch(0.78_0.012_290)]">{pickedBottle.content}</p>
              <p className="text-xs mt-2 text-pu-very-dim">{new Date(pickedBottle.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setExpandedBottle(pickedBottle)}
                className="px-3 py-1.5 text-sm rounded-xl transition-colors bg-[oklch(0.18_0.038_290)] text-pu-label border border-[oklch(0.28_0.040_290/0.50)]">
                {t("replyBtn")}
              </button>
              <button onClick={() => { setPickedBottle(null); setPickError(""); }}
                className="px-3 py-1.5 text-sm rounded-xl transition-colors bg-[oklch(0.18_0.038_290)] text-pu-muted border border-[oklch(0.26_0.038_290/0.45)]">
                {t("pickAnother")}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* My bottles */}
      <section className="space-y-4">
        <h2 className="font-semibold text-[oklch(0.78_0.015_290)]">{t("myBottles")}</h2>
        {loadingMine ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent border-pu-cursor" />
          </div>
        ) : myBottles.length === 0 ? (
          <div className="rounded-2xl border-dashed border p-8 text-center border-[oklch(0.28_0.038_290/0.50)]">
            <p className="text-sm text-pu-very-dim">{t("noBottles")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myBottles.map((b: BottleItem) => (
              <MyBottleCard key={b.id} bottle={b} t={t} rewindQty={rewindQty}
                onExpand={() => handleExpandBottle(b.id)}
                onRewind={(id) => setRewindId(id)} />
            ))}
          </div>
        )}
      </section>

      {expandedBottle && (
        <BottleDetailModal bottle={expandedBottle} t={t}
          onClose={() => setExpandedBottle(null)} onReply={handleReply} />
      )}
      {pickedBottle && expandedBottle?.id === pickedBottle.id && (
        <BottleDetailModal bottle={pickedBottle} t={t}
          onClose={() => setExpandedBottle(null)} onReply={handlePickedReply} />
      )}
      {rewindId && (
        <RewindConfirmModal bottleId={rewindId}
          onClose={() => setRewindId(null)}
          onSuccess={handleRewindSuccess} />
      )}
    </div>
  );
}
