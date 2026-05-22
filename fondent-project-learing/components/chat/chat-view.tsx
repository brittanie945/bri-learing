"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Sparkles, Send } from "lucide-react";
import { chatApi, type ChatSessionDetail, type ChatMessage } from "@/lib/api/chat";
import { MessageBubble } from "./message-bubble";
import { StreamingBubble } from "./streaming-bubble";
import { TimeSelectModal, type TimePreset } from "./time-select-modal";

export function ChatView() {
  const t = useTranslations("chat");
  const router = useRouter();
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");
  const isNew = searchParams.get("new") === "1";

  const [activeSession, setActiveSession] = useState<ChatSessionDetail | null>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 根据 URL 中的 sid 加载对应会话
  useEffect(() => {
    if (!sid) { startTransition(() => setActiveSession(null)); return; }
    if (activeSession?.id === sid) return;
    startTransition(() => setLoadingSession(true));
    chatApi.getSession(sid)
      .then(setActiveSession)
      .catch(() => setActiveSession(null))
      .finally(() => setLoadingSession(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  // ?new=1 自动弹出新对话 Modal
  useEffect(() => {
    if (isNew) startTransition(() => setShowTimeModal(true));
  }, [isNew]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, streamingContent]);

  const handleTimeSelect = async (preset: TimePreset) => {
    setShowTimeModal(false);
    setCreating(true);
    try {
      const session = await chatApi.createSession({ time_preset: preset });
      setActiveSession(session);
      router.push(`/chat?sid=${session.id}`);
      window.dispatchEvent(new Event("chat-sessions-updated"));
    } catch (e) {
      alert(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteActiveSession = async () => {
    if (!activeSession || !confirm(t("confirmDelete"))) return;
    try {
      await chatApi.deleteSession(activeSession.id);
      setActiveSession(null);
      router.push("/chat");
      window.dispatchEvent(new Event("chat-sessions-updated"));
    } catch { /* ignore */ }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSession || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setStreamingContent("");

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: activeSession.id,
      role: "user",
      content,
      ref_ids: null,
      created_at: new Date().toISOString(),
    };
    setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev);

    let fullContent = "";
    let finalRefIds: number[] = [];

    await chatApi.streamMessage(
      activeSession.id,
      content,
      (chunk) => { fullContent += chunk; setStreamingContent(fullContent); },
      (ids) => { finalRefIds = ids; },
      () => {
        const assistantMsg: ChatMessage = {
          id: `done-${Date.now()}`,
          session_id: activeSession.id,
          role: "assistant",
          content: fullContent,
          ref_ids: finalRefIds.length > 0 ? finalRefIds : null,
          created_at: new Date().toISOString(),
        };
        setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : prev);
        setStreamingContent(null);
        setSending(false);
      },
      (errMsg) => {
        setStreamingContent(null);
        setSending(false);
        alert(errMsg || "发送失败");
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-[oklch(0.26_0.040_290/0.45)]"
    >
      {/* ── 聊天主区域 ── */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-[oklch(0.13_0.028_290)]">
        {!activeSession && !loadingSession && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-chat-empty shadow-chat-empty"
            >
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2 text-pu-text">{t("title")}</h2>
              <p className="text-sm max-w-xs text-pu-muted">{t("emptyDesc")}</p>
            </div>
            <button
              onClick={() => setShowTimeModal(true)}
              disabled={creating}
              className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-sm transition-all bg-gradient-chat-cta text-white shadow-chat-cta"
            >
              <Plus className="h-4 w-4" />
              {t("startNewSession")}
            </button>
          </div>
        )}

        {loadingSession && !activeSession && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent border-pu-cursor" />
          </div>
        )}

        {activeSession && (
          <>
            {/* 标题栏 */}
            <div
              className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-[oklch(0.22_0.034_290/0.45)]"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-pu-sparkle" />
              <span className="text-sm font-semibold truncate flex-1 text-pu-text-2">
                {activeSession.title}
              </span>
              <button
                onClick={handleDeleteActiveSession}
                className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg transition-colors hover:bg-[oklch(0.20_0.040_290)] text-pu-very-dim"
                title={t("confirmDelete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              {loadingSession && (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent border-pu-cursor" />
                </div>
              )}
              {activeSession.messages.length === 0 && !loadingSession && (
                <div className="text-center py-8">
                  <p className="text-sm text-pu-ghost">{t("firstMessage")}</p>
                </div>
              )}
              {activeSession.messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} refs={activeSession.diary_refs} />
              ))}
              {streamingContent !== null && <StreamingBubble content={streamingContent} />}
              <div ref={bottomRef} />
            </div>

            <div className="shrink-0 p-4 border-t border-[oklch(0.22_0.034_290/0.45)]">
              <div
                  className="flex items-end gap-3 rounded-2xl px-4 py-3 bg-pu-surface-hi border border-pu-border-md"
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("inputPlaceholder")}
                  disabled={sending}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm outline-none min-h-6 max-h-32 text-pu-text-2"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl transition-all disabled:opacity-40 bg-gradient-chat-cta text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-xs text-pu-ghost">
                {t("sendHint")}
              </p>
            </div>
          </>
        )}
      </div>

      {showTimeModal && (
        <TimeSelectModal
          onSelect={handleTimeSelect}
          onClose={() => {
            setShowTimeModal(false);
            if (isNew) router.replace("/chat");
          }}
          t={t}
        />
      )}
    </div>
  );
}
