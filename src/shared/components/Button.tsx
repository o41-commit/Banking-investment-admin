"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-graphite",
  secondary: "border border-line bg-white text-ink hover:bg-slate-50",
  danger: "bg-danger text-white hover:bg-red-700",
  ghost: "text-slate-700 hover:bg-slate-100"
};

export function Button({
  className,
  children,
  icon,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
