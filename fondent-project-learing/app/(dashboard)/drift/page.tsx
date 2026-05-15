"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { driftApi, type BottleItem, type BottleWithReplies } from "@/lib/api/drift";

function MyBottleCard({ bottle, t, onExpand }: { bottle: BottleItem; t: ReturnType<typeof useTranslations>; onExpand: () => void }) {
  return (
    <div
      onClick={onExpand}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-green-200 transition-all"
    >
      <p className="text-sm text-slate-700 line-clamp-2">{bottle.content}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-slate-400">{new Date(bottle.created_at).toLocaleDateString()}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${bottle.is_picked ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-green-50 text-green-600 border-green-200"}`}>
          {bottle.is_picked ? t("picked") : t("floating")}
        </span>
      </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">{t("bottleDetail")}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-slate-700 leading-relaxed">{bottle.content}</p>
          <p className="text-xs text-slate-400 mt-2">{new Date(bottle.created_at).toLocaleString()}</p>
        </div>

        {bottle.replies && bottle.replies.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("replies")}</p>
            {bottle.replies.map((r) => (
              <div key={r.id} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-sm text-slate-700">{r.content}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(r.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t("replyPlaceholder")}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
          />
          <button
            onClick={submitReply}
            disabled={sending || !replyText.trim()}
            className="w-full py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {sending ? "…" : t("sendReply")}
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>

      {/* Throw a bottle */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-800">{t("throwTitle")}</h2>
        <textarea
          value={throwContent}
          onChange={(e) => setThrowContent(e.target.value)}
          placeholder={t("throwPlaceholder")}
          rows={5}
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 resize-none"
        />
        <button
          onClick={handleThrow}
          disabled={throwing || !throwContent.trim()}
          className="px-5 py-2 bg-linear-to-r from-green-500 to-emerald-500 text-white text-sm rounded-lg shadow-sm shadow-green-200 hover:shadow-md hover:shadow-green-300 disabled:opacity-50 transition-all"
        >
          {throwing ? t("throwing") : t("throw")}
        </button>
      </section>

      {/* Pick a bottle */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-800">{t("pickTitle")}</h2>
        <p className="text-sm text-slate-500">{t("pickDesc")}</p>
        {pickError && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">{pickError}</p>
        )}
        {!pickedBottle ? (
          <button
            onClick={handlePick}
            disabled={picking}
            className="px-5 py-2 bg-blue-500 text-white text-sm rounded-lg shadow-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {picking ? t("picking") : t("pick")}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-slate-700 leading-relaxed">{pickedBottle.content}</p>
              <p className="text-xs text-slate-400 mt-2">{new Date(pickedBottle.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setExpandedBottle(pickedBottle)}
                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                {t("replyBtn")}
              </button>
              <button
                onClick={() => { setPickedBottle(null); setPickError(""); }}
                className="px-3 py-1.5 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {t("pickAnother")}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* My bottles */}
      <section className="space-y-4">
        <h2 className="font-semibold text-slate-800">{t("myBottles")}</h2>
        {loadingMine ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          </div>
        ) : myBottles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-slate-400 text-sm">{t("noBottles")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myBottles.map((b) => (
              <MyBottleCard
                key={b.id}
                bottle={b}
                t={t}
                onExpand={() => handleExpandBottle(b.id)}
              />
            ))}
          </div>
        )}
      </section>

      {expandedBottle && (
        <BottleDetailModal
          bottle={expandedBottle}
          t={t}
          onClose={() => setExpandedBottle(null)}
          onReply={handleReply}
        />
      )}
      {pickedBottle && expandedBottle?.id === pickedBottle.id && (
        <BottleDetailModal
          bottle={pickedBottle}
          t={t}
          onClose={() => setExpandedBottle(null)}
          onReply={handlePickedReply}
        />
      )}
    </div>
  );
}
