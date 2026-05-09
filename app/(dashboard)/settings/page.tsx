"use client";

import { useTranslations } from "next-intl";
import { getUser } from "@/lib/auth-client";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const user = getUser();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">{t("personalInfo")}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-700">{t("username")}</p>
              <p className="text-sm text-slate-500">{user?.username || "-"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-700">{t("email")}</p>
              <p className="text-sm text-slate-500">{user?.email || "-"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-700">{t("registeredAt")}</p>
              <p className="text-sm text-slate-500">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
