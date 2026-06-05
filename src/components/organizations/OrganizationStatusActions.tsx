"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateOrganizationStatus } from "@/lib/actions";
import type { OrganizationStatus } from "@/types/database";

interface OrganizationStatusActionsProps {
  organizationId: string;
  currentStatus: OrganizationStatus;
}

export function OrganizationStatusActions({
  organizationId,
  currentStatus,
}: OrganizationStatusActionsProps) {
  async function handleStatusChange(status: OrganizationStatus) {
    const result = await updateOrganizationStatus(organizationId, status);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Organization status updated to ${status}`);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {currentStatus !== "active" && (
        <Button onClick={() => handleStatusChange("active")}>Activate</Button>
      )}
      {currentStatus !== "inactive" && (
        <Button variant="outline" onClick={() => handleStatusChange("inactive")}>
          Set Inactive
        </Button>
      )}
      {currentStatus !== "suspended" && (
        <Button
          variant="destructive"
          onClick={() => handleStatusChange("suspended")}
        >
          Suspend
        </Button>
      )}
    </div>
  );
}
