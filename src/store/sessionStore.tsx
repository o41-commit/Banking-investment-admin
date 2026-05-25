"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { AdminSession } from "@/shared/types";

type SessionContextValue = {
  session: AdminSession | null;
  signIn: (session: AdminSession) => void;
  signOut: () => void;
  hasPermission: (permission: string) => boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("admin-session");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AdminSession;
      if (new Date(parsed.expiresAt).getTime() > Date.now()) return parsed;
      window.localStorage.removeItem("admin-session");
      return null;
    } catch {
      window.localStorage.removeItem("admin-session");
      return null;
    }
  });

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      signIn(nextSession) {
        setSession(nextSession);
        window.localStorage.setItem("admin-session", JSON.stringify(nextSession));
      },
      signOut() {
        setSession(null);
        window.localStorage.removeItem("admin-session");
      },
      hasPermission(permission) {
        return session?.role === "super_admin" || Boolean(session?.permissions.includes(permission as never));
      }
    }),
    [session]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
