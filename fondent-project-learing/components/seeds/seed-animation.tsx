"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SeedStatus, SeedType } from "@/lib/api/seeds";

interface Props {
  status: SeedStatus | null;
  streakDays: number;
  isWatering?: boolean;
  size?: number;
  seedType?: SeedType | null;
}

// ──────────────────────────────────────────
// Per-mood color palettes
// ──────────────────────────────────────────
const MOOD_PALETTE: Record<
  string,
  {
    stem: string;     // 茎干
    leaf: string;     // 叶子
    bud: string;      // 花蕾
    petal: string;    // 花瓣基础色 (hue will shift per petal)
    center: string;   // 花心
    sparkle: string;  // 闪光
    seed: string;     // 种子本身
    soil: string;     // 土壤
    witherStem: string;
    witherLeaf: string;
  }
> = {
  happy: {
    stem:      "oklch(0.58 0.20 80)",
    leaf:      "oklch(0.72 0.22 80)",
    bud:       "oklch(0.82 0.22 75)",
    petal:     "oklch(0.82 0.22 75)",
    center:    "oklch(0.90 0.18 60)",
    sparkle:   "oklch(0.94 0.16 60)",
    seed:      "oklch(0.68 0.18 80)",
    soil:      "oklch(0.32 0.060 50)",
    witherStem:"oklch(0.45 0.08 50)",
    witherLeaf:"oklch(0.40 0.08 70)",
  },
  sad: {
    stem:      "oklch(0.50 0.14 240)",
    leaf:      "oklch(0.58 0.16 240)",
    bud:       "oklch(0.68 0.18 240)",
    petal:     "oklch(0.72 0.18 240)",
    center:    "oklch(0.82 0.14 240)",
    sparkle:   "oklch(0.88 0.12 240)",
    seed:      "oklch(0.55 0.14 240)",
    soil:      "oklch(0.30 0.040 240)",
    witherStem:"oklch(0.40 0.06 50)",
    witherLeaf:"oklch(0.38 0.06 50)",
  },
  anxious: {
    stem:      "oklch(0.52 0.18 300)",
    leaf:      "oklch(0.62 0.20 300)",
    bud:       "oklch(0.74 0.22 300)",
    petal:     "oklch(0.76 0.22 300)",
    center:    "oklch(0.84 0.18 300)",
    sparkle:   "oklch(0.90 0.16 300)",
    seed:      "oklch(0.60 0.18 300)",
    soil:      "oklch(0.32 0.050 50)",
    witherStem:"oklch(0.42 0.08 50)",
    witherLeaf:"oklch(0.40 0.08 70)",
  },
  calm: {
    stem:      "oklch(0.50 0.12 260)",
    leaf:      "oklch(0.62 0.14 260)",
    bud:       "oklch(0.72 0.16 260)",
    petal:     "oklch(0.76 0.16 260)",
    center:    "oklch(0.84 0.12 260)",
    sparkle:   "oklch(0.90 0.10 260)",
    seed:      "oklch(0.56 0.12 260)",
    soil:      "oklch(0.30 0.040 260)",
    witherStem:"oklch(0.42 0.06 50)",
    witherLeaf:"oklch(0.38 0.06 70)",
  },
  angry: {
    stem:      "oklch(0.52 0.18 25)",
    leaf:      "oklch(0.64 0.20 25)",
    bud:       "oklch(0.76 0.22 25)",
    petal:     "oklch(0.78 0.22 25)",
    center:    "oklch(0.86 0.18 25)",
    sparkle:   "oklch(0.92 0.16 25)",
    seed:      "oklch(0.60 0.18 25)",
    soil:      "oklch(0.34 0.060 25)",
    witherStem:"oklch(0.44 0.08 50)",
    witherLeaf:"oklch(0.40 0.08 50)",
  },
  neutral: {
    stem:      "oklch(0.55 0.18 145)",
    leaf:      "oklch(0.65 0.22 145)",
    bud:       "oklch(0.75 0.22 145)",
    petal:     "oklch(0.78 0.22 145)",
    center:    "oklch(0.88 0.20 80)",
    sparkle:   "oklch(0.92 0.18 80)",
    seed:      "oklch(0.62 0.14 145)",
    soil:      "oklch(0.32 0.060 50)",
    witherStem:"oklch(0.45 0.08 50)",
    witherLeaf:"oklch(0.40 0.08 70)",
  },
};

function palette(seedType?: string | null) {
  return MOOD_PALETTE[seedType ?? ""] ?? MOOD_PALETTE.neutral;
}

