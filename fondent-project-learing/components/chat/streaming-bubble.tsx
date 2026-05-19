import { Bot } from "lucide-react";

interface StreamingBubbleProps {
  content: string;
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
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
        {content && (
          <span
            className="ml-0.5 inline-block h-4 w-0.5 animate-pulse align-middle"
            style={{ background: "oklch(0.65 0.18 290)" }}
          />
        )}
      </div>
    </div>
  );
}
