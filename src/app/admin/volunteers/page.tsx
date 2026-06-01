import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function VolunteersPage() {
  const supabase = await createClient();

  const { data: volunteers } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "volunteer")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        eyebrow="Directory"
        title="Volunteers"
        description="Manage volunteer accounts."
      />

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
                      href={`/admin/volunteers/${v.id}`}
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
