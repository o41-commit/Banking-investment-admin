"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { BellRing, ChartNoAxesCombined, CircleDollarSign, Clock3, HandCoins, TrendingUp, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { MetricCard } from "@/shared/components/MetricCard";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatCurrency } from "@/shared/lib/utils";
import { useRealtime } from "@/hooks/useRealtime";
import type { Activity, ChartPoint, DashboardMetric } from "@/shared/types";

const metricIcons = [Users, Wallet, HandCoins, TrendingUp, Clock3, CircleDollarSign];

export function DashboardPage() {
  const realtime = useRealtime();
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.dashboard()
      .then((data) => {
        setMetrics(data.metrics);
        setChartPoints(data.chartPoints);
        setActivities(data.activities);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load dashboard"));
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Overview dashboard"
        title="Financial operations at a glance"
        actions={<StatusBadge tone={realtime.connected ? "success" : "warning"}>{realtime.connected ? "Live" : "Connecting"}</StatusBadge>}
      />
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric, index) => {
          const Icon = metricIcons[index] ?? ChartNoAxesCombined;
          return <MetricCard key={metric.label} {...metric} icon={<Icon size={19} />} />;
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="panel p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="label mb-1">Revenue analytics</p>
              <h2 className="text-lg font-semibold text-ink">Deposits, withdrawals, and revenue</h2>
            </div>
            <StatusBadge tone="info">7D</StatusBadge>
          </div>
          <div className="h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ left: 0, right: 12 }}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf0f4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Area dataKey="revenue" name="Revenue" stroke="#0f766e" fill="url(#revenue)" strokeWidth={3} />
                <Line type="monotone" dataKey="deposits" name="Deposits" stroke="#4f46e5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="withdrawals" name="Withdrawals" stroke="#dc2626" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-4">
          <div className="mb-4">
            <p className="label mb-1">Daily profit graph</p>
            <h2 className="text-lg font-semibold text-ink">Profit distribution</h2>
          </div>
          <div className="h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartPoints}>
                <CartesianGrid stroke="#edf0f4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="profit" name="Profit" fill="#111827" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="panel p-4">
          <div className="mb-4 flex items-center gap-2">
            <BellRing size={18} className="text-brand" />
            <h2 className="text-lg font-semibold text-ink">Recent activities</h2>
          </div>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between gap-3 rounded-md border border-line p-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {activity.actor} <span className="font-medium text-slate-500">{activity.action}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{activity.target} · {activity.ip}</p>
                </div>
                <div className="text-right">
                  <StatusBadge tone={activity.tone}>{activity.tone}</StatusBadge>
                  <p className="mt-2 text-xs text-slate-500">{activity.createdAt}</p>
                </div>
              </div>
            ))}
            {activities.length === 0 ? <p className="rounded-md border border-line p-3 text-sm text-slate-500">No admin activity yet.</p> : null}
          </div>
        </div>

        <div className="panel p-4">
          <div className="mb-4">
            <p className="label mb-1">Live user statistics</p>
            <h2 className="text-lg font-semibold text-ink">User growth</h2>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints}>
                <CartesianGrid stroke="#edf0f4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
