"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  ChartCandlestick,
  Gauge,
  HandCoins,
  Headphones,
  Layers3,
  LockKeyhole,
  LogOut,
  Menu,
  PieChart,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserRoundCog,
  Users,
  Wallet,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn, initials } from "@/shared/lib/utils";
import { SessionProvider, useSession } from "@/store/sessionStore";
import { Button } from "@/shared/components/Button";
import { useRealtime } from "@/hooks/useRealtime";
import { adminApi } from "@/services/adminApi";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Gauge },
  { href: "/users", label: "Users", icon: Users },
  { href: "/plans", label: "Investment Plans", icon: Layers3 },
  { href: "/deposits", label: "Deposits", icon: Wallet },
  { href: "/withdrawals", label: "Withdrawals", icon: HandCoins },
  { href: "/referrals", label: "Referrals", icon: ReceiptText },
  { href: "/support", label: "Support", icon: Headphones },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/analytics", label: "Analytics", icon: PieChart },
  { href: "/security", label: "Security", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings }
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const realtime = useRealtime();
  const { session, signOut } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!session) router.replace("/login");
  }, [router, session]);

  function handleSignOut() {
    adminApi.logout().catch(() => undefined);
    signOut();
    router.push("/login");
  }

  if (!session) {
    return <div className="grid min-h-screen place-items-center text-sm font-semibold text-slate-500">Checking admin session...</div>;
  }

  const sidebar = (
    <aside className="flex h-full flex-col bg-ink text-white">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="grid size-10 place-items-center rounded-md bg-brand text-sm font-bold">MS</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Mobile Saving Bank</p>
          <p className="truncate text-xs text-white/55">Crypto Operations</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white",
                active && "bg-white text-ink hover:bg-white hover:text-ink"
              )}
            >
              <Icon size={18} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="rounded-md bg-white/8 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity size={16} className={realtime.connected ? "text-emerald-300" : "text-amber-300"} />
            {realtime.connected ? "Live connected" : "Realtime standby"}
          </div>
          <p className="mt-2 text-xs text-white/60">{realtime.lastEvent}</p>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <div className="hidden lg:block">{sidebar}</div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-ink/40"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="relative h-full w-[280px]"
          >
            {sidebar}
          </motion.div>
        </div>
      ) : null}

      <main className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/85 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="size-10 p-0 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu size={20} />
            </Button>
            <div>
              <p className="text-sm font-semibold text-ink">Admin Control Center</p>
              <p className="text-xs text-slate-500">{realtime.activeUsers} live users · {realtime.pendingApprovals} approvals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="size-10 p-0" aria-label="Security console">
              <LockKeyhole size={18} />
            </Button>
            <Button variant="ghost" className="size-10 p-0" aria-label="Admin tools">
              <UserRoundCog size={18} />
            </Button>
            <div className="hidden items-center gap-3 rounded-md border border-line bg-white px-2 py-1.5 shadow-sm sm:flex">
              <div className="grid size-8 place-items-center rounded-md bg-graphite text-xs font-semibold text-white">
                {initials(session.role)}
              </div>
              <div>
                <p className="text-xs font-semibold text-ink">{session.role.replace("_", " ")}</p>
                <p className="text-[11px] text-slate-500">Authenticated</p>
              </div>
            </div>
            <Button variant="ghost" className="size-10 p-0" onClick={handleSignOut} aria-label="Sign out">
              <LogOut size={18} />
            </Button>
            <Button variant="ghost" className="size-10 p-0 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
              <X size={18} />
            </Button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
