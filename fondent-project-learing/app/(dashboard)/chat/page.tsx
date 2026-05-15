"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Plus, Trash2, Clock, ChevronDown, ChevronRight, Sparkles, Send, Bot, User } from "lucide-react";
import { chatApi, type ChatSession, type ChatSessionDetail, type ChatMessage, type DiaryRef } from "@/lib/api/chat";
import { cn } from "@/lib/utils";

// ────── 时间预设 ──────
const TIME_PRESETS = [
  { key: "all", labelKey: "allTime", icon: "🌌" },
  { key: "3m",  labelKey: "recent3m", icon: "🌱" },
  { key: "6m",  labelKey: "halfYear",  icon: "🍂" },
  { key: "1y",  labelKey: "oneYearAgo", icon: "📅" },
  { key: "2y",  labelKey: "twoYearsAgo", icon: "⏳" },
] as const;

type TimePreset = (typeof TIME_PRESETS)[number]["key"];

// ────── 解析 AI 回复，将 [REF:N] 转换为锚点数据 ──────
interface TextSegment {
  type: "text";
  content: string;
}
interface RefSegment {
  type: "ref";
  num: number;
}
type Segment = TextSegment | RefSegment;

function parseContent(content: string): Segment[] {
  const parts = content.split(/(\[REF:\d+\])/g);
  return parts.map((p) => {
    const m = p.match(/^\[REF:(\d+)\]$/);
    if (m) return { type: "ref", num: parseInt(m[1]) };
    return { type: "text", content: p };
  });
}

