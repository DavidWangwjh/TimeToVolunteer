"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  approveOrganizationMembership,
  rejectOrganizationMembership,
} from "@/lib/actions";

export function MembershipActions({ membershipId }: { membershipId: string }) {
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(
    null
  );

  async function handleApprove() {
    setPendingAction("approve");
    const result = await approveOrganizationMembership(membershipId);
    setPendingAction(null);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Volunteer accepted");
    }
  }

  async function handleReject() {
    setPendingAction("reject");
    const result = await rejectOrganizationMembership(membershipId);
    setPendingAction(null);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Request rejected");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        className="bg-emerald-800 hover:bg-emerald-700"
        disabled={pendingAction !== null}
        onClick={handleApprove}
      >
        {pendingAction === "approve" ? "Accepting..." : "Accept"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pendingAction !== null}
        onClick={handleReject}
      >
        {pendingAction === "reject" ? "Rejecting..." : "Reject"}
      </Button>
    </div>
  );
}
