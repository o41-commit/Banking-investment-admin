"use client";

import { Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { SectionHeader } from "@/shared/components/SectionHeader";

export function SettingsPage() {
  const [settings, setSettings] = useState<Array<Record<string, unknown>>>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    adminApi.settings().then(setSettings).catch((caught) => setMessage(caught instanceof Error ? caught.message : "Unable to load settings"));
  }, []);

  async function saveSetting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await adminApi.saveSetting({
        key: String(form.get("key") ?? ""),
        value: String(form.get("value") ?? ""),
        encrypted: form.get("encrypted") === "on"
      });
      setMessage("Setting saved.");
      setSettings(await adminApi.settings());
      event.currentTarget.reset();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to save setting");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Settings" title="Site, wallets, APIs, maintenance, security, and Resend" actions={<Button icon={<Save size={17} />}>Save settings</Button>} />
      {message ? <p className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">{message}</p> : null}
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <form className="panel p-5" onSubmit={saveSetting}>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand" />
              <h2 className="text-lg font-semibold text-ink">Update setting</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="label mb-2 block">Key</span>
                <input className="input" name="key" placeholder="platform.deposit.USDT.TRC20" required />
              </label>
              <label>
                <span className="label mb-2 block">Encrypted</span>
                <label className="flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm text-slate-600">
                  <input type="checkbox" name="encrypted" />
                  Store encrypted
                </label>
              </label>
              <label className="md:col-span-2">
                <span className="label mb-2 block">Value</span>
                <textarea className="input min-h-24 py-3" name="value" placeholder="Configuration value" required />
              </label>
            </div>
            <Button type="submit" className="mt-4" icon={<Save size={17} />}>Save setting</Button>
          </form>
          <div className="panel overflow-hidden">
            <div className="border-b border-line p-4">
              <h2 className="text-lg font-semibold text-ink">Current settings</h2>
            </div>
            <div className="divide-y divide-line">
              {settings.map((setting) => (
                <div key={String(setting._id ?? setting.key)} className="grid gap-1 p-4">
                  <p className="font-semibold text-ink">{String(setting.key)}</p>
                  <p className="break-all text-sm text-slate-500">{setting.encrypted ? "Encrypted value" : String(setting.value)}</p>
                </div>
              ))}
              {settings.length === 0 ? <p className="p-4 text-sm text-slate-500">No settings saved yet.</p> : null}
            </div>
          </div>
      </section>
    </div>
  );
}
