"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookHeart } from "lucide-react";
import { register, login } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";

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
    <div className="min-h-screen flex items-center justify-center px-4" style={{background: "oklch(0.10 0.030 290)"}}>
      {/* 星云光晕 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 h-125 w-125 rounded-full opacity-35"
          style={{background: "radial-gradient(circle, oklch(0.42 0.26 330), transparent 70%)"}} />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full opacity-30"
          style={{background: "radial-gradient(circle, oklch(0.42 0.24 290), transparent 70%)"}} />
        <div className="absolute top-1/2 right-1/4 h-64 w-64 rounded-full opacity-20"
          style={{background: "radial-gradient(circle, oklch(0.45 0.20 195), transparent 70%)"}} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* 品牌 */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-4"
            style={{background: "linear-gradient(135deg, oklch(0.68 0.24 330), oklch(0.70 0.24 290))", boxShadow: "0 0 24px oklch(0.48 0.26 310 / 0.60)"}}>
            <BookHeart className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold" style={{color: "oklch(0.93 0.010 290)"}}>{t("title")}</h1>
          <p className="mt-1 text-sm" style={{color: "oklch(0.52 0.015 290)"}}>{t("subtitle")}</p>
        </div>

        {/* 表单卡片 */}
        <div className="rounded-2xl p-6 space-y-4" style={{
          background: "oklch(0.16 0.030 290)",
          border: "1px solid oklch(0.32 0.050 290 / 0.55)",
          boxShadow: "0 20px 50px oklch(0.05 0.030 290 / 0.70), inset 0 1px 0 oklch(0.40 0.060 290 / 0.15)"
        }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { id: "username", label: t("username"), type: "text", placeholder: t("usernamePlaceholder"), key: "username" },
              { id: "email",    label: t("email"),    type: "email", placeholder: t("emailPlaceholder"),    key: "email" },
              { id: "password", label: t("password"), type: "password", placeholder: t("passwordPlaceholder"), key: "password" },
              { id: "confirmPassword", label: t("confirmPassword"), type: "password", placeholder: t("confirmPasswordPlaceholder"), key: "confirmPassword" },
            ].map(({ id, label, type, placeholder, key }) => (
              <div key={id} className="space-y-1.5">
                <label className="text-xs font-medium tracking-wide" style={{color: "oklch(0.58 0.015 290)"}}>{label}</label>
                <Input
                  id={id} type={type} placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required className="h-10 text-sm"
                  style={{background: "oklch(0.20 0.035 290)", borderColor: "oklch(0.34 0.050 290 / 0.65)", color: "oklch(0.90 0.012 290)"}}
                />
              </div>
            ))}

            {error && (
              <p className="text-sm rounded-xl px-3 py-2" style={{color: "oklch(0.80 0.20 15)", background: "oklch(0.20 0.045 15)"}}>{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full h-10 text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50"
              style={{
                background: loading
                  ? "oklch(0.45 0.18 310)"
                  : "linear-gradient(135deg, oklch(0.68 0.24 330), oklch(0.70 0.24 290))",
                color: "white",
                boxShadow: loading ? "none" : "0 4px 20px oklch(0.40 0.28 310 / 0.50)"
              }}
            >
              {loading ? t("submitting") : t("submit")}
            </button>
          </form>

          <p className="text-center text-xs pt-1" style={{color: "oklch(0.48 0.015 290)"}}>
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-medium transition-colors" style={{color: "oklch(0.76 0.22 290)"}}>
              {t("login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
