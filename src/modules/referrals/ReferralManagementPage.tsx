"use client";

import { HandCoins, Save, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { MetricCard } from "@/shared/components/MetricCard";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatCurrency } from "@/shared/lib/utils";
import type { ReferralRow } from "@/shared/types";

const referralRewardKey = "platform.referral.rewardAmount";
const defaultReferralReward = 5;

type SettingRecord = {
  key?: unknown;
  value?: unknown;
};

function readSettingValue(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function rewardFromSettings(settings: SettingRecord[]) {
  const setting = settings.find((item) => String(item.key ?? "") === referralRewardKey);
  const amount = Number(readSettingValue(setting?.value));
  return Number.isFinite(amount) && amount >= 0 ? amount : defaultReferralReward;
}

export function ReferralManagementPage() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [rewardAmount, setRewardAmount] = useState(String(defaultReferralReward));
  const [savingReward, setSavingReward] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stats = useMemo(() => {
    const pending = referrals.filter((item) => item.status === "pending").reduce((total, item) => total + item.commission, 0);
    const paid = referrals.filter((item) => item.status === "paid").reduce((total, item) => total + item.commission, 0);
    const referrers = new Set(referrals.map((item) => item.referrer)).size;
    return { pending, paid, referrers };
  }, [referrals]);

  useEffect(() => {
    Promise.all([adminApi.referrals(), adminApi.settings()])
      .then(([nextReferrals, settings]) => {
        setReferrals(nextReferrals);
        setRewardAmount(String(rewardFromSettings(settings)));
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load referrals"));
  }, []);

  async function saveReferralReward(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(rewardAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid referral reward amount.");
      return;
    }

    setSavingReward(true);
    setError(null);
    setMessage(null);
    try {
      await adminApi.saveSetting({ key: referralRewardKey, value: amount });
      setRewardAmount(String(amount));
      setMessage("Referral reward updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save referral reward");
    } finally {
      setSavingReward(false);
    }
  }

  const columns: Column<ReferralRow>[] = [
    { key: "id", header: "Referral ID", sortable: true },
    { key: "referrer", header: "Referrer", sortable: true },
    { key: "referred", header: "Referred user", sortable: true },
    { key: "tier", header: "Tier", render: (row) => `Tier ${row.tier}` },
    { key: "commission", header: "Reward", sortable: true, render: (row) => formatCurrency(row.commission) },
    { key: "status", header: "Status", render: (row) => <StatusBadge tone={row.status === "paid" ? "success" : "warning"}>{row.status}</StatusBadge> },
    { key: "createdAt", header: "Created" }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Referral management"
        title="Fixed rewards, analytics, and payout history"
      />
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      <form className="panel grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-end" onSubmit={saveReferralReward}>
        <label>
          <span className="label mb-2 block">Referral reward amount</span>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={rewardAmount}
            onChange={(event) => setRewardAmount(event.target.value)}
            required
          />
        </label>
        <Button type="submit" icon={<Save size={17} />} disabled={savingReward}>
          {savingReward ? "Saving..." : "Save reward"}
        </Button>
      </form>
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Paid Rewards" value={stats.paid} change={0} currency="USD" icon={<TrendingUp size={18} />} />
        <MetricCard label="Pending Rewards" value={stats.pending} change={0} currency="USD" icon={<HandCoins size={18} />} />
        <MetricCard label="Active Referrers" value={stats.referrers} change={0} icon={<TrendingUp size={18} />} />
      </section>
      <DataTable rows={referrals} columns={columns} searchPlaceholder="Search referrals and payouts" />
    </div>
  );
}
