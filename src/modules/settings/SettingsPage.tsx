"use client";

import { Edit3, KeyRound, Save, ShieldCheck, Trash2, UserRoundCog, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { useSession } from "@/store/sessionStore";

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
  const { signOut } = useSession();
  const [settings, setSettings] = useState<SettingRecord[]>([]);
  const [wallet, setWallet] = useState<DepositWallet>(emptyWallet);
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [editingWalletKey, setEditingWalletKey] = useState<string | null>(null);
  const [deletingWalletKey, setDeletingWalletKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const depositWallets = settings
    .map(walletFromSetting)
    .filter((item): item is DepositWallet => Boolean(item));
  const otherSettings = settings.filter((setting) => !String(setting.key ?? "").startsWith("platform.deposit."));

  useEffect(() => {
    Promise.all([adminApi.settings(), adminApi.me()])
      .then(([nextSettings, admin]) => {
        setSettings(nextSettings);
        setProfile({
          name: String(admin.name ?? ""),
          email: String(admin.email ?? "")
        });
      })
      .catch((caught) => setMessage(caught instanceof Error ? caught.message : "Unable to load settings"));
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

  async function deleteWallet(nextWallet: DepositWallet) {
    const confirmed = window.confirm(`Delete "${nextWallet.name}"? Users will no longer see this deposit wallet.`);
    if (!confirmed) return;

    setDeletingWalletKey(nextWallet.key);
    setMessage(null);
    try {
      await adminApi.deleteSetting(nextWallet.key);
      if (editingWalletKey === nextWallet.key) {
        cancelWalletEdit();
      }
      setMessage("Deposit wallet deleted.");
      await reloadSettings();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to delete deposit wallet");
    } finally {
      setDeletingWalletKey(null);
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    try {
      const admin = await adminApi.updateMyProfile({
        name: profile.name.trim(),
        email: profile.email.trim()
      });
      setProfile({
        name: String(admin.name ?? profile.name),
        email: String(admin.email ?? profile.email)
      });
      setMessage("Admin profile updated.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to update admin profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.newPassword !== password.confirmPassword) {
      setMessage("New password and confirmation must match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await adminApi.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword
      });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Password changed. Please sign in again.");
      signOut();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to change password");
    } finally {
      setPasswordSaving(false);
    }
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
      <section className="grid gap-4 xl:grid-cols-2">
        <form className="panel p-5" onSubmit={saveProfile}>
          <div className="mb-4 flex items-center gap-2">
            <UserRoundCog size={18} className="text-brand" />
            <h2 className="text-lg font-semibold text-ink">Admin profile</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="label mb-2 block">Name</span>
              <input
                className="input"
                value={profile.name}
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label>
              <span className="label mb-2 block">Email</span>
              <input
                className="input"
                type="email"
                value={profile.email}
                onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>
          </div>
          <Button type="submit" className="mt-4" icon={<Save size={17} />} disabled={profileSaving}>
            {profileSaving ? "Saving..." : "Save profile"}
          </Button>
        </form>

        <form className="panel p-5" onSubmit={savePassword}>
          <div className="mb-4 flex items-center gap-2">
            <KeyRound size={18} className="text-brand" />
            <h2 className="text-lg font-semibold text-ink">Change password</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="label mb-2 block">Current password</span>
              <input
                className="input"
                type="password"
                value={password.currentPassword}
                onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))}
                required
              />
            </label>
            <label>
              <span className="label mb-2 block">New password</span>
              <input
                className="input"
                type="password"
                minLength={8}
                value={password.newPassword}
                onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))}
                required
              />
            </label>
            <label>
              <span className="label mb-2 block">Confirm password</span>
              <input
                className="input"
                type="password"
                minLength={8}
                value={password.confirmPassword}
                onChange={(event) => setPassword((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
              />
            </label>
          </div>
          <Button type="submit" className="mt-4" icon={<KeyRound size={17} />} disabled={passwordSaving}>
            {passwordSaving ? "Changing..." : "Change password"}
          </Button>
        </form>
      </section>
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
                  <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                    <Button variant="secondary" icon={<Edit3 size={16} />} onClick={() => editWallet(item)}>Edit</Button>
                    <Button
                      variant="danger"
                      icon={<Trash2 size={16} />}
                      onClick={() => void deleteWallet(item)}
                      disabled={deletingWalletKey === item.key}
                    >
                      {deletingWalletKey === item.key ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
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
