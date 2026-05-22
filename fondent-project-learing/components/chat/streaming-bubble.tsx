import { Bot } from "lucide-react";

interface StreamingBubbleProps {
  content: string;
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
  return (
    <div className="flex gap-2.5 mb-4">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-bot text-white"
      >
        <Bot className="h-4 w-4" />
      </div>
      <div
        className="max-w-[72%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed bg-pu-surface-hi border border-pu-border text-pu-text-2"
      >
        {content || (
          <span className="flex gap-1 items-center text-pu-muted">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
            <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
          </span>
        )}
        {content && (
          <span
            className="ml-0.5 inline-block h-4 w-0.5 animate-pulse align-middle bg-pu-cursor"
          />
        )}
      </div>
    </div>
  );
}
