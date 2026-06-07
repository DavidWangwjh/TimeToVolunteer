"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cancelBooking, requestBooking } from "@/lib/actions";
import {
  formatDate,
  formatTime,
  isOpportunityPast,
} from "@/lib/dates";
import type {
  BookingStatus,
  VolunteerOpportunityWithOrganization,
} from "@/types/database";

interface OpportunityDetailsDialogProps {
  opportunity: VolunteerOpportunityWithOrganization;
  approvedCount: number;
  hasExistingBooking: boolean;
  existingBookingId?: string;
  existingBookingStatus?: BookingStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpportunityDetailsDialog({
  opportunity,
  approvedCount,
  hasExistingBooking,
  existingBookingId,
  existingBookingStatus,
  open,
  onOpenChange,
}: OpportunityDetailsDialogProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isFull = approvedCount >= opportunity.max_volunteers;
  const isPast = isOpportunityPast(opportunity);
  const canCancel =
    Boolean(existingBookingId) &&
    existingBookingStatus !== undefined &&
    ["pending", "approved"].includes(existingBookingStatus);

  const canBook =
    !hasExistingBooking && !isFull && !isPast && opportunity.status === "published";

  let disabledReason = "";
  if (hasExistingBooking) disabledReason = "You already registered for this session";
  else if (isFull) disabledReason = "This session is full";
  else if (isPast) disabledReason = "This session has passed";
  else if (opportunity.status !== "published") disabledReason = "Not available for registration";

  async function handleRequestBooking() {
    setLoading(true);
    const result = await requestBooking({
      opportunity_id: opportunity.id,
      volunteer_note: note || undefined,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Registration submitted");
      onOpenChange(false);
    }
  }

  async function handleCancelBooking() {
    if (!existingBookingId || !existingBookingStatus) return;

    setCancelling(true);
    const result = await cancelBooking(existingBookingId);
    setCancelling(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        existingBookingStatus === "pending"
          ? "Registration request cancelled"
          : "Registration cancelled"
      );
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{opportunity.title}</DialogTitle>
          {opportunity.description && (
            <DialogDescription>{opportunity.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{formatDate(opportunity.date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-medium">
                {formatTime(opportunity.start_time)} – {formatTime(opportunity.end_time)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Organization</dt>
              <dd className="font-medium">
                {opportunity.organizations ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(
                        `/dashboard/volunteer/organizations/${opportunity.organizations!.id}`
                      );
                    }}
                    className="font-medium text-emerald-800 hover:underline"
                  >
                    {opportunity.organizations.name}
                  </button>
                ) : (
                  "Independent"
                )}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Location</dt>
              <dd className="font-medium">{opportunity.location}</dd>
            </div>
            {opportunity.experience_required && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Required Experience</dt>
                <dd className="font-medium">{opportunity.experience_required}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Registered</dt>
              <dd className="font-medium">
                {approvedCount} of {opportunity.max_volunteers}
              </dd>
            </div>
          </dl>

          {canBook && (
            <div className="space-y-2">
              <Label htmlFor="volunteer_note">Note (optional)</Label>
              <Textarea
                id="volunteer_note"
                placeholder="Anything the organizer should know..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}

          {canBook ? (
            <Button
              className="w-full"
              onClick={handleRequestBooking}
              disabled={loading}
            >
              {loading ? "Submitting..." : opportunity.visibility == "public"? "Register" : "Request registration"}
            </Button>
          ) : canCancel ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={handleCancelBooking}
              disabled={cancelling}
            >
              {cancelling
                ? "Cancelling..."
                : existingBookingStatus === "pending"
                  ? "Cancel Request"
                  : "Cancel Registration"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              {disabledReason}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
