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
