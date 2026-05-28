import { req } from "@/lib/api/request";

// ────── Types ──────

export type SeedType = "happy" | "sad" | "anxious" | "calm" | "angry" | "neutral";
export type SeedStatus = "growing" | "sprouted" | "withered";

export interface Seed {
  id: string;
  user_id: string;
  seed_type: SeedType;
  task_note: string | null;
  status: SeedStatus;
  streak_days: number;
  planted_at: string;
  last_watered_at: string;
  sprouted_at: string | null;
  withered_at: string | null;
  wither_day: number | null;
  is_revived: boolean;
}

export interface CurrentSeedResponse {
  active_seed: Seed | null;
  withered_seeds: Seed[];
  sprouted_seeds: Seed[];
}

export interface WaterSeedResponse {
  seed: Seed;
  already_watered: boolean;
  sprouted: boolean;
  coins_earned: number;
  encouragement_message: string;
}

// ────── API ──────

export const seedsApi = {
  getCurrent(): Promise<CurrentSeedResponse> {
    return req("/seeds/current");
  },

  plant(seed_type: SeedType, task_note?: string): Promise<Seed> {
    return req("/seeds/plant", {
      method: "POST",
      body: JSON.stringify({ seed_type, task_note: task_note ?? null }),
    });
  },

  water(): Promise<WaterSeedResponse> {
    return req("/seeds/water", { method: "POST" });
  },

  revive(): Promise<Seed> {
    return req("/seeds/revive", { method: "POST" });
  },
};
