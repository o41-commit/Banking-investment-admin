"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartCandlestick, Clock3, RefreshCw, TrendingUp } from "lucide-react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { MetricCard } from "@/shared/components/MetricCard";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatCurrency } from "@/shared/lib/utils";
import type { InvestmentRecord, StatusTone } from "@/shared/types";

const statusTone: Record<InvestmentRecord["status"], StatusTone> = {
  active: "success",
  matured: "info",
  cancelled: "danger"
};

export function InvestmentManagementPage() {
  const [rows, setRows] = useState<InvestmentRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<InvestmentRecord["status"] | "all">("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadInvestments() {
    setLoading(true);
    try {
      setRows(await adminApi.investments());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load investments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvestments();
    const interval = window.setInterval(loadInvestments, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredRows = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((row) => row.status === statusFilter)),
    [rows, statusFilter]
  );

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.status === "active");
    const activeInvestors = new Set(active.map((row) => row.userEmail || row.user)).size;
    return {
      activeInvestors,
      totalInvested: active.reduce((total, row) => total + row.amount, 0),
      accruedProfit: active.reduce((total, row) => total + row.accruedProfit, 0),
      dailyReturn: active.reduce((total, row) => total + row.dailyReturn, 0)
    };
  }, [rows]);

  const columns: Column<InvestmentRecord>[] = [
    {
      key: "user",
      header: "User",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.user}</p>
          <p className="text-xs text-slate-500">{row.userEmail || "No email"}</p>
        </div>
      )
    },
    { key: "plan", header: "Plan", sortable: true },
    { key: "amount", header: "Invested", sortable: true, render: (row) => `${formatCurrency(row.amount)} ${row.asset}` },
    { key: "roiDisplay", header: "Daily ROI", sortable: true },
    { key: "dailyReturn", header: "Daily earning", sortable: true, render: (row) => formatCurrency(row.dailyReturn) },
    { key: "accruedProfit", header: "Earned", sortable: true, render: (row) => formatCurrency(row.accruedProfit) },
    { key: "totalReturn", header: "Return so far", sortable: true, render: (row) => formatCurrency(row.totalReturn) },
    { key: "status", header: "Status", render: (row) => <StatusBadge tone={statusTone[row.status]}>{row.status}</StatusBadge> },
    { key: "maturesAt", header: "Ends" }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Investment monitoring"
        title="Active plans, user earnings, maturity dates, and profit tracking"
        actions={
          <Button variant="secondary" icon={<RefreshCw size={17} />} onClick={() => void loadInvestments()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Investors" value={stats.activeInvestors} change={0} icon={<ChartCandlestick size={18} />} />
        <MetricCard label="Active Capital" value={stats.totalInvested} change={0} currency="USD" icon={<TrendingUp size={18} />} />
        <MetricCard label="Accrued Earnings" value={stats.accruedProfit} change={0} currency="USD" icon={<TrendingUp size={18} />} />
        <MetricCard label="Daily ROI Due" value={stats.dailyReturn} change={0} currency="USD" icon={<Clock3 size={18} />} />
      </section>

      <DataTable
        rows={filteredRows}
        columns={columns}
        searchPlaceholder="Search investments by user, plan, amount, status"
        filters={
          <select className="input w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as InvestmentRecord["status"] | "all")}>
            <option value="active">Active</option>
            <option value="matured">Matured</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All statuses</option>
          </select>
        }
      />
    </div>
  );
}
