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

export interface DailyQuote {
  id: number;
  content_zh: string;
  content_en: string;
  author: string | null;
  source: string | null;
  is_ai_generated: boolean;
  created_at: string;
}

export interface TodayQuoteResponse {
  quote: DailyQuote;
  is_collected: boolean;
}

export interface CollectResponse {
  quote_id: number;
  is_new: boolean;
  message: string;
}

export interface CollectedQuoteItem {
  quote: DailyQuote;
  collected_at: string;
}

// ────── API ──────

export const quotesApi = {
  getToday(): Promise<TodayQuoteResponse> {
    return req("/quotes/today");
  },

  collect(quoteId: number): Promise<CollectResponse> {
    return req(`/quotes/${quoteId}/collect`, { method: "POST" });
  },

  myCollection(): Promise<CollectedQuoteItem[]> {
    return req("/quotes/my-collection");
  },
};
