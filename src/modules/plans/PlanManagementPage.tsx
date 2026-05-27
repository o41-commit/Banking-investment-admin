"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
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
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [roiType, setRoiType] = useState<InvestmentPlan["roiType"]>("daily");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionPlanId, setActionPlanId] = useState<string | null>(null);

  function loadPlans() {
    adminApi.plans()
      .then(setPlans)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load plans"));
  }

  useEffect(() => {
    loadPlans();
  }, []);

  function openCreateModal() {
    setError(null);
    setEditingPlan(null);
    setRoiType("daily");
    setModalOpen(true);
  }

  function openEditModal(plan: InvestmentPlan) {
    setError(null);
    setEditingPlan(plan);
    setRoiType(plan.roiType ?? "daily");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingPlan(null);
    setSaving(false);
  }

  const columns: Column<InvestmentPlan>[] = [
    { key: "name", header: "Plan", sortable: true },
    {
      key: "roi",
      header: "Return",
      sortable: true,
      render: (row) => row.roiType === "fixed" ? `${formatCurrency(row.fixedReturnAmount)} daily` : `${row.roi}% daily`
    },
    { key: "durationDays", header: "Duration", render: (row) => `${row.durationDays} days` },
    {
      key: "minAmount",
      header: "Min / Max",
      render: (row) => `${formatCurrency(row.minAmount)} - ${formatCurrency(row.maxAmount)}`
    },
    {
      key: "compounding",
      header: "ROI type",
      render: (row) => (
        <StatusBadge tone={row.roiType === "fixed" ? "neutral" : "info"}>
          {row.roiType === "fixed" ? "Fixed amount" : "Percentage"}
        </StatusBadge>
      )
    },
    { key: "enabled", header: "Status", render: (row) => <StatusBadge tone={row.enabled ? "success" : "neutral"}>{row.enabled ? "Live" : "Disabled"}</StatusBadge> },
    { key: "investors", header: "Investors", sortable: true },
    { key: "tvl", header: "TVL", render: (row) => formatCurrency(row.tvl) }
  ];

  function planPayload(form: FormData) {
    const nextRoiType = String(form.get("roiType") ?? "daily") as InvestmentPlan["roiType"];
    return {
      name: String(form.get("name") ?? "").trim(),
      roiPercent: nextRoiType === "daily" ? Number(form.get("roiPercent") ?? 0) : 0,
      roiType: nextRoiType,
      fixedReturnAmount: nextRoiType === "fixed" ? Number(form.get("fixedReturnAmount") ?? 0) : 0,
      durationDays: Number(form.get("durationDays") ?? 0),
      minAmount: Number(form.get("minAmount") ?? 0),
      maxAmount: Number(form.get("maxAmount") ?? 0),
      compoundingEnabled: false,
      enabled: form.get("enabled") === "true"
    };
  }

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);

    try {
      const payload = planPayload(form);
      if (editingPlan) {
        await adminApi.updatePlan(editingPlan.id, payload);
      } else {
        await adminApi.createPlan(payload);
      }
      closeModal();
      loadPlans();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : editingPlan ? "Unable to update plan" : "Unable to create plan");
      setSaving(false);
    }
  }

  async function togglePlan(plan: InvestmentPlan) {
    setActionPlanId(plan.id);
    setError(null);
    try {
      await adminApi.updatePlan(plan.id, { enabled: !plan.enabled });
      loadPlans();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update plan status");
    } finally {
      setActionPlanId(null);
    }
  }

  async function deletePlan(plan: InvestmentPlan) {
    const confirmed = window.confirm(`Delete "${plan.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setActionPlanId(plan.id);
    setError(null);
    try {
      await adminApi.deletePlan(plan.id);
      loadPlans();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete plan");
    } finally {
      setActionPlanId(null);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Investment plan management"
        title="Create, tune, and control investment products"
        actions={<Button icon={<Plus size={17} />} onClick={openCreateModal}>New plan</Button>}
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
              aria-label="Edit plan"
              onClick={() => openEditModal(row)}
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="ghost"
              className="size-9 p-0"
              aria-label={row.enabled ? "Disable plan" : "Enable plan"}
              onClick={() => togglePlan(row)}
              disabled={actionPlanId === row.id}
            >
              <Power size={16} />
            </Button>
            <Button
              variant="ghost"
              className="size-9 p-0 text-danger"
              aria-label="Delete plan"
              onClick={() => deletePlan(row)}
              disabled={actionPlanId === row.id}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      />

      <Modal open={modalOpen} title={editingPlan ? "Edit investment plan" : "Create investment plan"} onClose={closeModal}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={savePlan}>
          <label>
            <span className="label mb-2 block">Plan name</span>
            <input className="input" name="name" defaultValue={editingPlan?.name ?? ""} required />
          </label>
          <label>
            <span className="label mb-2 block">Daily ROI type</span>
            <select className="input" name="roiType" value={roiType} onChange={(event) => setRoiType(event.target.value as InvestmentPlan["roiType"])}>
              <option value="daily">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </label>
          {roiType === "daily" ? (
            <label>
              <span className="label mb-2 block">Daily ROI percentage</span>
              <input className="input" name="roiPercent" type="number" step="0.01" min="0" defaultValue={editingPlan?.roi ?? ""} required />
            </label>
          ) : (
            <label>
              <span className="label mb-2 block">Daily ROI fixed amount</span>
              <input className="input" name="fixedReturnAmount" type="number" step="0.01" min="0" defaultValue={editingPlan?.fixedReturnAmount || ""} required />
            </label>
          )}
          <label>
            <span className="label mb-2 block">Duration</span>
            <input className="input" name="durationDays" type="number" defaultValue={editingPlan?.durationDays ?? ""} required />
          </label>
          <label>
            <span className="label mb-2 block">Minimum investment</span>
            <input className="input" name="minAmount" type="number" defaultValue={editingPlan?.minAmount ?? ""} required />
          </label>
          <label>
            <span className="label mb-2 block">Maximum investment</span>
            <input className="input" name="maxAmount" type="number" defaultValue={editingPlan?.maxAmount ?? ""} required />
          </label>
          <label>
            <span className="label mb-2 block">Status</span>
            <select className="input" name="enabled" defaultValue={String(editingPlan?.enabled ?? true)}>
              <option value="true">Live</option>
              <option value="false">Disabled</option>
            </select>
          </label>
          <Button type="submit" className="sm:col-span-2" disabled={saving}>
            {saving ? "Saving..." : editingPlan ? "Save changes" : "Create plan"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