// ────── 记忆锚点卡片 ──────
function MemoryAnchorCard({ refNum, refs }: { refNum: number; refs: Record<string, DiaryRef> | null }) {
  const [open, setOpen] = useState(false);
  const ref = refs?.[String(refNum)];
  if (!ref) return <span className="text-xs opacity-50">[REF:{refNum}]</span>;

  return (
    <span className="inline-block align-middle mx-0.5">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md transition-all"
        style={{
          background: "oklch(0.22 0.070 290 / 0.7)",
          color: "oklch(0.82 0.22 290)",
          border: "1px solid oklch(0.40 0.10 290 / 0.4)",
        }}
      >
        <Clock className="h-2.5 w-2.5" />
        {ref.date}
        {open ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
      </button>
      {open && (
        <span
          className="block mt-1 rounded-xl p-3 text-xs leading-relaxed"
          style={{
            background: "oklch(0.15 0.040 290)",
            border: "1px solid oklch(0.32 0.060 290 / 0.50)",
          }}
        >
          <span className="block font-semibold mb-1" style={{ color: "oklch(0.82 0.22 290)" }}>
            《{ref.title}》— {ref.date}
          </span>
          {ref.mood && (
            <span className="block text-xs mb-1" style={{ color: "oklch(0.60 0.015 290)" }}>
              心情：{ref.mood}
            </span>
          )}
          <span className="block" style={{ color: "oklch(0.72 0.012 290)" }}>
            {ref.summary}
            {ref.summary.length >= 300 && "…"}
          </span>
        </span>
      )}
    </span>
  );
}

// ────── 单条消息气泡 ──────
function MessageBubble({ msg, refs }: { msg: ChatMessage; refs: Record<string, DiaryRef> | null }) {
  const isUser = msg.role === "user";
  const segments = parseContent(msg.content);

  return (
    <div className={cn("flex gap-2.5 mb-4", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* 头像 */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
        style={
          isUser
            ? { background: "oklch(0.22 0.070 290)", color: "oklch(0.85 0.22 290)" }
            : { background: "linear-gradient(135deg, oklch(0.45 0.20 290), oklch(0.42 0.20 330))", color: "white" }
        }
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* 气泡 */}
      <div
        className={cn("max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed", isUser ? "rounded-tr-sm" : "rounded-tl-sm")}
        style={
          isUser
            ? {
                background: "linear-gradient(135deg, oklch(0.42 0.20 290), oklch(0.40 0.20 330))",
                color: "oklch(0.97 0.005 290)",
              }
            : {
                background: "oklch(0.17 0.035 290)",
                border: "1px solid oklch(0.28 0.045 290 / 0.50)",
                color: "oklch(0.88 0.012 290)",
              }
        }
      >
        {isUser ? (
          <span>{msg.content}</span>
        ) : (
          <span>
            {segments.map((seg, i) =>
              seg.type === "text" ? (
                <span key={i} style={{ whiteSpace: "pre-wrap" }}>{seg.content}</span>
              ) : (
                <MemoryAnchorCard key={i} refNum={seg.num} refs={refs} />
              )
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ────── 流式占位气泡 ──────
function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-2.5 mb-4">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: "linear-gradient(135deg, oklch(0.45 0.20 290), oklch(0.42 0.20 330))", color: "white" }}
      >
        <Bot className="h-4 w-4" />
      </div>
      <div
        className="max-w-[72%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
        style={{
          background: "oklch(0.17 0.035 290)",
          border: "1px solid oklch(0.28 0.045 290 / 0.50)",
          color: "oklch(0.88 0.012 290)",
        }}
      >
        {content || (
          <span className="flex gap-1 items-center" style={{ color: "oklch(0.55 0.015 290)" }}>
            <span className="animate-pulse">●</span>
            <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
            <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
          </span>
        )}
        {content && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse align-middle" style={{ background: "oklch(0.65 0.18 290)" }} />}
      </div>
    </div>
  );
}

// ────── 时间选择模态框 ──────
function TimeSelectModal({
  onSelect,
  onClose,
  t,
}: {
  onSelect: (preset: TimePreset) => void;
  onClose: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "oklch(0.06 0.028 290 / 0.75)", backdropFilter: "blur(8px)" }} />
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{
          background: "oklch(0.14 0.032 290)",
          border: "1px solid oklch(0.30 0.055 290 / 0.55)",
          boxShadow: "0 24px 60px oklch(0.05 0.030 290 / 0.80)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 图标 + 标题 */}
        <div className="text-center mb-6">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-3"
            style={{ background: "linear-gradient(135deg, oklch(0.52 0.24 290), oklch(0.48 0.24 330))", boxShadow: "0 0 28px oklch(0.40 0.28 300 / 0.45)" }}
          >
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-bold" style={{ color: "oklch(0.93 0.010 290)" }}>
            {t("selectTime")}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "oklch(0.52 0.015 290)" }}>
            {t("selectTimeDesc")}
          </p>
        </div>

        {/* 预设选项 */}
        <div className="grid grid-cols-1 gap-2.5">
          {TIME_PRESETS.map(({ key, labelKey, icon }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-150 hover:scale-[1.01]"
              style={{
                background: "oklch(0.18 0.040 290)",
                border: "1px solid oklch(0.32 0.055 290 / 0.45)",
                color: "oklch(0.85 0.015 290)",
              }}
            >
              <span className="text-xl">{icon}</span>
              <span className="font-medium text-sm">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────── 主页面 ──────
export default function ChatPage() {
  const t = useTranslations("chat");

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSessionDetail | null>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    try {
      const list = await chatApi.listSessions();
      setSessions(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // 自动滚底
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, streamingContent]);

  // 选择时间预设 → 创建会话
  const handleTimeSelect = async (preset: TimePreset) => {
    setShowTimeModal(false);
    setCreating(true);
    try {
      const session = await chatApi.createSession({ time_preset: preset });
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
    } catch (e) {
      alert(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  // 切换会话
  const handleSelectSession = async (id: string) => {
    if (activeSession?.id === id) return;
    setLoadingSession(true);
    try {
      const detail = await chatApi.getSession(id);
      setActiveSession(detail);
    } finally {
      setLoadingSession(false);
    }
  };

  // 删除会话
  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t("confirmDelete"))) return;
    await chatApi.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSession?.id === id) setActiveSession(null);
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || !activeSession || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setStreamingContent("");

    // 乐观 UI：先把用户消息加进去
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
      (chunk) => {
        fullContent += chunk;
        setStreamingContent(fullContent);
      },
      (ids) => { finalRefIds = ids; },
      () => {
        // 流结束 → 将 streaming 气泡转为真实消息
        const assistantMsg: ChatMessage = {
          id: `done-${Date.now()}`,
          session_id: activeSession.id,
          role: "assistant",
          content: fullContent,
          ref_ids: finalRefIds.length > 0 ? finalRefIds : null,
          created_at: new Date().toISOString(),
        };
        setActiveSession((prev) =>
          prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : prev
        );
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
    <div className="flex h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)] gap-0 overflow-hidden rounded-2xl"
      style={{ border: "1px solid oklch(0.26 0.040 290 / 0.45)" }}>

      {/* ── 会话列表侧栏 ── */}
      <div
        className="hidden md:flex w-52 shrink-0 flex-col"
        style={{
          background: "oklch(0.11 0.026 292)",
          borderRight: "1px solid oklch(0.24 0.038 290 / 0.40)",
        }}
      >
        {/* 侧栏头部 */}
        <div className="p-3 border-b" style={{ borderColor: "oklch(0.24 0.038 290 / 0.40)" }}>
          <button
            onClick={() => setShowTimeModal(true)}
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition-all"
            style={{
              background: "linear-gradient(135deg, oklch(0.42 0.20 290), oklch(0.40 0.20 330))",
              color: "white",
              opacity: creating ? 0.6 : 1,
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {creating ? t("creating") : t("newSession")}
          </button>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 && (
            <p className="text-center text-xs py-8 px-3" style={{ color: "oklch(0.40 0.012 290)" }}>
              {t("noSessions")}
            </p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectSession(s.id)}
              className="group relative w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors"
              style={{
                background: activeSession?.id === s.id ? "oklch(0.18 0.045 290)" : "transparent",
                color: activeSession?.id === s.id ? "oklch(0.85 0.015 290)" : "oklch(0.55 0.012 290)",
              }}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="flex-1 text-xs leading-snug line-clamp-2">{s.title}</span>
              <button
                onClick={(e) => handleDeleteSession(e, s.id)}
                className="shrink-0 hidden group-hover:block rounded p-0.5 transition-colors"
                style={{ color: "oklch(0.50 0.012 290)" }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* ── 聊天主区域 ── */}
      <div className="flex flex-1 flex-col min-w-0" style={{ background: "oklch(0.13 0.028 290)" }}>
        {/* 无会话时的空状态 */}
        {!activeSession && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-3xl"
              style={{ background: "linear-gradient(135deg, oklch(0.45 0.22 290), oklch(0.42 0.22 330))", boxShadow: "0 0 40px oklch(0.35 0.28 300 / 0.40)" }}
            >
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2" style={{ color: "oklch(0.90 0.010 290)" }}>
                {t("title")}
              </h2>
              <p className="text-sm max-w-xs" style={{ color: "oklch(0.50 0.015 290)" }}>
                {t("emptyDesc")}
              </p>
            </div>
            <button
              onClick={() => setShowTimeModal(true)}
              disabled={creating}
              className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-sm transition-all"
              style={{
                background: "linear-gradient(135deg, oklch(0.60 0.24 290), oklch(0.57 0.24 330))",
                color: "white",
                boxShadow: "0 4px 20px oklch(0.35 0.28 300 / 0.45)",
              }}
            >
              <Plus className="h-4 w-4" />
              {t("startNewSession")}
            </button>
          </div>
        )}

        {activeSession && (
          <>
            {/* 顶部：会话标题 */}
            <div
              className="shrink-0 flex items-center gap-3 px-5 py-3 border-b"
              style={{ borderColor: "oklch(0.22 0.034 290 / 0.45)" }}
            >
              <Sparkles className="h-4 w-4 shrink-0" style={{ color: "oklch(0.75 0.22 290)" }} />
              <span className="text-sm font-semibold truncate" style={{ color: "oklch(0.88 0.012 290)" }}>
                {activeSession.title}
              </span>
              {/* 移动端新对话按钮 */}
              <button
                onClick={() => setShowTimeModal(true)}
                className="md:hidden ml-auto flex items-center gap-1 text-xs rounded-lg px-2 py-1"
                style={{ background: "oklch(0.20 0.050 290)", color: "oklch(0.75 0.18 290)" }}
              >
                <Plus className="h-3 w-3" />
                {t("newSession")}
              </button>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto px-4 py-5">
              {loadingSession && (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "oklch(0.55 0.20 290)", borderTopColor: "transparent" }} />
                </div>
              )}

              {activeSession.messages.length === 0 && !loadingSession && (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: "oklch(0.45 0.012 290)" }}>
                    {t("firstMessage")}
                  </p>
                </div>
              )}

              {activeSession.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  refs={activeSession.diary_refs}
                />
              ))}

              {streamingContent !== null && (
                <StreamingBubble content={streamingContent} />
              )}

              <div ref={bottomRef} />
            </div>

            {/* 输入区域 */}
            <div
              className="shrink-0 p-4 border-t"
              style={{ borderColor: "oklch(0.22 0.034 290 / 0.45)" }}
            >
              <div
                className="flex items-end gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: "oklch(0.17 0.038 290)",
                  border: "1px solid oklch(0.30 0.055 290 / 0.50)",
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("inputPlaceholder")}
                  disabled={sending}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm outline-none min-h-6 max-h-32"
                  style={{ color: "oklch(0.88 0.012 290)" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl transition-all disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.60 0.24 290), oklch(0.57 0.24 330))",
                    color: "white",
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-xs" style={{ color: "oklch(0.38 0.010 290)" }}>
                {t("sendHint")}
              </p>
            </div>
          </>
        )}
      </div>

      {/* 时间选择模态框 */}
      {showTimeModal && (
        <TimeSelectModal
          onSelect={handleTimeSelect}
          onClose={() => setShowTimeModal(false)}
          t={t}
        />
      )}
    </div>
  );
}
