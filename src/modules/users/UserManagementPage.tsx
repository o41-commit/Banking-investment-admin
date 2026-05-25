"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Edit3, KeyRound, ShieldCheck, WalletCards } from "lucide-react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { Modal } from "@/shared/components/Modal";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatCurrency } from "@/shared/lib/utils";
import type { KycStatus, ManagedUser, StatusTone, UserStatus } from "@/shared/types";

const userStatusTone: Record<UserStatus, StatusTone> = {
  active: "success",
  pending: "warning",
  flagged: "danger",
  banned: "neutral"
};

const kycTone: Record<KycStatus, StatusTone> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
  not_submitted: "neutral"
};

export function UserManagementPage() {
  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [balance, setBalance] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);

  function loadUsers() {
    adminApi.users()
      .then(setRows)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load users"));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredRows = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((row) => row.status === statusFilter)),
    [rows, statusFilter]
  );

  const columns: Column<ManagedUser>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.name}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      )
    },
    { key: "id", header: "ID", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge tone={userStatusTone[row.status]}>{row.status}</StatusBadge>
    },
    {
      key: "kyc",
      header: "KYC",
      render: (row) => <StatusBadge tone={kycTone[row.kyc]}>{row.kyc.replace("_", " ")}</StatusBadge>
    },
    {
      key: "balance",
      header: "Balance",
      sortable: true,
      render: (row) => <span className="font-semibold text-ink">{formatCurrency(row.balance)}</span>
    },
    {
      key: "invested",
      header: "Invested",
      render: (row) => formatCurrency(row.invested)
    },
    { key: "referrals", header: "Refs", sortable: true },
    { key: "lastSeen", header: "Last seen" }
  ];

  async function updateUser(next: Partial<ManagedUser>) {
    if (!selectedUser) return;
    try {
      if (next.balance !== undefined) {
        await adminApi.editUserBalance(selectedUser.id, {
          asset: "USDT",
          amount: Number(next.balance) - selectedUser.balance,
          reason: "Admin dashboard balance adjustment"
        });
      }
      setSelectedUser(null);
      setBalance("");
      loadUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update user");
    }
  }

  async function toggleBan(row: ManagedUser) {
    const status = row.status === "banned" ? "active" : "banned";
    try {
      await adminApi.updateUserStatus(row.id, status);
      loadUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update status");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="User management"
        title="Users, wallets, balances, KYC, and account controls"
        actions={
          <>
            <Button variant="secondary" icon={<ShieldCheck size={17} />}>KYC queue</Button>
            <Button icon={<WalletCards size={17} />}>Wallet audit</Button>
          </>
        }
      />
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <DataTable
        rows={filteredRows}
        columns={columns}
        searchPlaceholder="Search users by name, email, status, wallet, KYC"
        filters={
          <select className="input w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as UserStatus | "all")}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="flagged">Flagged</option>
            <option value="banned">Banned</option>
          </select>
        }
        rowActions={(row) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="size-9 p-0" aria-label="Edit user balance" onClick={() => { setSelectedUser(row); setBalance(String(row.balance)); }}>
              <Edit3 size={16} />
            </Button>
            <Button
              variant="ghost"
              className="size-9 p-0"
              aria-label={row.status === "banned" ? "Unban user" : "Ban user"}
              onClick={() => void toggleBan(row)}
            >
              <Ban size={16} />
            </Button>
          </div>
        )}
      />

      <Modal open={Boolean(selectedUser)} title={selectedUser ? `Manage ${selectedUser.name}` : "Manage user"} onClose={() => setSelectedUser(null)}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label mb-2 block">Wallet balance</span>
              <input className="input" value={balance} onChange={(event) => setBalance(event.target.value)} />
            </label>
            <label>
              <span className="label mb-2 block">KYC decision</span>
              <select className="input" defaultValue={selectedUser?.kyc}>
                <option value="approved">Approve KYC</option>
                <option value="rejected">Reject KYC</option>
                <option value="pending">Pending review</option>
              </select>
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="secondary" icon={<KeyRound size={16} />}>Reset password</Button>
            <Button variant="secondary" icon={<CheckCircle2 size={16} />} disabled>Approve KYC</Button>
            <Button onClick={() => void updateUser({ balance: Number(balance) || 0 })}>Save changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
