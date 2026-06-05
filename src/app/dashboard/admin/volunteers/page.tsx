import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
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
import type { ProfileStatus } from "@/types/database";

interface VolunteersPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function VolunteersPage({
  searchParams,
}: VolunteersPageProps) {
  const { q = "", status = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "volunteer")
    .order("created_at", { ascending: false });

  const trimmedSearch = q.trim();
  if (trimmedSearch) {
    query = query.or(
      `first_name.ilike.%${trimmedSearch}%,last_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%`
    );
  }

  if (["active", "inactive", "suspended"].includes(status)) {
    query = query.eq("status", status as ProfileStatus);
  }

  const { data: volunteers } = await query;

  return (
    <div className="space-y-4">
      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5 md:grid-cols-[1fr_220px_auto] md:items-end">
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search
          </span>
          <Input name="q" defaultValue={q} placeholder="Name or email" />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
          </span>
          <select
            name="status"
            defaultValue={status}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-emerald-500"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <Button type="submit">Filter</Button>
      </form>

      {(volunteers ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 py-12 text-center text-sm text-slate-500">
          No volunteers yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(volunteers ?? []).map((v) => (
                <TableRow key={v.id} className="hover:bg-emerald-50/40">
                  <TableCell className="font-semibold text-slate-950">
                    {v.first_name} {v.last_name}
                  </TableCell>
                  <TableCell className="text-slate-600">{v.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/admin/volunteers/${v.id}`}
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
