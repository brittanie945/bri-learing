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

export interface BottleItem {
  id: string;
  content: string;
  is_picked: boolean;
  picked_at: string | null;
  created_at: string;
}

export interface BottleReply {
  id: string;
  bottle_id: string;
  content: string;
  created_at: string;
}

export interface BottleWithReplies extends BottleItem {
  replies: BottleReply[];
}

export const driftApi = {
  throw: (content: string) =>
    req<BottleItem>("/drift/throw", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  pick: () => req<BottleWithReplies>("/drift/pick", { method: "POST" }),

  myBottles: () => req<BottleItem[]>("/drift/my"),

  getBottle: (id: string) => req<BottleWithReplies>(`/drift/${id}`),

  reply: (bottleId: string, content: string) =>
    req<BottleReply>(`/drift/${bottleId}/reply`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
