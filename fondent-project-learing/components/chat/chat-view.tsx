"use client";

import { useState, useEffect, useRef, startTransition, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Plus, Trash2, Sparkles, Send, Square } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { DiarySavedCard } from "./diary-saved-card";
import { DiaryCanvas } from "./diary-canvas";
import { chatApi, type ChatSessionDetail, type DiaryRef } from "@/lib/api/chat";
import { MessageBubble, type SimpleMessage } from "./message-bubble";
import { TimeSelectModal, type TimePreset } from "./time-select-modal";
import { getToken } from "@/lib/auth-client";

// ── Chat 核心区域（按 session key 挂载，切换 session 时自动重建） ──

function ChatArea({
  session,
  onDeleteSession,
  canvasDiaryId,
  onCanvasToggle,
  onStartNewSession,
  creating,
}: {
  session: ChatSessionDetail;
  onDeleteSession: () => void;
  canvasDiaryId: string | null;
  onCanvasToggle: (diaryId: string) => void;
  onStartNewSession: () => void;
  creating: boolean;
}) {
  const t = useTranslations("chat");
  const [input, setInput] = useState("");
  const [savedDiaries, setSavedDiaries] = useState<
    { diary_id: string; title: string }[]
  >([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 从历史消息中恢复日记卡片
  const restoredDiaries = useMemo(
    () =>
      session.messages
        .filter((m) => m.role === "diary_saved")
        .map((m) => {
          try {
            return JSON.parse(m.content) as { diary_id: string; title: string };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as { diary_id: string; title: string }[],
    [session.id],
  );

  // 将后端消息转换为 AI SDK UIMessage 格式
  const initialMessages = useMemo(
    () =>
      session.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: String(m.id),
          role: m.role as "user" | "assistant",
          content: m.content,
          parts: [
            {
              type: "text",
              text: m.content,
              state: "done",
            },
          ],
        })) as SimpleMessage[],
    [session.id],
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/chat/${session.id}`,
      headers: () => ({
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      }),
    }),
    messages: initialMessages as any,
    onFinish: ({ messages: updatedMessages }) => {
      // 检查 write_diary 工具调用
      for (const msg of updatedMessages) {
        if (msg.role === "assistant" && Array.isArray(msg.parts)) {
          for (const part of msg.parts) {
            if (
              (part as Record<string, unknown>).type === "tool-output-available" &&
              (part as Record<string, unknown>).toolName === "write_diary" &&
              (part as Record<string, unknown>).output
            ) {
              const output = (part as Record<string, unknown>).output as {
                diary_id: string;
                title: string;
              };
              setSavedDiaries((prev) => {
                if (prev.some((d) => d.title === output.title)) return prev;
                return [...prev, output];
              });
            }
          }
        }
      }
    },
    onError: (err) => {
      console.error("Chat stream error:", err);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // 初始化日记卡片（合并 restored + savedDiaries）
  const allSavedDiaries = useMemo(() => {
    const merged = [...restoredDiaries];
    for (const d of savedDiaries) {
      if (!merged.some((m) => m.title === d.title)) {
        merged.push(d);
      }
    }
    return merged;
  }, [restoredDiaries, savedDiaries]);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 发送消息
  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  }, [input, isLoading, sendMessage]);

  // 停止生成
  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.08),_transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.94))] shadow-[0_28px_90px_rgba(2,6,23,0.46)]">
      <div className="shrink-0 border-b border-white/8 bg-white/4 px-5 py-4 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1.1rem] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(59,130,246,0.12))] text-cyan-100 shadow-[0_10px_28px_rgba(15,23,42,0.18)]">
            <Sparkles className="h-4.5 w-4.5 shrink-0" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-white">
              {session.title}
            </p>
            <p className="text-xs text-slate-400">{t("title")}</p>
          </div>
          <button
            onClick={onDeleteSession}
            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 text-slate-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white active:scale-[0.98]"
            title={t("confirmDelete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        {session.messages.length === 0 && !isLoading && (
          <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-cyan-400/10 text-cyan-200 ring-1 ring-inset ring-cyan-300/10">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
              {t("emptyDesc")}
            </p>
            <button
              onClick={onStartNewSession}
              disabled={creating}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.22)] transition-all hover:bg-cyan-300 active:scale-[0.98] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {t("startNewSession")}
            </button>
          </div>
        )}

        {messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((msg, i, filteredMessages) => {
            const isLast = i === filteredMessages.length - 1;
            const msgIsThinking =
              isLast && status === "submitted" && msg.role === "assistant";
            return (
              <MessageBubble
                key={msg.id}
                msg={msg as SimpleMessage}
                refs={session.diary_refs as Record<string, DiaryRef> | null}
                isThinking={msgIsThinking}
              />
            );
          })}

        {allSavedDiaries.map((info) => (
          <DiarySavedCard
            key={info.diary_id || info.title}
            title={info.title}
            isActive={canvasDiaryId === info.diary_id}
            onClick={() => onCanvasToggle(info.diary_id)}
          />
        ))}

        {error && (
          <div className="py-2 text-center">
            <p className="text-xs text-rose-300">{error.message}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.68),rgba(2,6,23,0.94))] p-4 backdrop-blur-xl md:p-5">
        <div className="flex items-end gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.045] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("inputPlaceholder")}
            disabled={isLoading}
            rows={1}
            className="min-h-6 max-h-32 flex-1 resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-slate-500"
          />
          {isLoading ? (
            <button
              onClick={handleStop}
              className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-rose-400/20 bg-rose-500 text-white shadow-[0_10px_24px_rgba(244,63,94,0.16)] transition-all hover:bg-rose-400 active:scale-[0.98]"
              title={t("stopGeneration")}
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-[1rem] bg-cyan-400 text-slate-950 shadow-[0_12px_28px_rgba(34,211,238,0.24)] transition-all hover:bg-cyan-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">{t("sendHint")}</p>
      </div>
    </div>
  );
}

// ── ChatView 外层（管理 session 生命周期） ──

export function ChatView() {
  const t = useTranslations("chat");
  const router = useRouter();
  const params = useParams();
  const sid = params.sid as string | undefined;

  const [activeSession, setActiveSession] = useState<ChatSessionDetail | null>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [creating, setCreating] = useState(false);
  const [canvasDiaryId, setCanvasDiaryId] = useState<string | null>(null);

  const handleCanvasToggle = (diaryId: string) => {
    setCanvasDiaryId((prev) => (prev === diaryId ? null : diaryId));
  };

  // URL sid 变化时加载对应会话
  useEffect(() => {
    if (!sid) {
      startTransition(() => setActiveSession(null));
      return;
    }
    startTransition(() => setLoadingSession(true));
    chatApi
      .getSession(sid)
      .then((session) => setActiveSession(session))
      .catch(() => setActiveSession(null))
      .finally(() => setLoadingSession(false));
  }, [sid]);

  // 监听侧边栏"新对话"事件
  useEffect(() => {
    const handler = () => setShowTimeModal(true);
    window.addEventListener("chat-new-session", handler);
    return () => window.removeEventListener("chat-new-session", handler);
  }, []);

  const handleTimeSelect = async (preset: TimePreset, query?: string, useSemantic?: boolean) => {
    setShowTimeModal(false);
    setCreating(true);
    try {
      const session = await chatApi.createSession({
        time_preset: useSemantic ? undefined : preset,
        query: useSemantic ? query : undefined,
        use_semantic: useSemantic,
      });
      window.dispatchEvent(new Event("chat-sessions-updated"));
      router.push(`/chat/${session.id}`);
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
      window.dispatchEvent(new Event("chat-sessions-updated"));
      router.push("/chat");
    } catch {
      /* ignore */
    }
  };

  const startNewSession = useCallback(() => setShowTimeModal(true), []);

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_28px_90px_rgba(2,6,23,0.42)] md:min-h-[calc(100dvh-4rem)]">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.08),_transparent_28%),linear-gradient(180deg,rgba(7,11,20,0.98),rgba(15,23,42,0.94))]">
        {!activeSession && !loadingSession && (
          <div className="flex min-h-[24rem] flex-col items-center justify-center gap-6 px-8 py-16 text-center md:min-h-[32rem]">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(59,130,246,0.10))] text-white shadow-[0_18px_40px_rgba(8,15,28,0.25)]">
              <Sparkles className="h-10 w-10" />
            </div>
            <div className="max-w-md">
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                {t("title")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">
                {t("emptyDesc")}
              </p>
            </div>
            <button
              onClick={startNewSession}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.22)] transition-all hover:bg-cyan-300 active:scale-[0.98] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {t("startNewSession")}
            </button>
          </div>
        )}

        {loadingSession && !activeSession && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
          </div>
        )}

        {activeSession && (
          <ChatArea
            key={activeSession.id}
            session={activeSession}
            onDeleteSession={handleDeleteActiveSession}
            canvasDiaryId={canvasDiaryId}
            onCanvasToggle={handleCanvasToggle}
            onStartNewSession={startNewSession}
            creating={creating}
          />
        )}
      </div>

      {/* ── Canvas 侧边面板 ── */}
      {canvasDiaryId && (
        <DiaryCanvas
          diaryId={canvasDiaryId}
          onClose={() => setCanvasDiaryId(null)}
        />
      )}

      <TimeSelectModal
        open={showTimeModal}
        onSelect={handleTimeSelect}
        onClose={() => setShowTimeModal(false)}
        t={t}
      />
    </div>
  );
}
