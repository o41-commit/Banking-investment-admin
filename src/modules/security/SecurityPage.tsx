"use client";

import { LockKeyhole, Radar, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { Button } from "@/shared/components/Button";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { MetricCard } from "@/shared/components/MetricCard";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { StatusBadge } from "@/shared/components/StatusBadge";
import type { SecurityEvent, StatusTone } from "@/shared/types";

const severityTone: Record<SecurityEvent["severity"], StatusTone> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
  critical: "danger"
};

export function SecurityPage() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.securityEvents()
      .then(setSecurityEvents)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load audit logs"));
  }, []);

  const columns: Column<SecurityEvent>[] = [
    { key: "id", header: "Event", sortable: true },
    { key: "type", header: "Type", sortable: true },
    { key: "actor", header: "Actor", sortable: true },
    { key: "ip", header: "IP address", sortable: true },
    { key: "severity", header: "Severity", render: (row) => <StatusBadge tone={severityTone[row.severity]}>{row.severity}</StatusBadge> },
    { key: "createdAt", header: "Created" }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Security features"
        title="Admin logs, IP tracking, suspicious activity, and audit trails"
        actions={<Button icon={<Radar size={17} />}>Run threat scan</Button>}
      />
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Suspicious Attempts" value={securityEvents.filter((item) => item.severity === "high" || item.severity === "critical").length} change={0} icon={<ShieldAlert size={18} />} />
        <MetricCard label="Approval Layers Active" value={2} change={0} icon={<LockKeyhole size={18} />} />
        <MetricCard label="Audit Events" value={securityEvents.length} change={0} icon={<Radar size={18} />} />
      </section>
      <DataTable rows={securityEvents} columns={columns} searchPlaceholder="Search IPs, actors, audit logs, severity" />
    </div>
  );
}
