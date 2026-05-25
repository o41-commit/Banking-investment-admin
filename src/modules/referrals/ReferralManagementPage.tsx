"use client";

import { HandCoins, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { MetricCard } from "@/shared/components/MetricCard";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatCurrency } from "@/shared/lib/utils";
import type { ReferralRow } from "@/shared/types";

export function ReferralManagementPage() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stats = useMemo(() => {
    const pending = referrals.filter((item) => item.status === "pending").reduce((total, item) => total + item.commission, 0);
    const paid = referrals.filter((item) => item.status === "paid").reduce((total, item) => total + item.commission, 0);
    const referrers = new Set(referrals.map((item) => item.referrer)).size;
    return { pending, paid, referrers };
  }, [referrals]);

  useEffect(() => {
    adminApi.referrals()
      .then(setReferrals)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load referrals"));
  }, []);

  const columns: Column<ReferralRow>[] = [
    { key: "id", header: "Referral ID", sortable: true },
    { key: "referrer", header: "Referrer", sortable: true },
    { key: "referred", header: "Referred user", sortable: true },
    { key: "tier", header: "Tier", render: (row) => `Tier ${row.tier}` },
    { key: "commission", header: "Commission", sortable: true, render: (row) => formatCurrency(row.commission) },
    { key: "status", header: "Status", render: (row) => <StatusBadge tone={row.status === "paid" ? "success" : "warning"}>{row.status}</StatusBadge> },
    { key: "createdAt", header: "Created" }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Referral management"
        title="Commissions, analytics, and payout operations"
        actions={<Button icon={<HandCoins size={17} />}>Run payout batch</Button>}
      />
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Referral Revenue" value={stats.paid} change={0} currency="USD" icon={<TrendingUp size={18} />} />
        <MetricCard label="Pending Payouts" value={stats.pending} change={0} currency="USD" icon={<HandCoins size={18} />} />
        <MetricCard label="Active Referrers" value={stats.referrers} change={0} icon={<TrendingUp size={18} />} />
      </section>
      <DataTable rows={referrals} columns={columns} searchPlaceholder="Search referrals and payouts" />
    </div>
  );
}
