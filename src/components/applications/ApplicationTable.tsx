import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import { formatDate } from "@/lib/dates";
import { inferOrganizationCategory } from "@/lib/organization-display";
import type { OrganizationApplication } from "@/types/database";

interface ApplicationTableProps {
  applications: OrganizationApplication[];
}

export function ApplicationTable({ applications }: ApplicationTableProps) {
  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 py-12 text-center text-sm text-slate-500">
        No applications found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => (
            <TableRow key={app.id} className="hover:bg-emerald-50/40">
              <TableCell className="font-semibold text-slate-950">
                {app.organization_name}
              </TableCell>
              <TableCell className="text-slate-600">
                {inferOrganizationCategory(
                  app.category,
                  app.organization_description,
                  app.organization_name,
                  app.reason
                )}
              </TableCell>
              <TableCell className="text-slate-600">{app.email}</TableCell>
              <TableCell>
                <StatusBadge status={app.status} />
              </TableCell>
              <TableCell className="text-slate-600">
                {formatDate(app.created_at.split("T")[0])}
              </TableCell>
              <TableCell>
                <Link
                  href={`/dashboard/admin/applications/${app.id}`}
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
  );
}
