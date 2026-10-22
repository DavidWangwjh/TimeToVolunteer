import Link from "next/link";

export function AdminStatusNavigation({ basePath, currentStatus, statuses, filters = {}, counts }: {
  basePath: string; currentStatus: string; statuses: string[]; filters?: Record<string, string>; counts: Record<string, number>;
}) {
  return <nav aria-label="Status categories" className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
    {["all", ...statuses].map(status => {
      const query = new URLSearchParams({ ...filters, status });
      return <Link key={status} href={`${basePath}?${query}`} aria-current={currentStatus === status ? "page" : undefined} className={`shrink-0 rounded-lg px-5 py-3 text-sm font-semibold ${currentStatus === status ? "bg-emerald-800 text-white" : "bg-white text-slate-600 hover:bg-emerald-50"}`}>
        {status === "all" ? "All" : status[0].toUpperCase() + status.slice(1)} ({counts[status] ?? 0})
      </Link>;
    })}
  </nav>;
}
