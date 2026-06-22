"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthShell } from "@/components/auth/auth-shell";
import { register, login } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { z } from "zod";

const registerSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少 6 位"),
  confirmPassword: z.string().min(6, "请确认密码"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不匹配",
  path: ["confirmPassword"],
});

export default function RegisterPage() {
  const t = useTranslations("register");
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = registerSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues.map(issue => issue.message).join(", "));
      return;
    }
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
    <AuthShell
      footer={(
        <p className="text-center text-xs text-pu-dim">
          {t("hasAccount")}{" "}
          <Link href="/login" className="font-medium transition-colors text-pu-link">
            {t("login")}
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { id: "username", label: t("username"), type: "text", placeholder: t("usernamePlaceholder"), key: "username" },
          { id: "email", label: t("email"), type: "email", placeholder: t("emailPlaceholder"), key: "email" },
          { id: "password", label: t("password"), type: "password", placeholder: t("passwordPlaceholder"), key: "password" },
          { id: "confirmPassword", label: t("confirmPassword"), type: "password", placeholder: t("confirmPasswordPlaceholder"), key: "confirmPassword" },
        ].map(({ id, label, type, placeholder, key }) => (
          <div key={id} className="space-y-1.5">
            <label className="text-xs font-medium tracking-wide text-pu-label">
              {label}
            </label>
            <Input
              id={id}
              type={type}
              placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required
              className="h-10 text-sm"
              style={{
                background: "oklch(0.20 0.035 290)",
                borderColor: "oklch(0.34 0.050 290 / 0.65)",
                color: "oklch(0.90 0.012 290)",
              }}
            />
          </div>
        ))}

        {error && (
          <p className="rounded-xl px-3 py-2 text-sm text-err-text bg-err-bg">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`h-10 w-full rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 ${
            loading ? "bg-[oklch(0.45_0.18_310)]" : "bg-gradient-cta-alt shadow-cta"
          }`}
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>
    </AuthShell>
  );
}
