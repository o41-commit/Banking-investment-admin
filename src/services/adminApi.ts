import { z } from "zod";
import type {
  Activity,
  AdminSession,
  ChartPoint,
  DashboardMetric,
  InvestmentPlan,
  KycReviewRecord,
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
const adminSessionKey = "admin-session";
const adminSessionUpdatedEvent = "admin-session-updated";

let refreshPromise: Promise<AdminSession> | null = null;
const defaultErrorMessage = "Something went wrong. Please try again.";

function looksTechnical(message = "") {
  const lower = message.toLowerCase();
  return [
    "validation failed",
    "request failed with status",
    "route not found",
    "cast to objectid",
    "e11000",
    "duplicate key",
    "zod",
    "syntaxerror",
    "internal server error",
    "failed to fetch",
    "networkerror"
  ].some((pattern) => lower.includes(pattern));
}

export function friendlyMessage(message: unknown, fallback = defaultErrorMessage) {
  const text = String(message ?? "").trim();
  if (!text) return fallback;
  const lower = text.toLowerCase();

  if (lower.includes("invalid credentials")) return "The email or password you entered is incorrect.";
  if (lower.includes("validation failed")) return "Please check the form fields and try again.";
  if (lower.includes("user already exists")) return "A user with this email already exists.";
  if (lower.includes("kyc approval")) return "KYC approval is required before this action can continue.";
  if (lower.includes("insufficient balance")) return "The user does not have enough available balance for this action.";
  if (lower.includes("withdrawal wallet not found")) return "The selected withdrawal wallet is missing or not verified.";
  if (lower.includes("destination address")) return "The destination address must match a saved verified Bitcoin wallet.";
  if (lower.includes("deposit wallet")) return "A Bitcoin deposit wallet is not configured yet.";
  if (lower.includes("network must be bitcoin")) return "Only the Bitcoin network is supported.";
  if (lower.includes("only bitcoin")) return "Only Bitcoin is supported on this platform.";
  if (lower.includes("investment amount is outside")) return "The investment amount is outside the selected plan limits.";
  if (lower.includes("session expired")) return "Your admin session has expired. Please sign in again.";
  if (lower.includes("already reviewed")) return "This withdrawal has already been reviewed by this admin.";
  if (lower.includes("not pending")) return "This request is no longer pending.";
  if (lower.includes("cannot delete a plan")) return "This plan has active investments and cannot be deleted.";

  return looksTechnical(text) ? fallback : text;
}

function apiErrorMessage(response: Response, payload: ApiResponse<unknown> | null, path = "") {
  const backendMessage = payload?.message;
  const status = response.status;
  const lowerPath = path.toLowerCase();

  if (status === 400) return friendlyMessage(backendMessage, "Please check the information and try again.");
  if (status === 401 && lowerPath.includes("/auth/admin/login")) return "The email or password you entered is incorrect.";
  if (status === 401) return "Please sign in again to continue.";
  if (status === 403) return friendlyMessage(backendMessage, "You do not have permission to complete this action.");
  if (status === 404) return friendlyMessage(backendMessage, "We could not find that record. Please refresh and try again.");
  if (status === 409) return friendlyMessage(backendMessage, "This record has already changed. Please refresh and try again.");
  if (status === 422) return "Please check the form fields and try again.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return "Something went wrong on our side. Please try again in a moment.";

  return friendlyMessage(backendMessage, defaultErrorMessage);
}

function networkErrorMessage() {
  return "We could not reach the server. Please check your connection and try again.";
}

function getStoredSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(adminSessionKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    window.localStorage.removeItem(adminSessionKey);
    return null;
  }
}

function saveStoredSession(session: AdminSession) {
  window.localStorage.setItem(adminSessionKey, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(adminSessionUpdatedEvent, { detail: session }));
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(adminSessionKey);
  window.dispatchEvent(new CustomEvent(adminSessionUpdatedEvent, { detail: null }));
}

function authHeader() {
  const session = getStoredSession();
  return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function parseResponse<T>(response: Response, path = ""): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok) {
    throw new Error(apiErrorMessage(response, payload as ApiResponse<unknown> | null, path));
  }
  return ((payload?.data ?? payload) as T);
}

