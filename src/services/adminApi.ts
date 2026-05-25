import { z } from "zod";
import type {
  Activity,
  AdminSession,
  ChartPoint,
  DashboardMetric,
  InvestmentPlan,
  ManagedUser,
  MoneyRequest,
  ReferralRow,
  SecurityEvent,
  SupportTicket
} from "@/shared/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  twoFactorCode: z.string().min(6).optional()
});

type ApiList<T> = {
  items: T[];
  total: number;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
} & Partial<ApiList<T>>;

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/$/, "");

function authHeader() {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem("admin-session");
  if (!raw) return {};
  try {
    const session = JSON.parse(raw) as AdminSession;
    return session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
  } catch {
    return {};
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  Object.entries(authHeader()).forEach(([key, value]) => headers.set(key, value));

  const response = await fetch(`${apiUrl}${path}`, {
    credentials: "include",
    ...init,
    headers
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok) {
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
  }
  return ((payload?.data ?? payload) as T);
}

async function listRequest<T>(path: string): Promise<ApiList<T>> {
  const payload = await request<ApiResponse<T[]>>(path);
  return {
    items: (payload.items ?? payload.data ?? []) as T[],
    total: payload.total ?? (payload.items?.length ?? payload.data?.length ?? 0)
  };
}

function idOf(item: { _id?: string; id?: string }) {
  return item.id ?? item._id ?? "";
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function formatUser(user: unknown) {
  if (!user || typeof user !== "object") return "Unknown user";
  const record = user as { name?: string; email?: string };
  return record.name ?? record.email ?? "Unknown user";
}

function mapMoneyRequest(item: Record<string, unknown>): MoneyRequest {
  return {
    id: idOf(item),
    user: formatUser(item.user),
    amount: Number(item.amount ?? 0),
    asset: (item.asset as MoneyRequest["asset"]) ?? "USDT",
    status: (item.status as MoneyRequest["status"]) ?? "pending",
    txHash: item.txHash as string | undefined,
    wallet: (item.destinationAddress as string | undefined) ?? (typeof item.wallet === "string" ? item.wallet : undefined),
    riskScore: Number(item.riskScore ?? 0),
    createdAt: formatDate(item.createdAt as string | undefined)
  };
}

function mapUser(item: Record<string, unknown>): ManagedUser {
  const balances = Array.isArray(item.balances) ? item.balances as Array<{ available?: number }> : [];
  return {
    id: idOf(item),
    name: String(item.name ?? "Unnamed user"),
    email: String(item.email ?? ""),
    status: (item.status as ManagedUser["status"]) ?? "pending",
    kyc: (item.kyc as ManagedUser["kyc"]) ?? "not_submitted",
    balance: balances.reduce((total, balance) => total + Number(balance.available ?? 0), 0),
    invested: 0,
    referrals: 0,
    joinedAt: formatDate(item.createdAt as string | undefined),
    lastSeen: formatDate(item.lastLoginAt as string | undefined)
  };
}

function mapPlan(item: Record<string, unknown>): InvestmentPlan {
  return {
    id: idOf(item),
    name: String(item.name ?? "Untitled plan"),
    roi: Number(item.roiPercent ?? 0),
    durationDays: Number(item.durationDays ?? 0),
    minAmount: Number(item.minAmount ?? 0),
    maxAmount: Number(item.maxAmount ?? 0),
    compounding: Boolean(item.compoundingEnabled),
    enabled: Boolean(item.enabled),
    investors: 0,
    tvl: 0
  };
}

function mapReferral(item: Record<string, unknown>): ReferralRow {
  return {
    id: idOf(item),
    referrer: formatUser(item.referrer),
    referred: formatUser(item.referred),
    commission: Number(item.commissionAmount ?? 0),
    status: (item.status as ReferralRow["status"]) ?? "pending",
    tier: Number(item.tier ?? 1),
    createdAt: formatDate(item.createdAt as string | undefined)
  };
}

function mapTicket(item: Record<string, unknown>): SupportTicket {
  const messages = Array.isArray(item.messages) ? item.messages : [];
  return {
    id: idOf(item),
    socketId: idOf(item),
    subject: String(item.subject ?? "Support ticket"),
    user: formatUser(item.user),
    priority: (item.priority as SupportTicket["priority"]) ?? "medium",
    status: (item.status as SupportTicket["status"]) ?? "open",
    lastMessageAt: formatDate((messages.at(-1) as { createdAt?: string } | undefined)?.createdAt ?? item.updatedAt as string | undefined)
  };
}

function mapSecurityEvent(item: Record<string, unknown>): SecurityEvent {
  return {
    id: idOf(item),
    type: String(item.action ?? "audit"),
    actor: String(item.actorType ?? "admin"),
    ip: String(item.ip ?? "unknown"),
    severity: (item.severity as SecurityEvent["severity"]) ?? "low",
    createdAt: formatDate(item.createdAt as string | undefined)
  };
}

function mapActivity(item: Record<string, unknown>): Activity {
  const severity = (item.severity as SecurityEvent["severity"]) ?? "low";
  return {
    id: idOf(item),
    actor: String(item.actorType ?? "admin"),
    action: String(item.action ?? "updated platform"),
    target: String(item.resource ?? "system"),
    ip: String(item.ip ?? "unknown"),
    createdAt: formatDate(item.createdAt as string | undefined),
    tone: severity === "high" || severity === "critical" ? "danger" : severity === "medium" ? "warning" : "success"
  };
}

function mapDailySeries(items: Array<{ _id: { day: string; type: string }; total: number }>): ChartPoint[] {
  const byDay = new Map<string, ChartPoint>();
  for (const item of items) {
    const day = item._id.day;
    const point = byDay.get(day) ?? { label: day.slice(5), deposits: 0, withdrawals: 0, revenue: 0, profit: 0, users: 0 };
    if (item._id.type === "deposit") point.deposits += item.total;
    if (item._id.type === "withdrawal") point.withdrawals += Math.abs(item.total);
    if (item._id.type === "profit") point.profit += item.total;
    if (["deposit", "profit", "investment"].includes(item._id.type)) point.revenue += Math.abs(item.total);
    byDay.set(day, point);
  }
  return [...byDay.values()];
}

export const adminApi = {
  async login(input: z.infer<typeof loginSchema>): Promise<AdminSession> {
    return request<AdminSession>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify(loginSchema.parse(input))
    });
  },

  logout() {
    return request("/auth/logout", { method: "POST" });
  },

  async dashboard(): Promise<{ metrics: DashboardMetric[]; chartPoints: ChartPoint[]; activities: Activity[] }> {
    const [overview, daily, logs] = await Promise.all([
      request<{
        totalUsers: number;
        totalDeposits: number;
        totalWithdrawals: number;
        activeInvestments: number;
        pendingApprovals: number;
        revenue: number;
      }>("/analytics/overview"),
      request<Array<{ _id: { day: string; type: string }; total: number }>>("/analytics/daily?days=7"),
      listRequest<Record<string, unknown>>("/admin/logs?limit=8")
    ]);

    return {
      metrics: [
        { label: "Total Users", value: overview.totalUsers, change: 0 },
        { label: "Total Deposits", value: overview.totalDeposits, change: 0, currency: "USD" },
        { label: "Total Withdrawals", value: overview.totalWithdrawals, change: 0, currency: "USD" },
        { label: "Active Investments", value: overview.activeInvestments, change: 0 },
        { label: "Pending Approvals", value: overview.pendingApprovals, change: 0 },
        { label: "Revenue", value: overview.revenue, change: 0, currency: "USD" }
      ],
      chartPoints: mapDailySeries(daily),
      activities: logs.items.map(mapActivity)
    };
  },

  async users() {
    const result = await listRequest<Record<string, unknown>>("/users?limit=100");
    return result.items.map(mapUser);
  },

  updateUserStatus(id: string, status: ManagedUser["status"]) {
    return request(`/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },

  editUserBalance(id: string, input: { asset: string; amount: number; reason: string }) {
    return request(`/users/${id}/balance`, { method: "PATCH", body: JSON.stringify(input) });
  },

  async plans() {
    const items = await request<Record<string, unknown>[]>("/plans?includeDisabled=true");
    return items.map(mapPlan);
  },

  createPlan(input: Record<string, unknown>) {
    return request("/plans", { method: "POST", body: JSON.stringify(input) });
  },

  async deposits() {
    const result = await listRequest<Record<string, unknown>>("/deposits?limit=100");
    return result.items.map(mapMoneyRequest);
  },

  approveDeposit(id: string) {
    return request(`/deposits/${id}/approve`, { method: "POST", body: JSON.stringify({}) });
  },

  rejectDeposit(id: string, adminNotes?: string) {
    return request(`/deposits/${id}/reject`, { method: "POST", body: JSON.stringify({ adminNotes }) });
  },

  async withdrawals() {
    const result = await listRequest<Record<string, unknown>>("/withdrawals?limit=100");
    return result.items.map(mapMoneyRequest);
  },

  approveWithdrawal(id: string) {
    return request(`/withdrawals/${id}/approve`, { method: "POST", body: JSON.stringify({}) });
  },

  rejectWithdrawal(id: string, note?: string) {
    return request(`/withdrawals/${id}/reject`, { method: "POST", body: JSON.stringify({ note }) });
  },

  markWithdrawalPaid(id: string, txHash: string) {
    return request(`/withdrawals/${id}/paid`, { method: "POST", body: JSON.stringify({ txHash }) });
  },

  async referrals() {
    const result = await listRequest<Record<string, unknown>>("/referrals?limit=100");
    return result.items.map(mapReferral);
  },

  async tickets() {
    const result = await listRequest<Record<string, unknown>>("/support?limit=100");
    return result.items.map(mapTicket);
  },

  async securityEvents() {
    const result = await listRequest<Record<string, unknown>>("/admin/logs?limit=100");
    return result.items.map(mapSecurityEvent);
  },

  broadcast(input: { title: string; message: string; audience: string; channels: string[] }) {
    return request("/notifications/broadcast", { method: "POST", body: JSON.stringify(input) });
  },

  async settings() {
    return request<Record<string, unknown>[]>("/settings");
  },

  saveSetting(input: { key: string; value: unknown; encrypted?: boolean }) {
    return request("/settings", { method: "PUT", body: JSON.stringify(input) });
  }
};
