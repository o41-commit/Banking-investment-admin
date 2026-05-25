"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/shared/lib/utils";

type MetricCardProps = {
  label: string;
  value: number;
  change: number;
  currency?: string;
  icon: ReactNode;
};

export function MetricCard({ label, value, change, currency, icon }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-normal text-ink">
            {currency ? formatCurrency(value, currency) : formatNumber(value)}
          </p>
        </div>
        <div className="grid size-10 place-items-center rounded-md bg-ink text-white">{icon}</div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className={isPositive ? "text-positive" : "text-danger"}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        </span>
        <span className={isPositive ? "font-semibold text-positive" : "font-semibold text-danger"}>
          {formatPercent(change)}
        </span>
        <span className="text-slate-500">vs previous period</span>
      </div>
    </motion.article>
  );
}
