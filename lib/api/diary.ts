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

export type Mood = "happy" | "sad" | "anxious" | "calm" | "angry" | "neutral";
export type Weather = "sunny" | "cloudy" | "rainy" | "snowy" | "windy" | "stormy";

export interface DiaryListItem {
  id: string;
  title: string;
  mood: Mood | null;
  weather: Weather | null;
  tags: string[] | null;
  is_capsule: boolean;
  unlock_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiaryDetail extends DiaryListItem {
  user_id: string;
  content: string;
  self_destruct_days: number;
  is_deleted: boolean;
}

export interface DiaryCreatePayload {
  title: string;
  content: string;
  mood?: Mood;
  weather?: Weather;
  tags?: string[];
  is_capsule?: boolean;
  unlock_at?: string;
  self_destruct_days?: number;
}

export interface DiaryUpdatePayload {
  title?: string;
  content?: string;
  mood?: Mood;
  weather?: Weather;
  tags?: string[];
  self_destruct_days?: number;
}

export interface MoodStatsItem {
  mood: Mood | null;
  count: number;
}

export interface MoodStats {
  stats: MoodStatsItem[];
  streak: number;
  total: number;
}

// ────── API ──────

export const diaryApi = {
  list: (params?: {
    mood?: string;
    is_capsule?: boolean;
    tag?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.mood) qs.set("mood", params.mood);
    if (params?.is_capsule !== undefined) qs.set("is_capsule", String(params.is_capsule));
    if (params?.tag) qs.set("tag", params.tag);
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    return req<DiaryListItem[]>(`/diary?${qs}`);
  },

  get: (id: string) => req<DiaryDetail>(`/diary/${id}`),

  create: (payload: DiaryCreatePayload) =>
    req<DiaryDetail>("/diary", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: DiaryUpdatePayload) =>
    req<DiaryDetail>(`/diary/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    req<void>(`/diary/${id}`, { method: "DELETE" }),

  moodStats: () => req<MoodStats>("/diary/stats/mood"),

  memoryLane: () => req<DiaryListItem[]>("/diary/memory-lane"),
};
