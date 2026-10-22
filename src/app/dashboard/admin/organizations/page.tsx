import { AdminStatusNavigation } from "@/components/admin/AdminStatusNavigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import {
  getOrganizationVisibilityBadgeClassName,
  getOrganizationVisibilityLabel,
  inferOrganizationCategory,
} from "@/lib/organization-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrganizationVisibility } from "@/types/database";

interface OrganizationsPageProps {
  searchParams: Promise<{ q?: string; status?: string; visibility?: string }>;
}

export default async function OrganizationsPage({
  searchParams,
}: OrganizationsPageProps) {
  const { q = "", status = "all", visibility = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  const trimmedSearch = q.trim();
  if (trimmedSearch) {
    query = query.or(
      `name.ilike.%${trimmedSearch}%,contact_email.ilike.%${trimmedSearch}%,description.ilike.%${trimmedSearch}%`
    );
  }



  if (["public", "private"].includes(visibility)) {
    query = query.eq("visibility", visibility as OrganizationVisibility);
  }

  const { data: allRows } = await query;
  const counts = (allRows ?? []).reduce<Record<string, number>>((counts, row) => { counts.all += 1; counts[row.status] = (counts[row.status] ?? 0) + 1; return counts; }, { all: 0 });
  const organizations = (allRows ?? []).filter(row => status === "all" || row.status === status);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Organizations</h1>
      <AdminStatusNavigation basePath="/dashboard/admin/organizations" currentStatus={status} statuses={["active", "inactive", "suspended"]} filters={{ q, visibility }} counts={counts} />
      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5 md:grid-cols-[1fr_180px_auto] md:items-end">
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search
          </span>
          <Input name="q" defaultValue={q} placeholder="Organization or email" />
        </label>
        <input type="hidden" name="status" value={status} />
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Visibility
          </span>
          <select
            name="visibility"
            defaultValue={visibility}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-emerald-500"
          >
            <option value="all">All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
        <Button type="submit">Filter</Button>
      </form>

      {(organizations ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 py-12 text-center text-sm text-slate-500">
          No organizations found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(organizations ?? []).map((organization) => (
                <TableRow key={organization.id} className="hover:bg-emerald-50/40">
                  <TableCell>
                    <div className="font-semibold text-slate-950">
                      {organization.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {organization.contact_email}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {inferOrganizationCategory(
                      organization.category,
                      organization.description,
                      organization.name
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getOrganizationVisibilityBadgeClassName(
                        organization.visibility
                      )}
                    >
                      {getOrganizationVisibilityLabel(organization.visibility)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={organization.status} />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/admin/organizations/${organization.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                    >
                      View
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
