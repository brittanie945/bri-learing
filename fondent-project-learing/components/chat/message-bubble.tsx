import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, DiaryRef } from "@/lib/api/chat";
import { MemoryAnchorCard } from "./memory-anchor-card";

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

interface MessageBubbleProps {
  msg: ChatMessage;
  refs: Record<string, DiaryRef> | null;
}

export function MessageBubble({ msg, refs }: MessageBubbleProps) {
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
