import { req } from "@/lib/api/request";

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
  is_ai_generated: boolean;
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

export interface SemanticSearchItem {
  id: string;
  title: string;
  content_preview: string;
  mood: string | null;
  similarity: number;
  created_at: string;
}

export interface RelatedDiaryItem {
  id: string;
  title: string;
  content_preview: string;
  mood: string | null;
  similarity: number;
  created_at: string;
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

  semanticSearch: (params: {
    query: string;
    mood?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    qs.set("query", params.query);
    if (params.mood) qs.set("mood", params.mood);
    if (params.tag) qs.set("tag", params.tag);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    return req<SemanticSearchItem[]>(`/diary/search/semantic?${qs}`);
  },

  getRelated: (diaryId: string, limit?: number) => {
    const qs = limit ? `?limit=${limit}` : "";
    return req<RelatedDiaryItem[]>(`/diary/${diaryId}/related${qs}`);
  },
};
