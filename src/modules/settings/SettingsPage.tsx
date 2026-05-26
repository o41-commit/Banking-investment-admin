"use client";

import { Edit3, Save, ShieldCheck, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { SectionHeader } from "@/shared/components/SectionHeader";

type SettingRecord = {
  _id?: string;
  key?: string;
  value?: unknown;
  encrypted?: boolean;
};

type DepositWallet = {
  key: string;
  asset: string;
  network: string;
  name: string;
  address: string;
};

const bitcoinAsset = "BTC";
const bitcoinNetwork = "Bitcoin";
const bitcoinDepositKey = `platform.deposit.${bitcoinAsset}.${bitcoinNetwork}`;
const emptyWallet: DepositWallet = {
  key: "",
  asset: bitcoinAsset,
  network: bitcoinNetwork,
  name: "",
  address: ""
};

function readValue(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function walletFromSetting(setting: SettingRecord): DepositWallet | null {
  const key = String(setting.key ?? "");
  if (!key.startsWith("platform.deposit.")) return null;

  const [, , asset = bitcoinAsset, network = bitcoinNetwork] = key.split(".");
  const value = readValue(setting.value);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const wallet = {
      key,
      asset: String(record.asset ?? asset),
      network: String(record.network ?? network),
      name: String(record.name ?? `${asset} ${network}`.trim()),
      address: String(record.address ?? "")
    };
    return wallet.asset === bitcoinAsset && wallet.network.trim().toLowerCase() === bitcoinNetwork.toLowerCase()
      ? { ...wallet, asset: bitcoinAsset, network: bitcoinNetwork }
      : null;
  }

  const wallet = {
    key,
    asset,
    network,
    name: `${asset} ${network}`.trim(),
    address: typeof value === "string" ? value : ""
  };
  return wallet.asset === bitcoinAsset && wallet.network.trim().toLowerCase() === bitcoinNetwork.toLowerCase()
    ? { ...wallet, asset: bitcoinAsset, network: bitcoinNetwork }
    : null;
}

function walletKey() {
  return bitcoinDepositKey;
}

function displayValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "");
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingRecord[]>([]);
  const [wallet, setWallet] = useState<DepositWallet>(emptyWallet);
  const [editingWalletKey, setEditingWalletKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const depositWallets = settings
    .map(walletFromSetting)
    .filter((item): item is DepositWallet => Boolean(item));
  const otherSettings = settings.filter((setting) => !String(setting.key ?? "").startsWith("platform.deposit."));

  useEffect(() => {
    adminApi.settings().then(setSettings).catch((caught) => setMessage(caught instanceof Error ? caught.message : "Unable to load settings"));
  }, []);

  async function reloadSettings() {
    setSettings(await adminApi.settings());
  }

  async function saveDepositWallet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = editingWalletKey ?? walletKey();
    try {
      await adminApi.saveSetting({
        key,
        value: {
          name: wallet.name.trim() || `${bitcoinAsset} ${bitcoinNetwork}`,
          asset: bitcoinAsset,
          network: bitcoinNetwork,
          address: wallet.address.trim()
        }
      });
      setMessage(editingWalletKey ? "Deposit wallet updated." : "Deposit wallet saved.");
      setWallet(emptyWallet);
      setEditingWalletKey(null);
      await reloadSettings();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to save deposit wallet");
    }
  }

  function editWallet(nextWallet: DepositWallet) {
    setWallet(nextWallet);
    setEditingWalletKey(nextWallet.key);
    setMessage(null);
  }

  function cancelWalletEdit() {
    setWallet(emptyWallet);
    setEditingWalletKey(null);
  }

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
      await reloadSettings();
      event.currentTarget.reset();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to save setting");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Settings" title="Site, wallets, APIs, maintenance, security, and Resend" />
      {message ? <p className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">{message}</p> : null}
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <form className="panel p-5" onSubmit={saveDepositWallet}>
            <div className="mb-4 flex items-center gap-2">
              <WalletCards size={18} className="text-brand" />
              <h2 className="text-lg font-semibold text-ink">{editingWalletKey ? "Edit deposit wallet" : "Add deposit wallet"}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="label mb-2 block">Wallet name</span>
                <input
                  className="input"
                  value={wallet.name}
                  onChange={(event) => setWallet((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Main Bitcoin wallet"
                />
              </label>
              <label>
                <span className="label mb-2 block">Asset</span>
                <select
                  className="input"
                  value={bitcoinAsset}
                  disabled
                  onChange={() => undefined}
                >
                  <option>{bitcoinAsset}</option>
                </select>
              </label>
              <label>
                <span className="label mb-2 block">Network</span>
                <input
                  className="input"
                  value={bitcoinNetwork}
                  readOnly
                  placeholder={bitcoinNetwork}
                  required
                />
              </label>
              <label>
                <span className="label mb-2 block">Wallet address</span>
                <input
                  className="input"
                  value={wallet.address}
                  onChange={(event) => setWallet((current) => ({ ...current, address: event.target.value }))}
                  placeholder="Paste wallet address"
                  required
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="submit" icon={<Save size={17} />}>{editingWalletKey ? "Update wallet" : "Save wallet"}</Button>
              {editingWalletKey ? (
                <Button variant="secondary" icon={<X size={16} />} onClick={cancelWalletEdit}>Cancel edit</Button>
              ) : null}
            </div>
          </form>
          <div className="panel overflow-hidden">
            <div className="border-b border-line p-4">
              <h2 className="text-lg font-semibold text-ink">Deposit wallets</h2>
            </div>
            <div className="divide-y divide-line">
              {depositWallets.map((item) => (
                <div key={item.key} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-ink">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.asset} on {item.network}</p>
                    <p className="mt-2 break-all font-mono text-sm text-slate-600">{item.address || "No address saved"}</p>
                  </div>
                  <Button variant="secondary" icon={<Edit3 size={16} />} onClick={() => editWallet(item)}>Edit</Button>
                </div>
              ))}
              {depositWallets.length === 0 ? <p className="p-4 text-sm text-slate-500">No deposit wallets saved yet.</p> : null}
            </div>
          </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <form className="panel p-5" onSubmit={saveSetting}>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand" />
              <h2 className="text-lg font-semibold text-ink">Advanced setting</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="label mb-2 block">Key</span>
                <input className="input" name="key" placeholder={bitcoinDepositKey} required />
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
              <h2 className="text-lg font-semibold text-ink">Other settings</h2>
            </div>
            <div className="divide-y divide-line">
              {otherSettings.map((setting) => (
                <div key={String(setting._id ?? setting.key)} className="grid gap-1 p-4">
                  <p className="font-semibold text-ink">{String(setting.key)}</p>
                  <p className="break-all text-sm text-slate-500">{setting.encrypted ? "Encrypted value" : displayValue(setting.value)}</p>
                </div>
              ))}
              {otherSettings.length === 0 ? <p className="p-4 text-sm text-slate-500">No other settings saved yet.</p> : null}
            </div>
          </div>
      </section>
    </div>
  );
}
