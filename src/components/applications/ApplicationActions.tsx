"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  acceptOrganizationApplication,
  rejectOrganizationApplication,
  updateOrganizationApplicationStatus,
} from "@/lib/actions";
import type { OrganizationApplication } from "@/types/database";

interface ApplicationActionsProps {
  application: OrganizationApplication;
}

export function ApplicationActions({ application }: ApplicationActionsProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const reasonId = useId();

  async function handleAccept() {
    const result = await acceptOrganizationApplication(application.id);
    if (result.error) {
      toast.error(result.error);
    } else if (result.warning) {
      toast.warning(result.warning);
    } else {
      toast.success("Application accepted");
    }
  }

  async function handleReject() {
    if (rejecting) return;
    if (!reason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setRejecting(true);
    try {
      const result = await rejectOrganizationApplication(application.id, reason);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setRejectOpen(false);
      setReason("");
      if (result.warning) toast.warning(result.warning);
      else toast.success("Application rejected");
    } catch {
      toast.error("Unable to confirm rejection. Refresh the application to check its status.");
    } finally {
      setRejecting(false);
    }
  }

  async function handleMarkContacted() {
    const result = await updateOrganizationApplicationStatus(
      application.id,
      "contacted"
    );
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
      <Button variant="destructive" onClick={() => setRejectOpen(true)}>
        Reject
      </Button>
      <Dialog open={rejectOpen} onOpenChange={(open) => { if (!rejecting) setRejectOpen(open); }}>
        <DialogContent showCloseButton={!rejecting}>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>
              Explain why {application.organization_name}&apos;s application is being rejected. This reason will be shared with the organization by email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); void handleReject(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={reasonId}>Reason for rejection (required)</Label>
              <Textarea id={reasonId} value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={2000} rows={5} disabled={rejecting} placeholder="Explain the decision and any relevant next steps." />
              <p className="text-xs text-muted-foreground">{reason.length}/2,000 characters</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={rejecting} onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={rejecting || !reason.trim()}>{rejecting ? "Rejecting..." : "Reject and notify organization"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
