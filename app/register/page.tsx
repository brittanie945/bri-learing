"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { register, login } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function RegisterPage() {
  const t = useTranslations("register");
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError(t("passwordMismatch")); return; }
    if (form.password.length < 6) { setError(t("passwordTooShort")); return; }
    setLoading(true);
    try {
      await register({ username: form.username, email: form.email, password: form.password });
      await login({ login: form.email, password: form.password });
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
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-green-200/40 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-0 shadow-xl shadow-green-100/50 backdrop-blur-sm">
        <CardHeader className="space-y-4 pb-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-200">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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
              <Label htmlFor="username">{t("username")}</Label>
              <Input id="username" placeholder={t("usernamePlaceholder")} value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} required
                className="transition-colors focus-visible:ring-green-500/30 focus-visible:border-green-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" placeholder={t("emailPlaceholder")} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required
                className="transition-colors focus-visible:ring-green-500/30 focus-visible:border-green-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" type="password" placeholder={t("passwordPlaceholder")} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required
                className="transition-colors focus-visible:ring-green-500/30 focus-visible:border-green-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input id="confirmPassword" type="password" placeholder={t("confirmPasswordPlaceholder")} value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required
                className="transition-colors focus-visible:ring-green-500/30 focus-visible:border-green-500" />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <Button type="submit" disabled={loading}
              className="w-full bg-linear-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-200 hover:shadow-lg hover:shadow-green-300 hover:scale-[1.01] transition-all duration-200 active:scale-[0.99]">
              {loading ? t("submitting") : t("submit")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-medium text-green-600 hover:text-green-500 transition-colors">
              {t("login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
