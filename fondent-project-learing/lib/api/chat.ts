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
  role: "user" | "assistant";
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
}

export type SSEChunk =
  | { type: "chunk"; content: string }
  | { type: "refs"; ids: number[] }
  | { type: "done" }
  | { type: "error"; message: string };

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
    fetch(`${BASE}/chat/sessions/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then((r) => {
      if (r.status === 401) { logout(); }
    }),

  /**
   * 流式发送消息，通过回调函数逐步处理 SSE 事件
   */
  streamMessage: async (
    sessionId: string,
    content: string,
    onChunk: (text: string) => void,
    onRefs: (ids: number[]) => void,
    onDone: () => void,
    onError?: (msg: string) => void,
  ) => {
    const token = getToken();
    const res = await fetch(`${BASE}/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
    });

    if (res.status === 401) {
      logout();
      return;
    }

    if (!res.body) {
      onError?.("无法建立流式连接");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6)) as SSEChunk;
          if (evt.type === "chunk") onChunk(evt.content);
          else if (evt.type === "refs") onRefs(evt.ids);
          else if (evt.type === "done") onDone();
          else if (evt.type === "error") onError?.(evt.message);
        } catch {
          // 忽略解析失败的行
        }
      }
    }
  },
};
