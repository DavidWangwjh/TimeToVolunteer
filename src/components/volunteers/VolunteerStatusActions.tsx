"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateVolunteerStatus } from "@/lib/actions";
import type { ProfileStatus } from "@/types/database";

interface VolunteerStatusActionsProps {
  volunteerId: string;
  currentStatus: ProfileStatus;
}

export function VolunteerStatusActions({
  volunteerId,
  currentStatus,
}: VolunteerStatusActionsProps) {
  async function handleStatusChange(status: ProfileStatus) {
    const result = await updateVolunteerStatus(volunteerId, status);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Volunteer status updated to ${status}`);
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
        <Button variant="destructive" onClick={() => handleStatusChange("suspended")}>
          Suspend
        </Button>
      )}
    </div>
  );
}
