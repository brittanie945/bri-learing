"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiaryRef } from "@/lib/api/chat";
import { MemoryAnchorCard } from "./memory-anchor-card";

function ThinkingIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-pu-cursor/70 animate-[pulse_1s_ease-in-out_infinite]" />
      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-pu-cursor/50 animate-[pulse_1s_ease-in-out_infinite_200ms]" />
      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-pu-cursor/30 animate-[pulse_1s_ease-in-out_infinite_400ms]" />
    </span>
  );
}

// ── AI SDK Message 兼容类型 ──
export interface SimpleMessage {
  id: string;
  role: "user" | "assistant";
  content?: string;
  parts?: Array<{ type: string; text?: string; state?: string }>;
}

// ── 内容解析 ──
interface TextSegment { type: "text"; content: string }
interface RefSegment  { type: "ref";  num: number }
type Segment = TextSegment | RefSegment;

function parseContent(content: string): Segment[] {
  const parts = content.split(/(\[REF:\d+\])/g);
  return parts.map((p) => {
    const m = p.match(/^\[REF:(\d+)\]$/);
    if (m) return { type: "ref", num: parseInt(m[1]) };
    return { type: "text", content: p };
  });
}

/**
 * 从 AI SDK UIMessage 中提取文本内容
 *
 * 支持旧格式（content 字符串）和新格式（parts 数组）
 */
function getMessageText(msg: SimpleMessage): string {
  // 旧格式兼容
  if (msg.content !== undefined) return msg.content;
  // AI SDK 新格式：从 parts 中提取文本
  if (msg.parts) {
    return msg.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join("");
  }
  return "";
}

interface MessageBubbleProps {
  msg: SimpleMessage;
  refs: Record<string, DiaryRef> | null;
  isThinking?: boolean;
}

export function MessageBubble({ msg, refs, isThinking }: MessageBubbleProps) {
  const isUser = msg.role === "user";
  const textContent = getMessageText(msg);
  const segments = parseContent(textContent);
  const showThinking = Boolean(isThinking && !textContent);

  return (
    <div
      className={cn(
        "group flex items-end gap-3 pb-5",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border text-sm shadow-sm ring-1 ring-inset",
          isUser
            ? "border-cyan-300/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(59,130,246,0.08))] text-cyan-50 shadow-black/10 ring-white/5"
            : "border-white/10 bg-[linear-gradient(135deg,rgba(120,119,198,0.18),rgba(56,189,248,0.12))] text-white shadow-black/20 ring-white/5"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "max-w-[min(72%,42rem)] rounded-[1.4rem] px-4 py-3.5 text-sm leading-relaxed shadow-lg ring-1 ring-inset backdrop-blur-sm md:max-w-[68%]",
          isUser ? "rounded-br-md" : "rounded-bl-md"
        )}
        style={
          isUser
            ? {
                background:
                  "linear-gradient(135deg, rgba(34,211,238,0.88), rgba(59,130,246,0.96))",
                color: "white",
                borderColor: "rgba(255,255,255,0.12)",
              }
            : {
                background:
                  "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.92))",
                color: "oklch(0.92 0.01 250)",
                borderColor: "rgba(255,255,255,0.08)",
              }
        }
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{textContent}</span>
        ) : (
          <span className="whitespace-pre-wrap">
            {segments.map((seg, i) =>
              seg.type === "text" ? (
                <span key={i}>{seg.content}</span>
              ) : (
                <MemoryAnchorCard key={i} refNum={seg.num} refs={refs} />
              )
            )}
            {showThinking ? (
              <span className="ml-2 inline-flex min-w-16 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 align-middle text-[11px] text-white/70">
                <ThinkingIndicator />
                <span className="whitespace-nowrap">思考中</span>
              </span>
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
}
