"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  acceptVolunteerApplication,
  rejectVolunteerApplication,
  updateApplicationStatus,
} from "@/lib/actions";
import type { VolunteerApplication } from "@/types/database";

interface ApplicationActionsProps {
  application: VolunteerApplication;
}

export function ApplicationActions({ application }: ApplicationActionsProps) {
  async function handleAccept() {
    const result = await acceptVolunteerApplication(application.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Application accepted");
      if (result.emailWarning) toast.warning(result.emailWarning);
    }
  }

  async function handleReject() {
    const result = await rejectVolunteerApplication(application.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Application rejected");
    }
  }

  async function handleMarkContacted() {
    const result = await updateApplicationStatus(application.id, "contacted");
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Marked as contacted");
    }
  }

  if (application.status === "accepted" || application.status === "rejected") {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {application.status === "pending" && (
        <Button variant="outline" onClick={handleMarkContacted}>
          Mark as Contacted
        </Button>
      )}
      <Button onClick={handleAccept}>Accept Applicant</Button>
      <Button variant="destructive" onClick={handleReject}>
        Reject
      </Button>
    </div>
  );
}
