"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "@/store/sessionStore";

type ChatMessage = {
  id: string;
  ticketId: string;
  senderType: "user" | "admin";
  senderName: string;
  message: string;
  createdAt: string;
};

function getToken(session: ReturnType<typeof useSession>["session"]) {
  if (session?.accessToken) return session.accessToken;
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem("admin-access-token") ?? window.localStorage.getItem("accessToken") ?? undefined;
}

export function useSupportChat(ticketId?: string) {
  const { session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!ticketId) return undefined;
    setMessages([]);
    setTypingUser("");
    setConnected(false);
    setError("");

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) {
      setError("NEXT_PUBLIC_SOCKET_URL is not configured.");
      return undefined;
    }

    const socket = io(socketUrl, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token: getToken(session) }
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setJoining(true);
      setError("");
      setConnected(true);
      socket.emit("support:join", { ticketId }, (response: { ok: boolean; error?: string }) => {
        setJoining(false);
        if (!response?.ok) setError(response?.error ?? "Unable to join support room.");
      });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("support:message", (message: ChatMessage) => {
      if (message.ticketId !== ticketId) return;
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) return current;
        return [
          ...current,
          {
            ...message,
            senderName: message.senderType === "admin" ? "Support Admin" : "Investor",
            createdAt: new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ];
      });
    });

    socket.on("support:typing", (payload: { ticketId: string; typing: boolean; sender?: { senderType: "user" | "admin" } }) => {
      if (payload.ticketId !== ticketId || payload.sender?.senderType === "admin") return;
      setTypingUser(payload.typing ? "Investor is typing..." : "");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, ticketId]);

  const sendMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || !ticketId) return;
      if (!socketRef.current?.connected) {
        setError("Live chat is not connected.");
        return;
      }

      socketRef.current.emit("support:message", { ticketId, message: trimmed }, (response: { ok: boolean; error?: string }) => {
        if (!response?.ok) setError(response?.error ?? "Unable to send message.");
        else setError("");
      });
    },
    [ticketId]
  );

  const setTyping = useCallback(
    (typing: boolean) => {
      if (!ticketId) return;
      socketRef.current?.emit("support:typing", { ticketId, typing });
    },
    [ticketId]
  );

  return { connected, joining, error, typingUser, messages, sendMessage, setTyping };
}
