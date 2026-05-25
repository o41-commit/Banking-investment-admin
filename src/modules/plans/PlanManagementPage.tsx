"use client";

import { useEffect, useState } from "react";
import { Plus, Power, Trash2 } from "lucide-react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { Modal } from "@/shared/components/Modal";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatCurrency } from "@/shared/lib/utils";
import type { InvestmentPlan } from "@/shared/types";

export function PlanManagementPage() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadPlans() {
    adminApi.plans()
      .then(setPlans)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load plans"));
  }

  useEffect(() => {
    loadPlans();
  }, []);

  const columns: Column<InvestmentPlan>[] = [
    { key: "name", header: "Plan", sortable: true },
    { key: "roi", header: "Daily ROI", sortable: true, render: (row) => `${row.roi}%` },
    { key: "durationDays", header: "Duration", render: (row) => `${row.durationDays} days` },
    {
      key: "minAmount",
      header: "Min / Max",
      render: (row) => `${formatCurrency(row.minAmount)} - ${formatCurrency(row.maxAmount)}`
    },
    { key: "compounding", header: "Compounding", render: (row) => <StatusBadge tone={row.compounding ? "info" : "neutral"}>{row.compounding ? "Enabled" : "Fixed"}</StatusBadge> },
    { key: "enabled", header: "Status", render: (row) => <StatusBadge tone={row.enabled ? "success" : "neutral"}>{row.enabled ? "Live" : "Disabled"}</StatusBadge> },
    { key: "investors", header: "Investors", sortable: true },
    { key: "tvl", header: "TVL", render: (row) => formatCurrency(row.tvl) }
  ];

  async function createPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await adminApi.createPlan({
        name: String(form.get("name") ?? ""),
        roiPercent: Number(form.get("roiPercent") ?? 0),
        durationDays: Number(form.get("durationDays") ?? 0),
        minAmount: Number(form.get("minAmount") ?? 0),
        maxAmount: Number(form.get("maxAmount") ?? 0),
        compoundingEnabled: form.get("compoundingEnabled") === "true",
        enabled: true,
        sortOrder: 0
      });
      setModalOpen(false);
      loadPlans();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create plan");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Investment plan management"
        title="Create, tune, and control investment products"
        actions={<Button icon={<Plus size={17} />} onClick={() => setModalOpen(true)}>New plan</Button>}
      />
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <DataTable
        rows={plans}
        columns={columns}
        searchPlaceholder="Search plans, ROI, duration, compounding"
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              className="size-9 p-0"
              aria-label="Enable or disable plan"
              onClick={() => undefined}
              disabled
            >
              <Power size={16} />
            </Button>
            <Button
              variant="ghost"
              className="size-9 p-0 text-danger"
              aria-label="Delete plan"
              onClick={() => undefined}
              disabled
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      />

      <Modal open={modalOpen} title="Create investment plan" onClose={() => setModalOpen(false)}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={createPlan}>
          <label>
            <span className="label mb-2 block">Plan name</span>
            <input className="input" name="name" required />
          </label>
          <label>
            <span className="label mb-2 block">Daily ROI</span>
            <input className="input" name="roiPercent" type="number" step="0.01" required />
          </label>
          <label>
            <span className="label mb-2 block">Duration</span>
            <input className="input" name="durationDays" type="number" required />
          </label>
          <label>
            <span className="label mb-2 block">Minimum investment</span>
            <input className="input" name="minAmount" type="number" required />
          </label>
          <label>
            <span className="label mb-2 block">Maximum investment</span>
            <input className="input" name="maxAmount" type="number" required />
          </label>
          <label>
            <span className="label mb-2 block">Compounding</span>
            <select className="input" name="compoundingEnabled" defaultValue="true">
              <option value="true">Enabled</option>
              <option value="false">Fixed ROI</option>
            </select>
          </label>
          <Button type="submit" className="sm:col-span-2">Create plan</Button>
        </form>
      </Modal>
    </div>
  );
}
