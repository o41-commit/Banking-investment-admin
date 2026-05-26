"use client";

import { useEffect, useState } from "react";
import { CheckCheck, Hash, ShieldAlert, XCircle } from "lucide-react";
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
  approved: "info",
  paid: "success",
  rejected: "danger",
  failed: "danger"
};

export function WithdrawalManagementPage() {
  const [rows, setRows] = useState<MoneyRequest[]>([]);
  const [selected, setSelected] = useState<MoneyRequest | null>(null);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState<string | null>(null);

  function loadWithdrawals() {
    adminApi.withdrawals()
      .then(setRows)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load withdrawals"));
  }

  useEffect(() => {
    loadWithdrawals();
    const interval = window.setInterval(loadWithdrawals, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const columns: Column<MoneyRequest>[] = [
    { key: "id", header: "Withdrawal ID", sortable: true },
    { key: "user", header: "User", sortable: true },
    { key: "amount", header: "Amount", sortable: true, render: (row) => `${formatCurrency(row.amount)} ${row.asset}` },
    { key: "wallet", header: "Destination wallet", render: (row) => row.wallet ?? "Not attached" },
    { key: "riskScore", header: "Risk", sortable: true, render: (row) => <StatusBadge tone={row.riskScore > 70 ? "danger" : row.riskScore > 35 ? "warning" : "success"}>{row.riskScore}/100</StatusBadge> },
    { key: "status", header: "Status", render: (row) => <StatusBadge tone={statusTone[row.status]}>{row.status}</StatusBadge> },
    { key: "createdAt", header: "Requested" }
  ];

  async function update(row: MoneyRequest, status: TransactionStatus, hash?: string) {
    setError(null);
    try {
      if (status === "approved") await adminApi.approveWithdrawal(row.id);
      if (status === "rejected") await adminApi.rejectWithdrawal(row.id);
      if (status === "paid") await adminApi.markWithdrawalPaid(row.id, hash ?? txHash);
      setSelected(null);
      setTxHash("");
      loadWithdrawals();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update withdrawal");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Withdrawal management"
        title="Approval layers, payment state, and blockchain hashes"
        actions={<Button variant="secondary" icon={<ShieldAlert size={17} />}>Risk rules</Button>}
      />
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <DataTable
        rows={rows}
        columns={columns}
        searchPlaceholder="Search withdrawals by user, wallet, asset, risk"
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="size-9 p-0" aria-label="Approve withdrawal" onClick={() => void update(row, "approved")}>
              <CheckCheck size={16} />
            </Button>
            <Button variant="ghost" className="size-9 p-0" aria-label="Mark as paid" onClick={() => setSelected(row)}>
              <Hash size={16} />
            </Button>
            <Button variant="ghost" className="size-9 p-0 text-danger" aria-label="Reject withdrawal" onClick={() => void update(row, "rejected")}>
              <XCircle size={16} />
            </Button>
          </div>
        )}
      />
      <Modal open={Boolean(selected)} title="Attach blockchain transaction hash" onClose={() => setSelected(null)}>
        <label>
          <span className="label mb-2 block">Transaction hash</span>
          <input className="input" value={txHash} onChange={(event) => setTxHash(event.target.value)} placeholder="0x..." id="withdrawal-tx-hash" />
        </label>
        <Button className="mt-4 w-full" onClick={() => selected && void update(selected, "paid", txHash)}>
          Mark as paid
        </Button>
      </Modal>
    </div>
  );
}
