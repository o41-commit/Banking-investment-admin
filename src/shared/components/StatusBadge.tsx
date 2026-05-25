import { cn } from "@/shared/lib/utils";
import type { StatusTone } from "@/shared/types";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusTone;
};

const tones: Record<StatusTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200"
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1", tones[tone])}>
      {children}
    </span>
  );
}