async function fetchApi(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  Object.entries(authHeader()).forEach(([key, value]) => headers.set(key, value));

  return fetch(`${apiUrl}${path}`, {
    credentials: "include",
    ...init,
    headers
  });
}

async function refreshAdminSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const currentSession = getStoredSession();
    if (!currentSession?.refreshToken) {
      throw new Error("Admin session expired. Please sign in again.");
    }

    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentSession.refreshToken })
    });
    const tokens = await parseResponse<{ accessToken: string; refreshToken: string; sessionId?: string }>(response, "/auth/refresh");
    const nextSession = {
      ...currentSession,
      id: tokens.sessionId ?? currentSession.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
    saveStoredSession(nextSession);
    return nextSession;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  let response: Response;
  try {
    response = await fetchApi(path, init);
  } catch {
    throw new Error(networkErrorMessage());
  }
  const shouldRefresh = retry && response.status === 401 && !["/auth/admin/login", "/auth/login", "/auth/register", "/auth/refresh"].includes(path);
  if (shouldRefresh) {
    try {
      await refreshAdminSession();
    } catch {
      clearStoredSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
      throw new Error("Admin session expired. Please sign in again.");
    }

    try {
      return request<T>(path, init, false);
    } catch (caught) {
      if (caught instanceof Error) throw new Error(friendlyMessage(caught.message, networkErrorMessage()));
      throw new Error(defaultErrorMessage);
    }
  }
  return parseResponse<T>(response, path);
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

function userIdOf(user: unknown) {
  if (!user || typeof user !== "object") return undefined;
  return idOf(user as { _id?: string; id?: string });
}

function mapMoneyRequest(item: Record<string, unknown>): MoneyRequest {
  return {
    id: idOf(item),
    user: formatUser(item.user),
    amount: Number(item.amount ?? 0),
    asset: (item.asset as MoneyRequest["asset"]) ?? "BTC",
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

function mapKyc(item: Record<string, unknown>): KycReviewRecord {
  const user = item.user && typeof item.user === "object" ? item.user as Record<string, unknown> : {};
  const files = Array.isArray(item.files) ? item.files.map(String) : [];
  return {
    id: idOf(item),
    userId: idOf(user),
    userName: String(user.name ?? "Unknown user"),
    userEmail: String(user.email ?? ""),
    userStatus: user.status as KycReviewRecord["userStatus"],
    status: (item.status as KycReviewRecord["status"]) ?? "pending",
    documentType: String(item.documentType ?? "Document"),
    documentNumber: String(item.documentNumber ?? ""),
    country: String(item.country ?? ""),
    files,
    submittedAt: formatDate((item.submittedAt ?? item.createdAt) as string | undefined),
    rejectionReason: item.rejectionReason as string | undefined
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
    userId: userIdOf(item.user),
    priority: (item.priority as SupportTicket["priority"]) ?? "medium",
    status: (item.status as SupportTicket["status"]) ?? "open",
    lastMessageAt: formatDate((messages.at(-1) as { createdAt?: string } | undefined)?.createdAt ?? item.updatedAt as string | undefined),
    messages: messages.map((message) => {
      const record = message as { _id?: string; senderType?: "user" | "admin"; message?: string; createdAt?: string };
      return {
        id: record._id ?? `${idOf(item)}-${record.createdAt ?? ""}`,
        senderType: record.senderType ?? "user",
        senderName: record.senderType === "admin" ? "Support Admin" : formatUser(item.user),
        message: record.message ?? "",
        createdAt: formatDate(record.createdAt)
      };
    })
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

  async kycQueue() {
    const result = await listRequest<Record<string, unknown>>("/users/kyc?limit=100");
    return result.items.map(mapKyc);
  },

  reviewKyc(id: string, input: { status: "approved" | "rejected"; rejectionReason?: string }) {
    return request(`/users/kyc/${id}/review`, { method: "PATCH", body: JSON.stringify(input) });
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

  updatePlan(id: string, input: Record<string, unknown>) {
    return request(`/plans/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },

  deletePlan(id: string) {
    return request(`/plans/${id}`, { method: "DELETE" });
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

  async openUserChat(userId: string) {
    const ticket = await request<Record<string, unknown>>(`/support/users/${userId}/chat`, { method: "POST", body: JSON.stringify({}) });
    return mapTicket(ticket);
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
