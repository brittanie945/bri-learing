import { req } from "@/lib/api/request";

// ────── Types ──────

export type VoucherType = "TIME_ACCELERATE" | "TIME_FREEZE";

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
