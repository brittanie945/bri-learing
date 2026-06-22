"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { coinsApi, type CoinBalance, type CoinTransaction, type VoucherType, type VoucherInventoryItem } from "@/lib/api/coins";

// ────── 道具配置 ──────
const VOUCHERS: Array<{
  type: VoucherType;
  icon: string;
  cost: number;
  nameKey: "accelerate" | "freeze";
  descKey: "accelerateDesc" | "freezeDesc";
  accentHue: number;
}> = [
  { type: "TIME_ACCELERATE", icon: "⚡", cost: 30, nameKey: "accelerate",   descKey: "accelerateDesc",   accentHue: 70  },
  { type: "TIME_FREEZE",     icon: "❄️", cost: 20, nameKey: "freeze",       descKey: "freezeDesc",       accentHue: 220 },
];

const REASON_MAP: Record<string, string> = {
  DIARY_CHECKIN:    "日记打卡奖励",
  BUY_ACCELERATE:   "购买光加速券",
  BUY_FREEZE:       "购买时光冻结券",
  USE_ACCELERATE:   "使用光加速券",
  USE_FREEZE:       "使用时光冻结券",
};

// ────── 购买确认弹窗 ──────
function BuyModal({
  voucher,
  balance,
  onClose,
  onSuccess,
}: {
  voucher: (typeof VOUCHERS)[0];
  balance: number;
  onClose: () => void;
  onSuccess: (msg: string, newBalance: number, newQty: number) => void;
}) {
  const t = useTranslations("coins");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canAfford = balance >= voucher.cost;

  const handleBuy = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await coinsApi.buyVoucher(voucher.type);
      onSuccess(res.message, res.new_balance, res.quantity);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "购买失败");
    } finally {
      setLoading(false);
    }
  };

  const hue = voucher.accentHue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[oklch(0.04_0.020_290/0.80)] backdrop-blur-md" />
      <div
        className="relative w-full max-w-sm rounded-3xl p-6 space-y-5"
        style={{ background: "oklch(0.11 0.030 290)", border: `1px solid oklch(0.32 0.060 ${hue} / 0.50)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-2">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-4xl"
            style={{ background: `linear-gradient(135deg, oklch(0.26 0.070 ${hue}), oklch(0.18 0.045 ${hue}))`, boxShadow: `0 0 24px oklch(0.50 0.18 ${hue} / 0.35)` }}
          >
            {voucher.icon}
          </div>
          <h3 className="text-lg font-bold text-pu-text-2">{t(voucher.nameKey)}</h3>
          <p className="text-xs leading-relaxed px-2 text-pu-muted">{t(voucher.descKey)}</p>
        </div>

        <div className="flex items-center justify-between rounded-2xl px-4 py-3"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-[oklch(0.16_0.040_290)]">
          <span className="text-sm text-pu-label">消耗时光币</span>
          <span className="text-xl font-bold" style={{ color: `oklch(0.78 0.20 ${hue})` }}>{voucher.cost} 🪙</span>
        </div>

        {!canAfford && (
          <p className="text-xs text-center rounded-xl px-3 py-2 bg-err-bg text-err-soft">
            {t("insufficientCoins")}（当前 {balance} 🪙）
          </p>
        )}
        {error && (
          <p className="text-xs text-center text-err-soft">{error}</p>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl py-2.5 text-sm font-medium bg-[oklch(0.18_0.032_290)] text-pu-label">
            取消
          </button>
          <button onClick={handleBuy} disabled={loading || !canAfford}
            className="flex-1 rounded-2xl py-2.5 text-sm font-bold disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, oklch(0.60 0.22 ${hue}), oklch(0.52 0.20 ${hue + 20}))`, color: "white" }}>
            {loading ? "购买中…" : "确认购买"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ────── 道具卡（商店视图）──────
function ShopVoucherCard({ v, onBuy }: { v: (typeof VOUCHERS)[0]; onBuy: () => void }) {
  const t = useTranslations("coins");
  const hue = v.accentHue;
  return (
    <div
      className="relative rounded-3xl p-5 flex gap-4 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, oklch(0.16 0.048 ${hue} / 0.70), oklch(0.12 0.028 290))`,
        border: `1px solid oklch(0.30 0.060 ${hue} / 0.40)`,
      }}
    >
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
        style={{ background: `radial-gradient(circle, oklch(0.70 0.24 ${hue}), transparent)` }} />

      <div
        className="shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
        style={{
          background: `linear-gradient(135deg, oklch(0.28 0.075 ${hue}), oklch(0.20 0.050 ${hue}))`,
          boxShadow: `0 4px 16px oklch(0.45 0.18 ${hue} / 0.40)`,
        }}
      >
        {v.icon}
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-pu-text-2">{t(v.nameKey)}</h3>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0"
            style={{ background: `oklch(0.22 0.060 ${hue} / 0.60)`, color: `oklch(0.80 0.22 ${hue})` }}>
            {v.cost} 🪙
          </span>
        </div>
        <p className="text-xs leading-relaxed text-pu-label">{t(v.descKey)}</p>
        <button
          onClick={onBuy}
          className="mt-2 w-full rounded-xl py-1.5 text-xs font-bold transition-all active:scale-95"
          style={{
            background: `linear-gradient(90deg, oklch(0.58 0.22 ${hue}), oklch(0.52 0.20 ${hue + 25}))`,
            color: "white",
            boxShadow: `0 2px 12px oklch(0.45 0.18 ${hue} / 0.30)`,
          }}
        >
          购买 · {v.cost} 🪙
        </button>
      </div>
    </div>
  );
}

