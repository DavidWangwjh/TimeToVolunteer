"use client";

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
import type { Booking, VolunteerOpportunity, Profile } from "@/types/database";

interface BookingRow {
  booking: Booking;
  opportunity?: VolunteerOpportunity;
  volunteer?: Profile;
}

interface BookingTableProps {
  bookings: BookingRow[];
  variant: "volunteer" | "admin";
  showActions?: boolean;
}

export function BookingTable({ bookings, variant, showActions = true }: BookingTableProps) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 py-12 text-center text-sm text-slate-500">
        No bookings found.
      </div>
    );
  }

  async function handleApprove(id: string) {
    const result = await approveBooking(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Booking approved");
    }
  }

  async function handleReject(id: string) {
    const result = await rejectBooking(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Booking rejected");
    }
  }

  async function handleCancel(id: string) {
    const result = await cancelBooking(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Booking cancelled");
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
              {variant === "admin" && volunteer && (
                <TableCell className="font-medium text-slate-800">
                  {volunteer.first_name} {volunteer.last_name}
                </TableCell>
              )}
              <TableCell className="font-semibold text-slate-950">
                {opportunity?.title ?? "—"}
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
                  <div className="flex gap-2">
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
                    {["pending", "approved"].includes(booking.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
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