// ──────────────────────────────────────────
// Canvas water-drop particles
// ──────────────────────────────────────────
function WaterCanvas({ size }: { size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type Drop = { x: number; y: number; vy: number; alpha: number; r: number };
    const drops: Drop[] = Array.from({ length: 14 }, () => ({
      x: size * 0.3 + Math.random() * size * 0.4,
      y: -4 + Math.random() * -12,
      vy: 1.5 + Math.random() * 2,
      alpha: 0.7 + Math.random() * 0.3,
      r: 2 + Math.random() * 2.5,
    }));

    let frameId: number;
    const start = performance.now();

    function draw(now: number) {
      if (!ctx || !canvas) return;
      if (now - start > 900) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const d of drops) {
        d.y += d.vy;
        d.vy += 0.18; // gravity
        d.alpha -= 0.012;
        if (d.alpha <= 0) continue;
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.r * 0.7, d.r, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 200, 255, ${d.alpha})`;
        ctx.fill();
      }
      frameId = requestAnimationFrame(draw);
    }

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="pointer-events-none absolute inset-0"
    />
  );
}

// ──────────────────────────────────────────
// SVG plant shapes per state
// ──────────────────────────────────────────

// Soil mound shared by all states
function Soil({ size, fill }: { size: number; fill: string }) {
  const s = size;
  return (
    <ellipse
      cx={s / 2}
      cy={s * 0.82}
      rx={s * 0.36}
      ry={s * 0.08}
      fill={fill}
    />
  );
}

// Unplanted — pulsing soil mound + plus
function Unplanted({ size, c }: { size: number; c: ReturnType<typeof palette> }) {
  const s = size;
  return (
    <motion.g>
      <Soil size={s} fill={c.soil} />
      <motion.circle
        cx={s / 2}
        cy={s * 0.55}
        r={s * 0.18}
        fill="oklch(0.22 0.045 290 / 0.6)"
        stroke="oklch(0.50 0.12 290 / 0.5)"
        strokeWidth={1.5}
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        style={{ originX: "50%", originY: "50%" }}
      />
      <motion.text
        x={s / 2}
        y={s * 0.58}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={s * 0.22}
        fill="oklch(0.75 0.18 290)"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
      >
        +
      </motion.text>
    </motion.g>
  );
}

// Day 1 — seed in soil, breathing
function SeedDay1({ size, c }: { size: number; c: ReturnType<typeof palette> }) {
  const s = size;
  return (
    <motion.g
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      style={{ originX: "50%", originY: "82%" }}
    >
      <Soil size={s} fill={c.soil} />
      <ellipse
        cx={s / 2}
        cy={s * 0.74}
        rx={s * 0.10}
        ry={s * 0.075}
        fill={c.seed}
      />
      {/* tiny sprout hint */}
      <line
        x1={s / 2}
        y1={s * 0.73}
        x2={s / 2}
        y2={s * 0.64}
        stroke={c.stem}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </motion.g>
  );
}

// Day 2 — single stem, swaying
function SeedDay2({ size, c }: { size: number; c: ReturnType<typeof palette> }) {
  const s = size;
  return (
    <motion.g
      animate={{ rotate: [-3, 3, -3] }}
      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      style={{ originX: `${s / 2}px`, originY: `${s * 0.82}px` }}
    >
      <Soil size={s} fill={c.soil} />
      {/* stem */}
      <line
        x1={s / 2} y1={s * 0.82}
        x2={s / 2} y2={s * 0.48}
        stroke={c.stem}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* single leaf */}
      <motion.ellipse
        cx={s * 0.62}
        cy={s * 0.58}
        rx={s * 0.14}
        ry={s * 0.07}
        fill={c.leaf}
        style={{ transformBox: "fill-box", transformOrigin: "left center" }}
        animate={{ rotate: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      {/* bud */}
      <ellipse
        cx={s / 2}
        cy={s * 0.45}
        rx={s * 0.065}
        ry={s * 0.08}
        fill={c.bud}
      />
    </motion.g>
  );
}

// Day 3 growing — two leaves, float
function SeedDay3({ size, c }: { size: number; c: ReturnType<typeof palette> }) {
  const s = size;
  return (
    <motion.g
      animate={{ y: [0, -5, 0], rotate: [-2, 2, -2] }}
      transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
      style={{ originX: `${s / 2}px`, originY: `${s * 0.82}px` }}
    >
      <Soil size={s} fill={c.soil} />
      {/* stem */}
      <line
        x1={s / 2} y1={s * 0.82}
        x2={s / 2} y2={s * 0.40}
        stroke={c.stem}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* left leaf */}
      <ellipse
        cx={s * 0.36}
        cy={s * 0.60}
        rx={s * 0.15}
        ry={s * 0.07}
        fill={c.leaf}
        transform={`rotate(-30, ${s * 0.36}, ${s * 0.60})`}
      />
      {/* right leaf */}
      <ellipse
        cx={s * 0.64}
        cy={s * 0.55}
        rx={s * 0.15}
        ry={s * 0.07}
        fill={c.leaf}
        transform={`rotate(30, ${s * 0.64}, ${s * 0.55})`}
      />
      {/* top bud */}
      <ellipse
        cx={s / 2}
        cy={s * 0.37}
        rx={s * 0.07}
        ry={s * 0.09}
        fill={c.bud}
      />
    </motion.g>
  );
}

// Sprouted — flower bloom entrance then float
function Sprouted({ size, c }: { size: number; c: ReturnType<typeof palette> }) {
  const s = size;
  const petalCount = 6;
  const petalAngles = Array.from({ length: petalCount }, (_, i) => (i * 360) / petalCount);

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, y: [0, -7, 0] }}
      transition={{
        scale: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
        opacity: { duration: 0.4 },
        y: { repeat: Infinity, duration: 3.2, ease: "easeInOut", delay: 0.6 },
      }}
      style={{ originX: `${s / 2}px`, originY: `${s * 0.82}px` }}
    >
      <Soil size={s} fill={c.soil} />
      {/* stem */}
      <line
        x1={s / 2} y1={s * 0.82}
        x2={s / 2} y2={s * 0.46}
        stroke={c.stem}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* petals */}
      {petalAngles.map((angle, i) => (
        <motion.ellipse
          key={i}
          cx={s / 2 + Math.cos((angle * Math.PI) / 180) * s * 0.14}
          cy={s * 0.36 + Math.sin((angle * Math.PI) / 180) * s * 0.14}
          rx={s * 0.075}
          ry={s * 0.045}
          fill={c.petal}
          transform={`rotate(${angle}, ${s / 2 + Math.cos((angle * Math.PI) / 180) * s * 0.14}, ${s * 0.36 + Math.sin((angle * Math.PI) / 180) * s * 0.14})`}
          initial={{ pathLength: 0, scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.05 * i, duration: 0.4, ease: "backOut" }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      ))}
      {/* center */}
      <circle
        cx={s / 2}
        cy={s * 0.36}
        r={s * 0.065}
        fill={c.center}
      />
      {/* sparkle dots */}
      {[...Array(5)].map((_, i) => {
        const a = (i * 72 * Math.PI) / 180;
        return (
          <motion.circle
            key={i}
            cx={s / 2 + Math.cos(a) * s * 0.28}
            cy={s * 0.36 + Math.sin(a) * s * 0.28}
            r={s * 0.022}
            fill={c.sparkle}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0] }}
            transition={{ delay: 0.5 + i * 0.08, duration: 0.7, ease: "easeOut" }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        );
      })}
    </motion.g>
  );
}

// Withered — droop + brown tint
function Withered({ size, c }: { size: number; c: ReturnType<typeof palette> }) {
  const s = size;
  return (
    <motion.g
      initial={{ rotate: 0, opacity: 1 }}
      animate={{ rotate: -14, opacity: 0.65 }}
      transition={{ type: "spring", stiffness: 70, damping: 12, delay: 0.1 }}
      style={{ originX: `${s / 2}px`, originY: `${s * 0.82}px` }}
    >
      <Soil size={s} fill={c.soil} />
      {/* wilted stem */}
      <line
        x1={s / 2} y1={s * 0.82}
        x2={s / 2} y2={s * 0.46}
        stroke={c.witherStem}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* drooping leaves */}
      <ellipse
        cx={s * 0.34}
        cy={s * 0.62}
        rx={s * 0.14}
        ry={s * 0.055}
        fill={c.witherLeaf}
        transform={`rotate(-50, ${s * 0.34}, ${s * 0.62})`}
      />
      <ellipse
        cx={s * 0.66}
        cy={s * 0.62}
        rx={s * 0.14}
        ry={s * 0.055}
        fill={c.witherLeaf}
        transform={`rotate(50, ${s * 0.66}, ${s * 0.62})`}
      />
      {/* drooping top */}
      <motion.path
        d={`M ${s / 2} ${s * 0.46} Q ${s * 0.62} ${s * 0.38} ${s * 0.58} ${s * 0.30}`}
        stroke={c.witherStem}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
    </motion.g>
  );
}

// ──────────────────────────────────────────
// Main export
// ──────────────────────────────────────────
export function SeedAnimation({ status, streakDays, isWatering = false, size = 120, seedType }: Props) {
  const c = palette(seedType);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
        <AnimatePresence mode="wait">
          {status === null && (
            <motion.g key="unplanted" exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.25 }}>
              <Unplanted size={size} c={c} />
            </motion.g>
          )}
          {status === "growing" && streakDays === 1 && (
            <motion.g key="day1" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3 }}>
              <SeedDay1 size={size} c={c} />
            </motion.g>
          )}
          {status === "growing" && streakDays === 2 && (
            <motion.g key="day2" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3 }}>
              <SeedDay2 size={size} c={c} />
            </motion.g>
          )}
          {status === "growing" && streakDays >= 3 && (
            <motion.g key="day3" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3 }}>
              <SeedDay3 size={size} c={c} />
            </motion.g>
          )}
          {status === "sprouted" && (
            <motion.g key="sprouted">
              <Sprouted size={size} c={c} />
            </motion.g>
          )}
          {status === "withered" && (
            <motion.g key="withered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Withered size={size} c={c} />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Canvas water-drop overlay */}
      <AnimatePresence>
        {isWatering && <WaterCanvas key="water" size={size} />}
      </AnimatePresence>
    </div>
  );
}
