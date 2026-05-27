export type AdminRole =
  | "super_admin"
  | "admin"
  | "finance"
  | "compliance"
  | "support"
  | "auditor";

export type Permission =
  | "users:read"
  | "users:write"
  | "plans:write"
  | "deposits:approve"
  | "withdrawals:approve"
  | "kyc:review"
  | "settings:write"
  | "support:write"
  | "notifications:send"
  | "security:read";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

export type UserStatus = "active" | "banned" | "pending" | "flagged";
export type KycStatus = "not_submitted" | "pending" | "approved" | "rejected";
export type TransactionStatus = "pending" | "approved" | "rejected" | "paid" | "failed";

export type AdminSession = {
  id: string;
  adminId: string;
  name?: string;
  email?: string;
  role: AdminRole;
  permissions: Permission[];
  expiresAt: string;
  accessToken?: string;
  refreshToken?: string;
};

export type DashboardMetric = {
  label: string;
  value: number;
  change: number;
  currency?: string;
};

export type ChartPoint = {
  label: string;
  deposits: number;
  withdrawals: number;
  revenue: number;
  profit: number;
  users: number;
};

export type Activity = {
  id: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
  createdAt: string;
  tone: StatusTone;
};

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  kyc: KycStatus;
  balance: number;
  invested: number;
  referrals: number;
  joinedAt: string;
  lastSeen: string;
};

export type KycReviewRecord = {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  userStatus?: UserStatus;
  status: KycStatus;
  documentType: string;
  documentNumber: string;
  country: string;
  files: string[];
  submittedAt: string;
  rejectionReason?: string;
};

export type InvestmentPlan = {
  id: string;
  name: string;
  roi: number;
  roiType: "daily" | "fixed";
  fixedReturnAmount: number;
  durationDays: number;
  minAmount: number;
  maxAmount: number;
  compounding: boolean;
  enabled: boolean;
  investors: number;
  tvl: number;
};

export type InvestmentRecord = {
  id: string;
  user: string;
  userEmail: string;
  plan: string;
  amount: number;
  asset: "BTC";
  roiType: "daily" | "fixed";
  roiDisplay: string;
  dailyReturn: number;
  accruedProfit: number;
  paidProfit: number;
  totalReturn: number;
  status: "active" | "matured" | "cancelled";
  startsAt: string;
  maturesAt: string;
  createdAt: string;
};

export type MoneyRequest = {
  id: string;
  user: string;
  amount: number;
  asset: "BTC";
  status: TransactionStatus;
  txHash?: string;
  wallet?: string;
  riskScore: number;
  createdAt: string;
};

export type ReferralRow = {
  id: string;
  referrer: string;
  referred: string;
  commission: number;
  status: "pending" | "paid";
  tier: number;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  socketId?: string;
  subject: string;
  user: string;
  userId?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "pending" | "closed";
  lastMessageAt: string;
  messages?: Array<{
    id: string;
    senderType: "user" | "admin";
    senderName: string;
    message: string;
    createdAt: string;
  }>;
};

export type SecurityEvent = {
  id: string;
  type: string;
  actor: string;
  ip: string;
  severity: "low" | "medium" | "high" | "critical";
  createdAt: string;
};
