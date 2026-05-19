"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface AuthShellProps {
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ children, footer }: AuthShellProps) {
  const common = useTranslations("common");
  const brand = useTranslations("authBrand");

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 bg-auth-bg">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/3 rounded-full opacity-40 auth-glow-top" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full opacity-25 auth-glow-bottom" />
        <div className="absolute right-0 top-1/4 h-72 w-72 rounded-full opacity-20 auth-glow-right" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
        <section className="w-full rounded-[2rem] p-6 md:p-8 auth-card">
          <div className="mb-6 flex flex-col items-center text-center">
            <Image
              src="/LOGO.svg"
              alt={common("appName")}
              width={96}
              height={96}
              className="rounded-[2rem]"
              priority
            />
            <p className="mt-4 text-[0.65rem] uppercase tracking-[0.35em] text-auth-badge">
              {brand("badge")}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-auth-title">
              {common("appName")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-auth-muted">
              {brand("storyValue")}
            </p>
          </div>

          {children}
          <div className="mt-6">{footer}</div>
        </section>
      </div>
    </div>
  );
}