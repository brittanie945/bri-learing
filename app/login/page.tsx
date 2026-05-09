"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { login } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-green-50 px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-green-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-0 shadow-xl shadow-green-100/50 backdrop-blur-sm">
        <CardHeader className="space-y-4 pb-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-200">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">{t("loginField")}</Label>
              <Input
                id="login"
                placeholder={t("loginPlaceholder")}
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                required
                className="transition-colors focus-visible:ring-green-500/30 focus-visible:border-green-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="transition-colors focus-visible:ring-green-500/30 focus-visible:border-green-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-200 hover:shadow-lg hover:shadow-green-300 hover:scale-[1.01] transition-all duration-200 active:scale-[0.99]"
            >
              {loading ? t("submitting") : t("submit")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-medium text-green-600 hover:text-green-500 transition-colors">
              {t("register")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