// ────── 道具卡（背包视图）──────
function BagVoucherCard({ v, quantity }: { v: (typeof VOUCHERS)[0]; quantity: number }) {
  const t = useTranslations("coins");
  const hue = v.accentHue;
  return (
    <div
      className="relative rounded-3xl p-5 flex items-center gap-4"
      style={{
        background: quantity > 0
          ? `linear-gradient(135deg, oklch(0.16 0.048 ${hue} / 0.60), oklch(0.12 0.028 290))`
          : "oklch(0.12 0.022 290)",
        border: quantity > 0
          ? `1px solid oklch(0.30 0.060 ${hue} / 0.40)`
          : "1px solid oklch(0.22 0.030 290 / 0.35)",
        opacity: quantity > 0 ? 1 : 0.45,
      }}
    >
      <div
        className="shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
        style={{
          background: quantity > 0
            ? `linear-gradient(135deg, oklch(0.28 0.075 ${hue}), oklch(0.20 0.050 ${hue}))`
            : "oklch(0.18 0.032 290)",
          boxShadow: quantity > 0 ? `0 4px 16px oklch(0.45 0.18 ${hue} / 0.35)` : "none",
        }}
      >
        {v.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm" style={{ color: quantity > 0 ? "oklch(0.88 0.015 290)" : "oklch(0.45 0.012 290)" }}>
          {t(v.nameKey)}
        </p>
        <p className="text-xs mt-0.5 text-pu-muted">{t(v.descKey)}</p>
        <p className="text-xs mt-1.5 text-[oklch(0.48_0.015_290)]">
          {quantity > 0 ? "前往日记页面使用" : "暂无库存，去商店购买"}
        </p>
      </div>

      <div
        className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black"
        style={{
          background: quantity > 0
            ? `linear-gradient(135deg, oklch(0.60 0.24 ${hue}), oklch(0.50 0.22 ${hue + 20}))`
            : "oklch(0.18 0.030 290)",
          color: quantity > 0 ? "white" : "oklch(0.38 0.012 290)",
          boxShadow: quantity > 0 ? `0 2px 8px oklch(0.45 0.18 ${hue} / 0.40)` : "none",
        }}
      >
        {quantity}
      </div>
    </div>
  );
}

// ────── 主页面 ──────
export default function ShopPage() {
  const t = useTranslations("coins");
  const [tab, setTab] = useState<"shop" | "bag">("shop");
  const [balance, setBalance] = useState<CoinBalance | null>(null);
  const [inventory, setInventory] = useState<VoucherInventoryItem[]>([]);
  const [history, setHistory] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyTarget, setBuyTarget] = useState<(typeof VOUCHERS)[0] | null>(null);
  const [toast, setToast] = useState("");

  const reload = useCallback(async () => {
    const [b, inv, h] = await Promise.all([
      coinsApi.getBalance(),
      coinsApi.getMyVouchers(),
      coinsApi.getHistory(30),
    ]);
    setBalance(b);
    setInventory(inv);
    setHistory(h);
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const getQty = (type: VoucherType) =>
    inventory.find((i) => i.voucher_type === type)?.quantity ?? 0;

  const totalQty = inventory.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="mx-auto max-w-xl pb-12 space-y-6">

      {/* ── 顶部余额区 ── */}
      <div className="relative rounded-3xl overflow-hidden"
        className="rounded-2xl p-5 space-y-3 bg-[linear-gradient(135deg,oklch(0.20_0.075_290),oklch(0.13_0.045_290)])">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.28 290), transparent)" }} />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, oklch(0.65 0.24 330), transparent)" }} />

        <div className="relative p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-pu-muted">
                时光币余额
              </p>
              <p className="mt-1 text-5xl font-black tabular-nums text-pu-active">
                {loading ? "—" : balance?.balance ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-pu-very-dim">每天写日记打卡获取</p>
            </div>
            {balance && (
              <div className="text-right space-y-1 pb-1">
                <p className="text-xs text-pu-very-dim">
                  累计获得 <span className="text-[oklch(0.72_0.18_140)]">+{balance.total_earned}</span>
                </p>
                <p className="text-xs text-pu-very-dim">
                  累计消费 <span className="text-err-soft">-{balance.total_spent}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab 切换 ── */}
      <div className="flex gap-1 rounded-2xl p-1.5"
        className="rounded-2xl p-5 space-y-4 bg-[oklch(0.13_0.028_290)]">
        {(["shop", "bag"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 rounded-xl py-2 text-sm font-semibold transition-all"
            style={tab === key
              ? { background: "linear-gradient(135deg, oklch(0.65 0.24 290), oklch(0.58 0.22 320))", color: "white", boxShadow: "0 2px 10px oklch(0.40 0.18 290 / 0.45)" }
              : { color: "oklch(0.48 0.015 290)" }}
          >
            {key === "shop" ? "🛒 时光商店" : `🎒 我的背包${totalQty > 0 ? ` · ${totalQty}` : ""}`}
          </button>
        ))}
      </div>

      {/* ── 商店 Tab ── */}
      {tab === "shop" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {VOUCHERS.map((v) => (
              <ShopVoucherCard key={v.type} v={v} onBuy={() => setBuyTarget(v)} />
            ))}
          </div>

          <div className="rounded-2xl p-4 space-y-3"
            className="rounded-xl px-3 py-2.5 space-y-1 bg-[oklch(0.12_0.024_290)] border border-[oklch(0.22_0.032_290/0.40)]">
            <p className="text-xs font-semibold text-pu-label">💡 如何赚取时光币</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["📝", "写日记打卡", "+5"],
                ["🔥", "连续 3 天", "+2"],
                ["⭐", "连续 7 天", "+5"],
                ["🏆", "连续 30 天", "+10"],
              ].map(([icon, label, bonus]) => (
                <div key={label} className="flex items-center gap-2 rounded-xl px-3 py-2 bg-[oklch(0.16_0.032_290)]">
                  <span>{icon}</span>
                  <span className="text-pu-label">{label}</span>
                  <span className="ml-auto font-bold text-[oklch(0.70_0.18_140)]">{bonus}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 背包 Tab ── */}
      {tab === "bag" && (
        <div className="space-y-3">
          {VOUCHERS.map((v) => (
            <BagVoucherCard key={v.type} v={v} quantity={getQty(v.type)} />
          ))}
          <p className="text-xs text-center pt-2 text-pu-ghost">
            日记页面使用 ⚡❄️
          </p>
        </div>
      )}

      {/* ── 流水记录 ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-pu-muted">{t("history")}</p>
        {history.length === 0 ? (
          <p className="text-xs text-center py-6 text-pu-ghost">{t("noHistory")}</p>
        ) : (
          <ul className="space-y-1.5">
            {history.map((tx) => (
              <li key={tx.id}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-[oklch(0.13_0.026_290)] border border-[oklch(0.22_0.030_290/0.30)]">
                <div>
                  <p className="text-xs font-medium text-[oklch(0.66_0.015_290)]">
                    {REASON_MAP[tx.reason] ?? tx.reason}
                  </p>
                  <p className="text-xs text-pu-ghost">
                    {new Date(tx.created_at).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${tx.type === "EARN" ? "text-[oklch(0.70_0.18_140)]" : "text-[oklch(0.70_0.18_15)]"}`}>
                  {tx.type === "EARN" ? "+" : ""}{tx.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── 购买弹窗 ── */}
      {buyTarget && (
        <BuyModal
          voucher={buyTarget}
          balance={balance?.balance ?? 0}
          onClose={() => setBuyTarget(null)}
          onSuccess={(msg, newBalance, newQty) => {
            setBalance((prev) =>
              prev ? { ...prev, balance: newBalance, total_spent: prev.total_spent + (buyTarget?.cost ?? 0) } : prev
            );
            setInventory((prev) => {
              const exists = prev.find((i) => i.voucher_type === buyTarget!.type);
              if (exists) return prev.map((i) => i.voucher_type === buyTarget!.type ? { ...i, quantity: newQty } : i);
              return [...prev, { voucher_type: buyTarget!.type, quantity: newQty }];
            });
            reload();
            showToast(msg);
          }}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="rounded-2xl px-5 py-3 text-sm font-semibold shadow-2xl"
                  className="rounded-2xl px-5 py-3 shadow-2xl text-sm font-bold flex items-center gap-2 bg-[linear-gradient(135deg,oklch(0.22_0.075_290),oklch(0.18_0.050_290))] text-pu-accent border border-[oklch(0.42_0.16_290/0.50)]">
            ✓ {toast}
          </div>
        </div>
      )}
    </div>
  );
}

