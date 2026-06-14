import { req } from "@/lib/api/request";

// ────── Types ──────

export interface DiaryRef {
  id: string;
  title: string;
  date: string;
  mood: string | null;
  summary: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "diary_saved";
  content: string;
  ref_ids: number[] | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  time_from: string | null;
  time_to: string | null;
  diary_refs: Record<string, DiaryRef> | null;
  created_at: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
  system_prompt: string;
}

export interface SessionCreatePayload {
  time_preset?: "all" | "3m" | "6m" | "1y" | "2y";
  time_from?: string;
  time_to?: string;
  query?: string;
  use_semantic?: boolean;
}

// ────── API ──────

export const chatApi = {
  createSession: (payload: SessionCreatePayload) =>
    req<ChatSessionDetail>("/chat/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listSessions: () => req<ChatSession[]>("/chat/sessions"),

  getSession: (id: string) => req<ChatSessionDetail>(`/chat/sessions/${id}`),

  deleteSession: (id: string) =>
    req<void>(`/chat/sessions/${id}`, { method: "DELETE" }).catch(() => {}),
};
