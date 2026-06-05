"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  leaveOrganizationMembership,
  requestOrganizationMembership,
} from "@/lib/actions";

export function OrganizationRequestButton({
  organizationId,
  organizationVisibility = "private",
  membershipStatus,
  allowLeave = false,
}: {
  organizationId: string;
  organizationVisibility?: "public" | "private";
  membershipStatus?: "pending" | "accepted" | "rejected";
  allowLeave?: boolean;
}) {
  const [isPending, setIsPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [upcomingRegistrationCount, setUpcomingRegistrationCount] = useState(0);
  const joined = membershipStatus === "accepted";
  const requested = membershipStatus === "pending";
  const idleLabel =
    organizationVisibility === "public" ? "Join" : "Request to Join";
  const label = joined
    ? allowLeave
      ? "Leave Organization"
      : "Joined"
    : requested
      ? allowLeave
        ? "Cancel Request"
        : "Join Requested"
      : idleLabel;

  async function handleRequest() {
    if ((joined || requested) && !allowLeave) return;

    const willRequestPublicJoin =
      !joined && !requested && organizationVisibility === "public";
    setIsPending(true);
    const result =
      joined || requested
        ? await leaveOrganizationMembership(organizationId)
        : await requestOrganizationMembership(organizationId);

    if (
      joined &&
      "requiresConfirmation" in result &&
      result.requiresConfirmation
    ) {
      const count = result.upcomingRegistrationCount;
      setIsPending(false);
      setUpcomingRegistrationCount(count);
      setConfirmOpen(true);
      return;
    }

    setIsPending(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      if (joined) toast.success("Left organization");
      else if (requested) toast.success("Join request cancelled");
      else toast.success(willRequestPublicJoin ? "Joined" : "Request sent");
    }
  }

  async function handleConfirmedLeave() {
    setIsPending(true);
    const result = await leaveOrganizationMembership(organizationId, true);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      setConfirmOpen(false);
      toast.success("Left organization and cancelled upcoming registrations");
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={allowLeave && (joined || requested) ? "outline" : "default"}
        className={
          allowLeave && (joined || requested)
            ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            : "bg-emerald-800 hover:bg-emerald-700"
        }
        disabled={isPending}
        onClick={handleRequest}
      >
        {isPending
          ? joined || requested
            ? "Cancelling..."
            : "Submitting..."
          : label}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave this organization?</DialogTitle>
            <DialogDescription>
              You have {upcomingRegistrationCount} upcoming registration
              {upcomingRegistrationCount === 1 ? "" : "s"} or request
              {upcomingRegistrationCount === 1 ? "" : "s"} with this
              organization. Leaving will cancel all of them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setConfirmOpen(false)}
            >
              Keep Membership
            </Button>
            <Button
              type="button"
              className="bg-rose-700 hover:bg-rose-600"
              disabled={isPending}
              onClick={handleConfirmedLeave}
            >
              {isPending ? "Leaving..." : "Leave and Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
