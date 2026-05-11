"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Home, BookOpen, Calendar, Mail, Settings, LogOut, TreePine, Menu, X } from "lucide-react";
import { isAuthenticated, getUser, logout } from "@/lib/auth-client";
import LanguageSwitcher from "@/components/language-switcher";

const navConfig = [
  { key: "home", href: "/", Icon: Home },
  { key: "diary", href: "/diary", Icon: BookOpen },
  { key: "calendar", href: "/calendar", Icon: Calendar },
  { key: "drift", href: "/drift", Icon: Mail },
  { key: "settings", href: "/settings", Icon: Settings },
] as const;

function SidebarNav({
  pathname,
  t,
  onNavigate,
}: {
  pathname: string;
  t: (key: string) => string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navConfig.map(({ key, href, Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-[oklch(0.22_0.070_290)] text-[oklch(0.85_0.22_290)]"
                : "text-[oklch(0.52_0.015_290)] hover:bg-[oklch(0.17_0.032_290)] hover:text-[oklch(0.85_0.015_290)]"
            }`}
          >
            <Icon className={`h-4.5 w-4.5 shrink-0 ${ isActive ? "text-[oklch(0.80_0.22_290)]" : "text-[oklch(0.44_0.018_290)]" }`} strokeWidth={1.8} />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarUser({ user, logoutLabel }: { user: ReturnType<typeof getUser>; logoutLabel: string }) {
  return (
    <div className="border-t border-[oklch(0.26_0.036_290/0.45)] p-4 space-y-3">
      <LanguageSwitcher />
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
          style={{background: "oklch(0.22 0.070 290)", color: "oklch(0.85 0.22 290)"}}>
          {user?.username?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium" style={{color: "oklch(0.80 0.015 290)"}}>{user?.username || "-"}</p>
          <p className="truncate text-xs" style={{color: "oklch(0.48 0.015 290)"}}>{user?.email || ""}</p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg p-1.5 transition-colors"
          style={{color: "oklch(0.46 0.015 290)"}}
          title={logoutLabel}
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = getUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setTimeout(() => setReady(true), 0);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen bg-[oklch(0.12_0.028_290)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-[oklch(0.28_0.038_290/0.45)] bg-[oklch(0.09_0.024_292)]">
        <div className="flex h-16 items-center gap-3 border-b border-[oklch(0.26_0.036_290/0.45)] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl shadow-md shadow-[oklch(0.10_0.040_290/0.60)]"
            style={{background: "linear-gradient(135deg, oklch(0.70 0.24 290), oklch(0.68 0.24 330))"}}>
            <TreePine className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-widest" style={{color: "oklch(0.82 0.018 290)"}}>心 洞</span>
        </div>
        <SidebarNav pathname={pathname} t={t} />
        <SidebarUser user={user} logoutLabel={t("logout")} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={closeSidebar}>
          <div className="absolute inset-0 bg-[oklch(0.06_0.028_290/0.80)] backdrop-blur-sm" />
        </div>
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 flex-col border-r border-[oklch(0.26_0.036_290/0.45)] bg-[oklch(0.09_0.024_292)] transition-transform duration-200 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ display: sidebarOpen ? "flex" : "none" }}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-[oklch(0.26_0.036_290/0.45)]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{background: "linear-gradient(135deg, oklch(0.70 0.24 290), oklch(0.68 0.24 330))"}}>
              <TreePine className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-widest" style={{color: "oklch(0.82 0.018 290)"}}>心 洞</span>
          </div>
          <button onClick={closeSidebar} className="transition-colors" style={{color: "oklch(0.48 0.015 290)"}}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav pathname={pathname} t={t} onNavigate={closeSidebar} />
        <SidebarUser user={user} logoutLabel={t("logout")} />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center gap-3 border-b border-[oklch(0.26_0.036_290/0.45)] bg-[oklch(0.09_0.024_292)] px-4 h-14 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="transition-colors" style={{color: "oklch(0.55 0.015 290)"}}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold tracking-widest" style={{color: "oklch(0.82 0.018 290)"}}>心 洞</span>
        </div>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
