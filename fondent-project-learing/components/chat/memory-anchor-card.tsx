"use client";

import { useState } from "react";
import { Clock, ChevronDown, ChevronRight } from "lucide-react";
import type { DiaryRef } from "@/lib/api/chat";

interface MemoryAnchorCardProps {
  refNum: number;
  refs: Record<string, DiaryRef> | null;
}

export function MemoryAnchorCard({ refNum, refs }: MemoryAnchorCardProps) {
  const [open, setOpen] = useState(false);
  const ref = refs?.[String(refNum)];
  if (!ref) return <span className="text-xs opacity-50">[REF:{refNum}]</span>;

  return (
    <span className="inline-block align-middle mx-0.5">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md transition-all bg-pu-pill/70 text-pu-accent-2 border border-pu-pill-border"
      >
        <Clock className="h-2.5 w-2.5" />
        {ref.date}
        {open ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
      </button>
      {open && (
        <span
          className="block mt-1 rounded-xl p-3 text-xs leading-relaxed bg-pu-surface border border-pu-border-hi"
        >
          <span className="block font-semibold mb-1 text-pu-accent-2">
            《{ref.title}》— {ref.date}
          </span>
          {ref.mood && (
            <span className="block text-xs mb-1 text-pu-muted">
              心情：{ref.mood}
            </span>
          )}
          <span className="block text-pu-new-chat">
            {ref.summary}
            {ref.summary.length >= 300 && "…"}
          </span>
        </span>
      )}
    </span>
  );
}
