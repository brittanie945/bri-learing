"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiaryRef } from "@/lib/api/chat";
import { MemoryAnchorCard } from "./memory-anchor-card";

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

/**
 * 判断消息是否处于流式状态
 */
function isMessageStreaming(msg: SimpleMessage): boolean {
  if (msg.parts) {
    return msg.parts.some(
      (p) => p.type === "text" && p.state === "streaming",
    );
  }
  return false;
}

interface MessageBubbleProps {
  msg: SimpleMessage;
  refs: Record<string, DiaryRef> | null;
  isStreaming?: boolean;
}

export function MessageBubble({ msg, refs, isStreaming }: MessageBubbleProps) {
  const isUser = msg.role === "user";
  const textContent = getMessageText(msg);
  const segments = parseContent(textContent);
  const streaming = isStreaming ?? isMessageStreaming(msg);

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
        className={cn(
          "max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser ? "rounded-tr-sm" : "rounded-tl-sm"
        )}
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
          <span>{textContent}</span>
        ) : (
          <span>
            {segments.map((seg, i) =>
              seg.type === "text" ? (
                <span key={i} style={{ whiteSpace: "pre-wrap" }}>{seg.content}</span>
              ) : (
                <MemoryAnchorCard key={i} refNum={seg.num} refs={refs} />
              )
            )}
            {streaming && textContent && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse align-middle bg-pu-cursor" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
