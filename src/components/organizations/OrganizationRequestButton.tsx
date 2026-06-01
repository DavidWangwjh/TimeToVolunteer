"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestOrganizationMembership } from "@/lib/actions";

export function OrganizationRequestButton({
  organizationId,
}: {
  organizationId: string;
}) {
  const [isPending, setIsPending] = useState(false);

  async function handleRequest() {
    setIsPending(true);
    const result = await requestOrganizationMembership(organizationId);
    setIsPending(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Request sent");
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      className="bg-emerald-800 hover:bg-emerald-700"
      disabled={isPending}
      onClick={handleRequest}
    >
      {isPending ? "Requesting..." : "Request Access"}
    </Button>
  );
}
