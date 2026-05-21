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
    <div className="rounded-2xl p-4 space-y-3 transition-all"
      style={{ background: "oklch(0.14 0.030 290)", border: "1px solid oklch(0.26 0.038 290 / 0.50)" }}>
      <div className="cursor-pointer" onClick={onExpand}>
        <p className="text-sm line-clamp-2" style={{ color: "oklch(0.75 0.012 290)" }}>{bottle.content}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: "oklch(0.44 0.015 290)" }}>
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
          className="w-full rounded-xl py-1.5 text-xs font-medium transition-colors"
          style={{ background: "oklch(0.20 0.045 15 / 0.50)", color: "oklch(0.72 0.18 15)", border: "1px solid oklch(0.38 0.12 15 / 0.35)" }}>
          🔄 倒带召回 <span className="opacity-70">({rewindQty}张)</span>
        </button>
      )}
      {!bottle.is_picked && rewindQty === 0 && (
        <p className="text-xs text-center" style={{ color: "oklch(0.40 0.012 290)" }}>
          无倒带券，去<a href="/shop" className="underline" style={{ color: "oklch(0.62 0.18 290)" }}>商城</a>购买
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
      <div className="relative w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: "oklch(0.13 0.030 290)", border: "1px solid oklch(0.28 0.045 290 / 0.60)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: "oklch(0.85 0.015 290)" }}>{t("bottleDetail")}</h3>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: "oklch(0.50 0.015 290)" }}>×</button>
        </div>
        <div className="rounded-xl p-4" style={{ background: "oklch(0.18 0.045 220 / 0.40)", border: "1px solid oklch(0.35 0.10 220 / 0.40)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "oklch(0.78 0.012 290)" }}>{bottle.content}</p>
          <p className="text-xs mt-2" style={{ color: "oklch(0.44 0.015 290)" }}>{new Date(bottle.created_at).toLocaleString()}</p>
        </div>
        {bottle.replies && bottle.replies.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.50 0.015 290)" }}>{t("replies")}</p>
            {bottle.replies.map((r) => (
              <div key={r.id} className="rounded-lg p-3" style={{ background: "oklch(0.17 0.032 290)", border: "1px solid oklch(0.26 0.038 290 / 0.45)" }}>
                <p className="text-sm" style={{ color: "oklch(0.72 0.012 290)" }}>{r.content}</p>
                <p className="text-xs mt-1" style={{ color: "oklch(0.42 0.015 290)" }}>{new Date(r.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
            placeholder={t("replyPlaceholder")} rows={3}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
            style={{ background: "oklch(0.18 0.038 290)", border: "1px solid oklch(0.30 0.045 290 / 0.55)", color: "oklch(0.82 0.012 290)" }} />
          <button onClick={submitReply} disabled={sending || !replyText.trim()}
            className="w-full py-2 text-sm rounded-xl disabled:opacity-50 font-medium"
            style={{ background: "linear-gradient(135deg, oklch(0.68 0.24 290), oklch(0.65 0.24 330))", color: "white" }}>
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
      <div className="relative rounded-2xl p-6 max-w-sm w-full space-y-4"
        style={{ background: "oklch(0.13 0.030 290)", border: "1px solid oklch(0.28 0.045 290 / 0.60)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center space-y-2">
          <span className="text-4xl">🔄</span>
          <h3 className="text-base font-bold" style={{ color: "oklch(0.85 0.015 290)" }}>{tc("rewind")}</h3>
          <p className="text-xs leading-relaxed" style={{ color: "oklch(0.55 0.015 290)" }}>{tc("rewindWarning")}</p>
          <p className="text-xs font-semibold rounded-xl px-3 py-1.5 inline-block"
            style={{ background: "oklch(0.20 0.045 15 / 0.50)", color: "oklch(0.72 0.18 15)" }}>
            消耗 1 张 🔄（背包库存）
          </p>
        </div>
        {error && <p className="text-xs text-center" style={{ color: "oklch(0.72 0.18 15)" }}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl py-2 text-sm font-medium"
            style={{ background: "oklch(0.20 0.035 290)", color: "oklch(0.60 0.015 290)" }}>
            {tc("cancel")}
          </button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 15), oklch(0.60 0.22 30))", color: "white" }}>
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
      <h1 className="text-2xl font-bold" style={{ color: "oklch(0.88 0.015 290)" }}>{t("title")}</h1>

      {/* Throw a bottle */}
      <section className="rounded-2xl p-6 space-y-4"
        style={{ background: "oklch(0.13 0.030 290)", border: "1px solid oklch(0.26 0.038 290 / 0.50)" }}>
        <h2 className="font-semibold" style={{ color: "oklch(0.78 0.015 290)" }}>{t("throwTitle")}</h2>
        <textarea value={throwContent} onChange={(e) => setThrowContent(e.target.value)}
          placeholder={t("throwPlaceholder")} rows={5}
          className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
          style={{ background: "oklch(0.18 0.038 290)", border: "1px solid oklch(0.30 0.045 290 / 0.55)", color: "oklch(0.82 0.012 290)" }} />
        <button onClick={handleThrow} disabled={throwing || !throwContent.trim()}
          className="px-5 py-2 text-sm rounded-xl font-semibold disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, oklch(0.68 0.24 290), oklch(0.65 0.24 330))", color: "white" }}>
          {throwing ? t("throwing") : t("throw")}
        </button>
      </section>

      {/* Pick a bottle */}
      <section className="rounded-2xl p-6 space-y-4"
        style={{ background: "oklch(0.13 0.030 290)", border: "1px solid oklch(0.26 0.038 290 / 0.50)" }}>
        <h2 className="font-semibold" style={{ color: "oklch(0.78 0.015 290)" }}>{t("pickTitle")}</h2>
        <p className="text-sm" style={{ color: "oklch(0.50 0.015 290)" }}>{t("pickDesc")}</p>
        {pickError && (
          <p className="text-sm rounded-xl px-3 py-2" style={{ color: "oklch(0.72 0.18 70)", background: "oklch(0.18 0.045 70 / 0.50)" }}>{pickError}</p>
        )}
        {!pickedBottle ? (
          <button onClick={handlePick} disabled={picking}
            className="px-5 py-2 text-sm rounded-xl font-medium disabled:opacity-50 transition-colors"
            style={{ background: "oklch(0.20 0.050 220 / 0.60)", color: "oklch(0.72 0.18 220)", border: "1px solid oklch(0.38 0.12 220 / 0.45)" }}>
            {picking ? t("picking") : t("pick")}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl p-4" style={{ background: "oklch(0.18 0.045 220 / 0.40)", border: "1px solid oklch(0.35 0.10 220 / 0.40)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "oklch(0.78 0.012 290)" }}>{pickedBottle.content}</p>
              <p className="text-xs mt-2" style={{ color: "oklch(0.44 0.015 290)" }}>{new Date(pickedBottle.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setExpandedBottle(pickedBottle)}
                className="px-3 py-1.5 text-sm rounded-xl transition-colors"
                style={{ background: "oklch(0.18 0.038 290)", color: "oklch(0.65 0.015 290)", border: "1px solid oklch(0.28 0.040 290 / 0.50)" }}>
                {t("replyBtn")}
              </button>
              <button onClick={() => { setPickedBottle(null); setPickError(""); }}
                className="px-3 py-1.5 text-sm rounded-xl transition-colors"
                style={{ background: "oklch(0.18 0.038 290)", color: "oklch(0.58 0.015 290)", border: "1px solid oklch(0.26 0.038 290 / 0.45)" }}>
                {t("pickAnother")}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* My bottles */}
      <section className="space-y-4">
        <h2 className="font-semibold" style={{ color: "oklch(0.78 0.015 290)" }}>{t("myBottles")}</h2>
        {loadingMine ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "oklch(0.65 0.18 290)", borderTopColor: "transparent" }} />
          </div>
        ) : myBottles.length === 0 ? (
          <div className="rounded-2xl border-dashed border p-8 text-center" style={{ borderColor: "oklch(0.28 0.038 290 / 0.50)" }}>
            <p className="text-sm" style={{ color: "oklch(0.44 0.015 290)" }}>{t("noBottles")}</p>
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
