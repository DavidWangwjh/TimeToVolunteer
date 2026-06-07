"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import { formatDate, formatTime } from "@/lib/dates";
import { approveBooking, rejectBooking, cancelBooking } from "@/lib/actions";
import type {
  Booking,
  Profile,
  VolunteerOpportunityWithOrganization,
} from "@/types/database";

interface BookingRow {
  booking: Booking;
  opportunity?: VolunteerOpportunityWithOrganization;
  volunteer?: Profile;
}

interface BookingTableProps {
  bookings: BookingRow[];
  variant: "volunteer" | "admin";
  showActions?: boolean;
  volunteerBasePath?: string;
}

export type { BookingRow };

export function BookingTable({
  bookings,
  variant,
  showActions = true,
  volunteerBasePath = "/dashboard/admin/volunteers",
}: BookingTableProps) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 py-12 text-center text-sm text-slate-500">
        No registrations found.
      </div>
    );
  }

  async function handleApprove(id: string) {
    const result = await approveBooking(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Registration approved");
    }
  }

  async function handleReject(id: string) {
    const result = await rejectBooking(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Registration rejected");
    }
  }

  async function handleCancel(id: string) {
    const result = await cancelBooking(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Registration cancelled");
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            {variant === "admin" && <TableHead>Volunteer</TableHead>}
            <TableHead>Session</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map(({ booking, opportunity, volunteer }) => (
            <TableRow key={booking.id} className="hover:bg-emerald-50/40">
              {variant === "admin" && (
                <TableCell className="font-medium text-slate-800">
                  {volunteer ? (
                    <Link
                      href={`${volunteerBasePath}/${volunteer.id}`}
                      className="hover:text-emerald-800 hover:underline"
                    >
                      {volunteer.first_name} {volunteer.last_name}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
              )}
              <TableCell className="font-semibold text-slate-950">
                <div>{opportunity?.title ?? "—"}</div>
                {variant === "volunteer" && opportunity?.organizations && (
                  <Link
                    href={`/dashboard/volunteer/organizations/${opportunity.organizations.id}`}
                    className="mt-1 block text-xs font-medium text-emerald-800 hover:underline"
                  >
                    {opportunity.organizations.name}
                  </Link>
                )}
              </TableCell>
              <TableCell className="text-slate-600">
                {opportunity ? formatDate(opportunity.date) : "—"}
              </TableCell>
              <TableCell className="text-slate-600">
                {opportunity
                  ? `${formatTime(opportunity.start_time)} – ${formatTime(opportunity.end_time)}`
                  : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={booking.status} />
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    {variant === "admin" && booking.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(booking.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(booking.id)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {((variant === "volunteer" &&
                      ["pending", "approved"].includes(booking.status)) ||
                      (variant === "admin" && booking.status === "approved")) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => handleCancel(booking.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
