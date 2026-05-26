"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Edit3, ExternalLink, FileText, KeyRound, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { Modal } from "@/shared/components/Modal";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatCurrency } from "@/shared/lib/utils";
import type { KycReviewRecord, KycStatus, ManagedUser, StatusTone, UserStatus } from "@/shared/types";

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
  const [kycRows, setKycRows] = useState<KycReviewRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [kycQueueOpen, setKycQueueOpen] = useState(false);
  const [balance, setBalance] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [kycStatusFilter, setKycStatusFilter] = useState<KycStatus | "all">("pending");
  const [kycLoading, setKycLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadUsers() {
    adminApi.users()
      .then(setRows)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load users"));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadKycQueue() {
    setKycLoading(true);
    try {
      setKycRows(await adminApi.kycQueue());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load KYC queue");
    } finally {
      setKycLoading(false);
    }
  }

  const filteredRows = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((row) => row.status === statusFilter)),
    [rows, statusFilter]
  );

  const filteredKycRows = useMemo(
    () => (kycStatusFilter === "all" ? kycRows : kycRows.filter((row) => row.status === kycStatusFilter)),
    [kycRows, kycStatusFilter]
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
          asset: "BTC",
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

  function openKycQueue() {
    setKycQueueOpen(true);
    void loadKycQueue();
  }

  async function reviewKyc(row: KycReviewRecord, status: "approved" | "rejected") {
    const rejectionReason = status === "rejected" ? window.prompt("Reason for rejecting this KYC?")?.trim() : undefined;
    if (status === "rejected" && !rejectionReason) return;

    try {
      await adminApi.reviewKyc(row.id, { status, rejectionReason });
      await loadKycQueue();
      loadUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to review KYC");
    }
  }

  function isImageFile(url: string) {
    return /\/image\/upload\//.test(url) || /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="User management"
        title="Users, wallets, balances, KYC, and account controls"
        actions={
          <>
            <Button variant="secondary" icon={<ShieldCheck size={17} />} onClick={openKycQueue}>KYC queue</Button>
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

      <Modal open={kycQueueOpen} title="KYC queue" className="max-w-5xl" onClose={() => setKycQueueOpen(false)}>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <select className="input w-full sm:w-48" value={kycStatusFilter} onChange={(event) => setKycStatusFilter(event.target.value as KycStatus | "all")}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="not_submitted">Not submitted</option>
              <option value="all">All statuses</option>
            </select>
            <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => void loadKycQueue()} disabled={kycLoading}>
              Refresh
            </Button>
          </div>

          {kycLoading ? <p className="text-sm font-semibold text-slate-500">Loading KYC records...</p> : null}
          {!kycLoading && filteredKycRows.length === 0 ? <p className="text-sm font-semibold text-slate-500">No KYC records found.</p> : null}

          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {filteredKycRows.map((record) => (
              <article key={record.id} className="rounded-md border border-line bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{record.userName}</h3>
                      <StatusBadge tone={kycTone[record.status]}>{record.status.replace("_", " ")}</StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{record.userEmail || "No email"} - Submitted {record.submittedAt}</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {record.documentType} - {record.documentNumber || "No document number"} - {record.country || "No country"}
                    </p>
                    {record.rejectionReason ? <p className="mt-2 text-sm font-semibold text-red-600">{record.rejectionReason}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" icon={<CheckCircle2 size={16} />} onClick={() => void reviewKyc(record, "approved")}>
                      Approve
                    </Button>
                    <Button variant="danger" onClick={() => void reviewKyc(record, "rejected")}>
                      Reject
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {record.files.length ? record.files.map((file, index) => (
                    <a
                      key={`${record.id}-${file}`}
                      href={file}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-md border border-line bg-slate-50 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                      <div className="grid aspect-[4/3] place-items-center bg-white">
                        {isImageFile(file) ? (
                          <img src={file} alt={`KYC document ${index + 1}`} className="h-full w-full object-cover" />
                        ) : (
                          <FileText className="size-9 text-slate-400" />
                        )}
                      </div>
                      <span className="flex items-center justify-between gap-2 px-3 py-2">
                        Document {index + 1}
                        <ExternalLink size={14} className="shrink-0 text-slate-400 group-hover:text-ink" />
                      </span>
                    </a>
                  )) : (
                    <p className="text-sm font-semibold text-slate-500">No documents attached.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
