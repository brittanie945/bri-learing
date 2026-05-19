"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { AuthShell } from "@/components/auth/auth-shell";
import { login } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  login: z.string().min(1, "请输入用户名或邮箱"),
  password: z.string().min(6, "密码至少 6 位"),
});

type LoginForm = z.infer<typeof loginSchema>;
type FieldErrors = Partial<Record<keyof LoginForm, string>>;

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>({ login: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errs: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof LoginForm;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

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
    <AuthShell
      footer={(
        <p className="text-center text-xs" style={{ color: "oklch(0.48 0.015 290)" }}>
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium transition-colors" style={{ color: "oklch(0.76 0.22 290)" }}>
            {t("register")}
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium tracking-wide" style={{ color: "oklch(0.58 0.015 290)" }}>
            {t("loginField")}
          </label>
          <Input
            id="login"
            placeholder={t("loginPlaceholder")}
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
            className="h-10 text-sm"
            style={{
              background: "oklch(0.20 0.035 290)",
              borderColor: fieldErrors.login ? "oklch(0.65 0.20 15)" : "oklch(0.34 0.050 290 / 0.65)",
              color: "oklch(0.90 0.012 290)",
            }}
          />
          {fieldErrors.login && (
            <p className="text-xs" style={{ color: "oklch(0.72 0.18 15)" }}>
              {fieldErrors.login}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium tracking-wide" style={{ color: "oklch(0.58 0.015 290)" }}>
            {t("password")}
          </label>
          <Input
            id="password"
            type="password"
            placeholder={t("passwordPlaceholder")}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="h-10 text-sm"
            style={{
              background: "oklch(0.20 0.035 290)",
              borderColor: fieldErrors.password ? "oklch(0.65 0.20 15)" : "oklch(0.34 0.050 290 / 0.65)",
              color: "oklch(0.90 0.012 290)",
            }}
          />
          {fieldErrors.password && (
            <p className="text-xs" style={{ color: "oklch(0.72 0.18 15)" }}>
              {fieldErrors.password}
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-xl px-3 py-2 text-sm" style={{ color: "oklch(0.80 0.20 15)", background: "oklch(0.20 0.045 15)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 h-10 w-full rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
          style={{
            background: loading
              ? "oklch(0.45 0.18 290)"
              : "linear-gradient(135deg, oklch(0.68 0.24 290), oklch(0.65 0.24 330))",
            color: "white",
            boxShadow: loading ? "none" : "0 4px 20px oklch(0.40 0.28 300 / 0.50)",
          }}
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>
    </AuthShell>
  );
}
