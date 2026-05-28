export interface UserResponse {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface ApiError {
  detail: string;
}

export async function register(data: {
  username: string;
  email: string;
  password: string;
}): Promise<UserResponse> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || json.code >= 400) throw new Error(json.message || json.detail || "注册失败");
  return json.data as UserResponse;
}

export async function login(data: {
  login: string;
  password: string;
}): Promise<TokenResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || json.code >= 400) throw new Error(json.message || json.detail || "登录失败");
  const tokenData = json.data as TokenResponse;
  if (typeof window !== 'undefined') {
    localStorage.setItem("token", tokenData.access_token);
    localStorage.setItem("user", JSON.stringify(tokenData.user));
  }
  return tokenData;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem("token");
}

export function getUser(): UserResponse | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
