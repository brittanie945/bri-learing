"use client";

import { Fragment, Suspense, useCallback, useEffect, useState, startTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Home, BookOpen, Calendar, Mail, LogOut, TreePine, Menu, X, MessageSquare, ShoppingBag, Coins, Archive, ChevronDown, Plus } from "lucide-react";
import { isAuthenticated, getUser, logout } from "@/lib/auth-client";
import LanguageSwitcher from "@/components/language-switcher";
import { coinsApi } from "@/lib/api/coins";
import { chatApi, type ChatSession } from "@/lib/api/chat";

// ── 对话列表子面板 ──
function ChatSubPanel({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSid = pathname.startsWith("/chat/") ? pathname.slice(6) : null;
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await chatApi.listSessions();
      setSessions(list);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { startTransition(() => { void load(); }); }, [load]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener("chat-sessions-updated", h);
    return () => window.removeEventListener("chat-sessions-updated", h);
  }, [load]);

  function switchSession(sid: string) {
    router.push(`/chat/${sid}`);
    onNavigate?.();
  }

  function newSession() {
    router.push("/chat");
    window.dispatchEvent(new Event("chat-new-session"));
    onNavigate?.();
  }

  return (
    <div className="mx-1 mb-1 rounded-xl overflow-hidden bg-[oklch(0.12_0.025_290/0.60)]">
      {/* header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors hover:bg-[oklch(0.17_0.032_290)] text-pu-very-dim"
      >
        <span>历史对话</span>
        <ChevronDown
          className="h-3 w-3 transition-transform duration-200"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        />
      </button>

      {!collapsed && (
        <>
          {/* + 新对话 */}
          <div className="px-2 pb-1.5">
            <button
              onClick={newSession}
              className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all hover:scale-[1.01] bg-[oklch(0.20_0.055_290/0.70)] text-pu-new-chat"
            >
              <Plus className="h-3 w-3" />
              新对话
            </button>
          </div>

          {/* 会话列表 */}
          <div className="max-h-52 overflow-y-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {sessions.length === 0 && (
              <p className="text-center text-[10px] py-3 px-3 text-pu-ghost">
                暂无对话
              </p>
            )}
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => switchSession(s.id)}
                className={`group relative w-full text-left px-3 py-2 flex items-center gap-2 transition-colors rounded-lg ${
                  currentSid === s.id
                    ? "bg-[oklch(0.20_0.050_290)] text-[oklch(0.82_0.015_290)]"
                    : "text-[oklch(0.48_0.012_290)]"
                }`}
              >
                <MessageSquare className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                <span className="text-[11px] truncate flex-1">{s.title}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const navConfig = [
  { key: "home", href: "/", Icon: Home },
  { key: "chat", href: "/chat", Icon: MessageSquare },
  { key: "diary", href: "/diary", Icon: BookOpen },
  { key: "calendar", href: "/calendar", Icon: Calendar },
  { key: "drift", href: "/drift", Icon: Mail },
  { key: "seeds", href: "/seeds", Icon: TreePine },
  { key: "shop", href: "/shop", Icon: ShoppingBag },
  { key: "settings", href: "/settings", Icon: Archive },
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
  const isChatPage = pathname === "/chat" || pathname.startsWith("/chat/");
  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="space-y-0.5">
        {navConfig.map(({ key, href, Icon }) => {
          const isActive = key === "chat" ? pathname === href || pathname.startsWith("/chat/") : pathname === href;
          return (
            <Fragment key={href}>
              <Link
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
              {key === "chat" && isChatPage && (
                <Suspense fallback={null}>
                  <ChatSubPanel onNavigate={onNavigate} />
                </Suspense>
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}

function SidebarUser({ user, logoutLabel, coinBalance }: { user: ReturnType<typeof getUser>; logoutLabel: string; coinBalance: number }) {
  return (
    <div className="border-t border-[oklch(0.26_0.036_290/0.45)] p-4 space-y-3">
      <Link href="/shop" className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-[oklch(0.17_0.032_290)]">
        <Coins className="h-4 w-4 shrink-0 text-amber" strokeWidth={1.8} />
        <span className="text-sm font-semibold text-amber">{coinBalance}</span>
        <span className="text-xs text-pu-dim">时光币</span>
      </Link>
      <LanguageSwitcher />
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold bg-pu-pill text-pu-active">
          {user?.username?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-pu-username">{user?.username || "-"}</p>
          <p className="truncate text-xs text-pu-dim">{user?.email || ""}</p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg p-1.5 transition-colors text-[oklch(0.46_0.015_290)]"
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
  const [coinBalance, setCoinBalance] = useState(0);
  const user = getUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setTimeout(() => setReady(true), 0);
      coinsApi.getBalance().then(r => setCoinBalance(r.balance)).catch(() => {});
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
          <div className="flex h-8 w-8 items-center justify-center rounded-xl shadow-md shadow-[oklch(0.10_0.040_290/0.60)] bg-gradient-logo">
            <TreePine className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-widest text-pu-app-title">心 洞</span>
        </div>
        <SidebarNav pathname={pathname} t={t} />
        <SidebarUser user={user} logoutLabel={t("logout")} coinBalance={coinBalance} />
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
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-logo">
              <TreePine className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-widest text-pu-app-title">心 洞</span>
          </div>
          <button onClick={closeSidebar} className="transition-colors text-pu-dim">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav pathname={pathname} t={t} onNavigate={closeSidebar} />
        <SidebarUser user={user} logoutLabel={t("logout")} coinBalance={coinBalance} />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center gap-3 border-b border-[oklch(0.26_0.036_290/0.45)] bg-[oklch(0.09_0.024_292)] px-4 h-14 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="transition-colors text-pu-muted">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold tracking-widest text-pu-app-title">心 洞</span>
        </div>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
