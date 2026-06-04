"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestOrganizationMembership } from "@/lib/actions";

export function OrganizationRequestButton({
  organizationId,
  organizationVisibility = "private",
  membershipStatus,
}: {
  organizationId: string;
  organizationVisibility?: "public" | "private";
  membershipStatus?: "pending" | "accepted" | "rejected";
}) {
  const [isPending, setIsPending] = useState(false);
  const joined = membershipStatus === "accepted";
  const requested = membershipStatus === "pending";
  const idleLabel =
    organizationVisibility === "public" ? "Join" : "Request to Join";
  const label = joined ? "Joined" : requested ? "Join Requested" : idleLabel;

  async function handleRequest() {
    if (joined || requested) return;

    setIsPending(true);
    const result = await requestOrganizationMembership(organizationId);
    setIsPending(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(result.status === "accepted" ? "Joined" : "Request sent");
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      className="bg-emerald-800 hover:bg-emerald-700"
      disabled={isPending || joined || requested}
      onClick={handleRequest}
    >
      {isPending ? "Submitting..." : label}
    </Button>
  );
}
