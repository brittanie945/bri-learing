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
}: {
  session: ChatSessionDetail;
  onDeleteSession: () => void;
  canvasDiaryId: string | null;
  onCanvasToggle: (diaryId: string) => void;
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
        .map(
          (m) =>
            ({
              id: String(m.id),
              role: m.role as "user" | "assistant",
              parts: [
                {
                  type: "text",
                  text: m.content,
                  state: "done",
                },
              ],
            }) as SimpleMessage,
        ),
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
    messages: initialMessages,
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
    <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-[oklch(0.13_0.028_290)]">
      {/* 标题栏 */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-[oklch(0.22_0.034_290/0.45)]">
        <Sparkles className="h-4 w-4 shrink-0 text-pu-sparkle" />
        <span className="text-sm font-semibold truncate flex-1 text-pu-text-2">
          {session.title}
        </span>
        <button
          onClick={onDeleteSession}
          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg transition-colors hover:bg-[oklch(0.20_0.040_290)] text-pu-very-dim"
          title={t("confirmDelete")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {session.messages.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-sm text-pu-ghost">{t("firstMessage")}</p>
          </div>
        )}

        {messages
          .filter(
            (m) =>
              m.role === "user" ||
              m.role === "assistant",
          )
          .map((msg, i) => {
            const isLast = i === messages.length - 1;
            const msgIsStreaming =
              isLast &&
              status === "streaming" &&
              msg.role === "assistant";
            return (
              <MessageBubble
                key={msg.id}
                msg={msg as SimpleMessage}
                refs={session.diary_refs as Record<string, DiaryRef> | null}
                isStreaming={msgIsStreaming}
              />
            );
          })}

        {/* 日记保存卡片 */}
        {allSavedDiaries.map((info) => (
          <DiarySavedCard
            key={info.diary_id || info.title}
            title={info.title}
            isActive={canvasDiaryId === info.diary_id}
            onClick={() => onCanvasToggle(info.diary_id)}
          />
        ))}

        {/* 错误显示 */}
        {error && (
          <div className="text-center py-2">
            <p className="text-xs text-red-400">{error.message}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 输入区域 */}
      <div className="shrink-0 p-4 border-t border-[oklch(0.22_0.034_290/0.45)]">
        <div className="flex items-end gap-3 rounded-2xl px-4 py-3 bg-pu-surface-hi border border-pu-border-md">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("inputPlaceholder")}
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none min-h-6 max-h-32 text-pu-text-2"
          />
          {isLoading ? (
            <button
              onClick={handleStop}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl transition-all bg-[oklch(0.45_0.18_15)] hover:bg-[oklch(0.52_0.20_15)] text-white"
              title={t("stopGeneration")}
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl transition-all disabled:opacity-40 bg-gradient-chat-cta text-white"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-center text-xs text-pu-ghost">
          {t("sendHint")}
        </p>
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

  return (
    <div className="flex h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-[oklch(0.26_0.040_290/0.45)]">
      {/* ── 聊天主区域 ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-[oklch(0.13_0.028_290)]">
        {!activeSession && !loadingSession && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-chat-empty shadow-chat-empty">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2 text-pu-text">{t("title")}</h2>
              <p className="text-sm max-w-xs text-pu-muted">
                {t("emptyDesc")}
              </p>
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
          <ChatArea
            key={activeSession.id}
            session={activeSession}
            onDeleteSession={handleDeleteActiveSession}
            canvasDiaryId={canvasDiaryId}
            onCanvasToggle={handleCanvasToggle}
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
