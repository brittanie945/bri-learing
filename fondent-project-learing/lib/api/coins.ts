import { getToken, logout } from "@/lib/auth-client";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    logout();
    throw new Error("登录已过期，请重新登录");
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || "请求失败");
  return json as T;
}

// ────── Types ──────

export type VoucherType = "TIME_ACCELERATE" | "TIME_FREEZE" | "REWIND" | "SEED_REVIVAL";

export interface CoinBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
}

export interface CoinTransaction {
  id: string;
  amount: number;
  type: "EARN" | "SPEND";
  reason: string;
  related_id: string | null;
  created_at: string;
}

export interface UseVoucherResponse {
  success: boolean;
  new_balance: number;
  message: string;
}

export interface BuyVoucherResponse {
  success: boolean;
  new_balance: number;
  voucher_type: VoucherType;
  quantity: number;
  message: string;
}

export interface VoucherInventoryItem {
  voucher_type: VoucherType;
  quantity: number;
}

// ────── API ──────

export const coinsApi = {
  getBalance(): Promise<CoinBalance> {
    return req("/coins/balance");
  },

  getHistory(limit = 20): Promise<CoinTransaction[]> {
    return req(`/coins/history?limit=${limit}`);
  },

  getMyVouchers(): Promise<VoucherInventoryItem[]> {
    return req("/coins/my-vouchers");
  },

  buyVoucher(voucher_type: VoucherType): Promise<BuyVoucherResponse> {
    return req("/coins/buy-voucher", {
      method: "POST",
      body: JSON.stringify({ voucher_type }),
    });
  },

  useVoucher(voucher_type: VoucherType, target_id: string): Promise<UseVoucherResponse> {
    return req("/coins/use-voucher", {
      method: "POST",
      body: JSON.stringify({ voucher_type, target_id }),
    });
  },
};
