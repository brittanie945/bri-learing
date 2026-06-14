import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const apiUrl = process.env.API_BASE_URL || "http://localhost:8000";

  const res = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: unknown;
  try { data = await res.json(); } catch { data = { code: res.status, message: "请求失败" }; }
  return NextResponse.json(data, { status: res.status });
}
