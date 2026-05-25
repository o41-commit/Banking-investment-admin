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
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { formatCurrency } from "@/shared/lib/utils";
import type { ChartPoint } from "@/shared/types";

export function AnalyticsPage() {
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.dashboard()
      .then((data) => setChartPoints(data.chartPoints))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load analytics"));
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Analytics" title="Revenue, investments, users, deposits, and withdrawals" actions={<Button icon={<Download size={17} />}>Export report</Button>} />
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-4 text-lg font-semibold text-ink">Revenue charts</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints}>
                <CartesianGrid stroke="#edf0f4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area dataKey="revenue" stroke="#0f766e" fill="#ccfbf1" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-4">
          <h2 className="mb-4 text-lg font-semibold text-ink">Deposit analytics</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartPoints}>
                <CartesianGrid stroke="#edf0f4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="deposits" fill="#4f46e5" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-4">
          <h2 className="mb-4 text-lg font-semibold text-ink">Withdrawal analytics</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints}>
                <CartesianGrid stroke="#edf0f4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line dataKey="withdrawals" stroke="#dc2626" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-4">
          <h2 className="mb-4 text-lg font-semibold text-ink">Investment trends and user growth</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints}>
                <CartesianGrid stroke="#edf0f4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Line dataKey="profit" stroke="#111827" strokeWidth={3} dot={false} />
                <Line dataKey="users" stroke="#0f766e" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
