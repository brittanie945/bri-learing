import { req } from "@/lib/api/request";

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
