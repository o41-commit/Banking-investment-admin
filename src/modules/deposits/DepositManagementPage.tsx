"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { Modal } from "@/shared/components/Modal";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatCurrency } from "@/shared/lib/utils";
import type { MoneyRequest, StatusTone, TransactionStatus } from "@/shared/types";

const statusTone: Record<TransactionStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  paid: "success",
  failed: "danger"
};

export function DepositManagementPage() {
  const [rows, setRows] = useState<MoneyRequest[]>([]);
  const [selected, setSelected] = useState<MoneyRequest | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function loadDeposits() {
    adminApi.deposits()
      .then(setRows)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load deposits"));
  }

  useEffect(() => {
    loadDeposits();
  }, []);

  const columns: Column<MoneyRequest>[] = [
    { key: "id", header: "Deposit ID", sortable: true },
    { key: "user", header: "User", sortable: true },
    { key: "amount", header: "Amount", sortable: true, render: (row) => `${formatCurrency(row.amount)} ${row.asset}` },
    { key: "txHash", header: "Transaction hash", render: (row) => row.txHash ?? "Pending upload" },
    { key: "riskScore", header: "Risk", sortable: true, render: (row) => <StatusBadge tone={row.riskScore > 70 ? "danger" : row.riskScore > 35 ? "warning" : "success"}>{row.riskScore}/100</StatusBadge> },
    { key: "status", header: "Status", render: (row) => <StatusBadge tone={statusTone[row.status]}>{row.status}</StatusBadge> },
    { key: "createdAt", header: "Submitted" }
  ];

  async function setStatus(row: MoneyRequest, status: TransactionStatus) {
    setError(null);
    try {
      if (status === "approved") await adminApi.approveDeposit(row.id);
      if (status === "rejected") await adminApi.rejectDeposit(row.id, note);
      setSelected(null);
      setNote("");
      loadDeposits();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update deposit");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Deposit management"
        title="Review hashes, notes, approvals, and deposit statistics"
        actions={<Button variant="secondary" icon={<FileText size={17} />}>Export deposits</Button>}
      />
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <DataTable
        rows={rows}
        columns={columns}
        searchPlaceholder="Search deposits by user, hash, asset, status"
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="size-9 p-0" aria-label="Approve deposit" onClick={() => void setStatus(row, "approved")}>
              <CheckCircle2 size={16} />
            </Button>
            <Button variant="ghost" className="size-9 p-0 text-danger" aria-label="Reject deposit" onClick={() => setSelected(row)}>
              <XCircle size={16} />
            </Button>
          </div>
        )}
      />
      <Modal open={Boolean(selected)} title="Reject deposit" onClose={() => setSelected(null)}>
        <label>
          <span className="label mb-2 block">Admin note</span>
          <textarea className="input min-h-28 py-3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain rejection reason for audit logs" />
        </label>
        <Button className="mt-4 w-full" variant="danger" onClick={() => selected && void setStatus(selected, "rejected")}>
          Reject deposit
        </Button>
      </Modal>
    </div>
  );
}
