"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resubmitOrganizationApplication } from "@/lib/actions";

export function ResubmitApplicationForm() {
  const id = useId();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form className="mt-4 space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      if (pending || !reason.trim()) return;
      setPending(true);
      try {
        const result = await resubmitOrganizationApplication(reason);
        if (result.error) { toast.error(result.error); return; }
        if (result.warning) toast.warning(result.warning);
        else toast.success("Application resubmitted for review");
        router.refresh();
      } catch {
        toast.error("Unable to confirm resubmission. Refresh to check your application status.");
      } finally { setPending(false); }
    }}>
      <Label htmlFor={id}>What have you updated? (required)</Label>
      <Textarea id={id} value={reason} onChange={event => setReason(event.target.value)} required maxLength={2000} disabled={pending} placeholder="Explain how you addressed the rejection reason and why your organization wants to join." />
      <Button type="submit" disabled={pending || !reason.trim()}>{pending ? "Resubmitting..." : "Resubmit for approval"}</Button>
    </form>
  );
}
