"use client";

import { useEffect, useState } from "react";
import { MessageSquareReply, SendHorizontal } from "lucide-react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";
import type { StatusTone, SupportTicket } from "@/shared/types";
import { useSupportChat } from "@/hooks/useSupportChat";

const priorityTone: Record<SupportTicket["priority"], StatusTone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "danger"
};

export function SupportManagementPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const { connected, joining, error, typingUser, messages, sendMessage, setTyping } = useSupportChat(selected?.socketId ?? selected?.id ?? "");

  useEffect(() => {
    adminApi.tickets()
      .then((items) => {
        setTickets(items);
        setSelected(items[0] ?? null);
      })
      .catch((caught) => setLoadError(caught instanceof Error ? caught.message : "Unable to load tickets"));
  }, []);

  const columns: Column<SupportTicket>[] = [
    { key: "id", header: "Ticket", sortable: true },
    { key: "subject", header: "Subject", sortable: true },
    { key: "user", header: "User", sortable: true },
    { key: "priority", header: "Priority", render: (row) => <StatusBadge tone={priorityTone[row.priority]}>{row.priority}</StatusBadge> },
    { key: "status", header: "Status", render: (row) => <StatusBadge tone={row.status === "closed" ? "neutral" : "success"}>{row.status}</StatusBadge> },
    { key: "lastMessageAt", header: "Last message" }
  ];

  function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(message);
    setMessage("");
    setTyping(false);
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Support management" title="Tickets, replies, and chat queue" actions={<Button icon={<MessageSquareReply size={17} />}>Open chat console</Button>} />
      {loadError ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{loadError}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <DataTable
          rows={tickets}
          columns={columns}
          searchPlaceholder="Search tickets, users, status, priority"
          rowActions={(row) => (
            <Button variant="ghost" className="size-9 p-0" aria-label="Open live chat" onClick={() => setSelected(row)}>
              <MessageSquareReply size={16} />
            </Button>
          )}
        />

        <div className="panel flex min-h-[620px] flex-col overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-line p-4">
            <div>
              <p className="label mb-1">Live Socket.IO chat</p>
              <h2 className="text-lg font-semibold text-ink">{selected?.subject ?? "No ticket selected"}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {selected?.id ?? "No ticket"} · {joining ? "Joining room" : connected ? "Connected" : "Disconnected"}
              </p>
            </div>
            <StatusBadge tone={connected ? "success" : "warning"}>{connected ? "live" : "standby"}</StatusBadge>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((chat) => {
              const mine = chat.senderType === "admin";
              return (
                <div key={chat.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-md px-3 py-2 text-sm shadow-sm ${mine ? "bg-ink text-white" : "border border-line bg-white text-slate-700"}`}>
                    <p className={`text-[11px] font-semibold ${mine ? "text-white/60" : "text-slate-400"}`}>
                      {chat.senderName} · {chat.createdAt}
                    </p>
                    <p className="mt-1 leading-6">{chat.message}</p>
                  </div>
                </div>
              );
            })}
            {typingUser ? <p className="text-sm font-semibold text-brand">{typingUser}</p> : null}
            {error ? <p className="rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-700">{error}</p> : null}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-line p-4">
            <input
              className="input min-w-0 flex-1"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setTyping(Boolean(event.target.value));
              }}
              onBlur={() => setTyping(false)}
              placeholder="Reply to investor"
            />
            <Button type="submit" className="h-10 px-3" aria-label="Send live support message">
              <SendHorizontal size={16} />
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
