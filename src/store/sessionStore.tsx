"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AdminSession } from "@/shared/types";

type SessionContextValue = {
  session: AdminSession | null;
  signIn: (session: AdminSession) => void;
  signOut: () => void;
  hasPermission: (permission: string) => boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const adminSessionKey = "admin-session";
const adminSessionUpdatedEvent = "admin-session-updated";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(adminSessionKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AdminSession;
      if (new Date(parsed.expiresAt).getTime() > Date.now()) return parsed;
      window.localStorage.removeItem(adminSessionKey);
      return null;
    } catch {
      window.localStorage.removeItem(adminSessionKey);
      return null;
    }
  });

  useEffect(() => {
    const handleSessionUpdate = (event: Event) => {
      const nextSession = (event as CustomEvent<AdminSession | null>).detail;
      setSession(nextSession ?? null);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== adminSessionKey) return;
      setSession(event.newValue ? JSON.parse(event.newValue) as AdminSession : null);
    };

    window.addEventListener(adminSessionUpdatedEvent, handleSessionUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(adminSessionUpdatedEvent, handleSessionUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      signIn(nextSession) {
        setSession(nextSession);
        window.localStorage.setItem(adminSessionKey, JSON.stringify(nextSession));
      },
      signOut() {
        setSession(null);
        window.localStorage.removeItem(adminSessionKey);
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
