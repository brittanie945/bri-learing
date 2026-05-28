import { getToken, logout } from "@/lib/auth-client";

export const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** 统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** 通用请求函数，自动解包 data 字段 */
export async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    logout();
    throw new Error("登录已过期，请重新登录");
  }
  if (res.status === 204) return undefined as T;
  const json: ApiResponse<T> = await res.json();
  if (json.code >= 400) throw new Error(json.message || "请求失败");
  return json.data;
}
