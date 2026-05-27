"use client";

import { BellRing, Loader2, Mail, Megaphone, SendHorizontal, Smartphone } from "lucide-react";
import { useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";

export function NotificationCenterPage() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [delivery, setDelivery] = useState<{ audience: string; delivered: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function broadcast(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const channel = String(form.get("channel") ?? "in_app");
    setSending(true);
    setSent(false);
    setDelivery(null);
    setError(null);

    try {
      const result = await adminApi.broadcast({
        audience: String(form.get("audience") ?? "all"),
        channels: channel === "all" ? ["in_app", "email"] : [channel],
        title: String(form.get("title") ?? ""),
        message: String(form.get("message") ?? "")
      });
      setDelivery(result);
      setSent(true);
      formElement.reset();
    } catch (caught) {
      setSent(false);
      setError(caught instanceof Error ? caught.message : "Unable to broadcast message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Notification system" title="Email, in-app, push, and broadcast messaging" />
      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <form className="panel p-5" onSubmit={broadcast}>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="label mb-2 block">Audience</span>
              <select className="input" name="audience" defaultValue="all">
                <option value="all">All users</option>
                <option value="active">Active users</option>
                <option value="pending">Pending users</option>
                <option value="pending-kyc">Pending KYC users</option>
              </select>
            </label>
            <label>
              <span className="label mb-2 block">Delivery channels</span>
              <select className="input" name="channel" defaultValue="all">
                <option value="all">Email and in-app</option>
                <option value="email">Email only</option>
                <option value="in_app">In-app only</option>
              </select>
            </label>
          </div>
          <label className="mt-4 block">
            <span className="label mb-2 block">Subject</span>
            <input className="input" name="title" required placeholder="Maintenance window, payout update, plan announcement" />
          </label>
          <label className="mt-4 block">
            <span className="label mb-2 block">Message</span>
            <textarea className="input min-h-40 py-3" name="message" required placeholder="Write announcement" />
          </label>
          <Button
            type="submit"
            className="mt-4"
            disabled={sending}
            icon={sending ? <Loader2 size={17} className="animate-spin" /> : <SendHorizontal size={17} />}
          >
            {sending ? "Sending..." : "Broadcast message"}
          </Button>
          {sent ? (
            <p className="mt-3 text-sm font-medium text-positive">
              Broadcast delivered to {delivery?.delivered.toLocaleString() ?? 0} user{delivery?.delivered === 1 ? "" : "s"}.
            </p>
          ) : null}
          {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
        </form>
        <aside className="space-y-3">
          {[
            { icon: Mail, label: "Email notifications", value: "Resend configured", tone: "success" as const },
            { icon: Smartphone, label: "Push announcements", value: "Not configured", tone: "neutral" as const },
            { icon: BellRing, label: "Realtime events", value: "Socket.IO", tone: "success" as const },
            { icon: Megaphone, label: "Broadcast queue", value: "BullMQ", tone: "warning" as const }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="panel flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-md bg-ink text-white"><Icon size={17} /></div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.value}</p>
                  </div>
                </div>
                <StatusBadge tone={item.tone}>ready</StatusBadge>
              </div>
            );
          })}
        </aside>
      </section>
    </div>
  );
}
