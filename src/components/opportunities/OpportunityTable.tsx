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
import { formatDate, formatTime } from "@/lib/dates";
import type { VolunteerOpportunity } from "@/types/database";

interface OpportunityTableProps {
  opportunities: VolunteerOpportunity[];
  registeredCounts: Record<string, number>;
}

export function OpportunityTable({
  opportunities,
  registeredCounts,
}: OpportunityTableProps) {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 py-12 text-center text-sm text-slate-500">
        No opportunities found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opp) => (
            <TableRow key={opp.id} className="hover:bg-emerald-50/40">
              <TableCell className="font-semibold text-slate-950">{opp.title}</TableCell>
              <TableCell className="text-slate-600">{formatDate(opp.date)}</TableCell>
              <TableCell className="text-slate-600">
                {formatTime(opp.start_time)} – {formatTime(opp.end_time)}
              </TableCell>
              <TableCell className="text-slate-600">{opp.location}</TableCell>
              <TableCell className="font-semibold text-slate-800">
                {registeredCounts[opp.id] ?? 0}/{opp.max_volunteers}
              </TableCell>
              <TableCell>
                <StatusBadge status={opp.status} />
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/opportunities/${opp.id}/edit`}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                >
                  Edit
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
