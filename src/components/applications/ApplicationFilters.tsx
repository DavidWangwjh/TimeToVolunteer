"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const statuses = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

interface ApplicationFiltersProps {
  currentStatus: string;
}

export function ApplicationFilters({ currentStatus }: ApplicationFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map(({ value, label }) => (
        <Link
          key={value}
          href={value === "all" ? "/admin/applications" : `/admin/applications?status=${value}`}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            currentStatus === value
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-muted-foreground hover:bg-slate-200"
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
