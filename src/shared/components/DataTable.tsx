"use client";

import { ArrowDownUp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "./Button";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T extends { id: string }> = {
  rows: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchPlaceholder = "Search",
  filters,
  rowActions
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const visibleRows = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    const filtered = lowerQuery
      ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(lowerQuery))
      : rows;

    if (!sortKey) return filtered;

    return [...filtered].sort((a, b) => {
      const left = String((a as Record<string, unknown>)[sortKey] ?? "");
      const right = String((b as Record<string, unknown>)[sortKey] ?? "");
      return sortDirection === "asc" ? left.localeCompare(right) : right.localeCompare(left);
    });
  }, [query, rows, sortDirection, sortKey]);

  function toggleSort(key: string) {
    setSortKey(key);
    setSortDirection((current) => (sortKey === key && current === "asc" ? "desc" : "asc"));
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => {
                const key = String(column.key);
                return (
                  <th
                    key={key}
                    className={cn("whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600", column.className)}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        className="-ml-2 h-8 px-2"
                        icon={<ArrowDownUp size={14} />}
                        onClick={() => toggleSort(key)}
                        aria-label={`Sort by ${column.header}`}
                      >
                        {column.header}
                      </Button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions ? <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {visibleRows.map((row) => (
              <tr key={row.id} className="transition hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={String(column.key)} className={cn("whitespace-nowrap px-4 py-3 text-slate-700", column.className)}>
                    {column.render ? column.render(row) : String((row as Record<string, unknown>)[String(column.key)] ?? "")}
                  </td>
                ))}
                {rowActions ? <td className="px-4 py-3 text-right">{rowActions(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
