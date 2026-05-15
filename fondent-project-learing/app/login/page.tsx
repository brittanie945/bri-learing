"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TreePine } from "lucide-react";
import { z } from "zod";
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{background: "oklch(0.10 0.030 290)"}}>
      {/* 星云光晕 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-125 w-125 rounded-full opacity-40"
          style={{background: "radial-gradient(circle, oklch(0.45 0.28 290), transparent 70%)"}} />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full opacity-30"
          style={{background: "radial-gradient(circle, oklch(0.40 0.26 330), transparent 70%)"}} />
        <div className="absolute top-1/2 left-0 h-64 w-64 rounded-full opacity-20"
          style={{background: "radial-gradient(circle, oklch(0.42 0.22 256), transparent 70%)"}} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* 品牌 */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-4"
            style={{background: "linear-gradient(135deg, oklch(0.70 0.24 290), oklch(0.68 0.24 330))", boxShadow: "0 0 24px oklch(0.50 0.28 290 / 0.60)"}}>
            <TreePine className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold" style={{color: "oklch(0.93 0.010 290)"}}>{t("title")}</h1>
          <p className="mt-1 text-sm" style={{color: "oklch(0.52 0.015 290)"}}>{t("subtitle")}</p>
        </div>

        {/* 表单卡片 */}
        <div className="rounded-2xl p-6 space-y-5" style={{
          background: "oklch(0.16 0.030 290)",
          border: "1px solid oklch(0.32 0.050 290 / 0.55)",
          boxShadow: "0 20px 50px oklch(0.05 0.030 290 / 0.70), inset 0 1px 0 oklch(0.40 0.060 290 / 0.15)"
        }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium tracking-wide" style={{color: "oklch(0.58 0.015 290)"}}>
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
                  color: "oklch(0.90 0.012 290)"
                }}
              />
              {fieldErrors.login && (
                <p className="text-xs" style={{color: "oklch(0.72 0.18 15)"}}>{fieldErrors.login}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium tracking-wide" style={{color: "oklch(0.58 0.015 290)"}}>
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
                  color: "oklch(0.90 0.012 290)"
                }}
              />
              {fieldErrors.password && (
                <p className="text-xs" style={{color: "oklch(0.72 0.18 15)"}}>{fieldErrors.password}</p>
              )}
            </div>

            {error && (
              <p className="text-sm rounded-xl px-3 py-2" style={{color: "oklch(0.80 0.20 15)", background: "oklch(0.20 0.045 15)"}}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 mt-1"
              style={{
                background: loading
                  ? "oklch(0.45 0.18 290)"
                  : "linear-gradient(135deg, oklch(0.68 0.24 290), oklch(0.65 0.24 330))",
                color: "white",
                boxShadow: loading ? "none" : "0 4px 20px oklch(0.40 0.28 300 / 0.50)"
              }}
            >
              {loading ? t("submitting") : t("submit")}
            </button>
          </form>

          <p className="text-center text-xs pt-1" style={{color: "oklch(0.48 0.015 290)"}}>
            {t("noAccount")}{" "}
            <Link href="/register" className="font-medium transition-colors" style={{color: "oklch(0.76 0.22 290)"}}>
              {t("register")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
