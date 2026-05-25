"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

type RealtimeState = {
  connected: boolean;
  activeUsers: number;
  pendingApprovals: number;
  lastEvent: string;
};

export function useRealtime() {
  const [state, setState] = useState<RealtimeState>({
    connected: false,
    activeUsers: 248,
    pendingApprovals: 18,
    lastEvent: "Waiting for live stream"
  });

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) return;

    const socket: Socket = io(socketUrl, {
      transports: ["websocket"],
      withCredentials: true
    });

    socket.on("connect", () => setState((current) => ({ ...current, connected: true, lastEvent: "Live stream connected" })));
    socket.on("disconnect", () => setState((current) => ({ ...current, connected: false, lastEvent: "Live stream disconnected" })));
    socket.on("admin:stats", (payload: Partial<RealtimeState>) => {
      setState((current) => ({ ...current, ...payload, lastEvent: "Live admin statistics updated" }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return state;
}
