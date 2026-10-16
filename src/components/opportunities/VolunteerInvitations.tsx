"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { respondToOpportunityInvitation } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/dates";
import type { VolunteerOpportunityWithOrganization } from "@/types/database";

export function VolunteerInvitations({ invitations }: {
  invitations: { id: string; opportunity: VolunteerOpportunityWithOrganization; canAccept: boolean }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const remaining = invitations.filter((invitation) => !answered.has(invitation.id));
  if (!remaining.length) return null;

  function respond(id: string, accept: boolean) {
    setRespondingId(id);
    startTransition(async () => {
      try {
        const result = await respondToOpportunityInvitation(id, accept);
        if (result.error) toast.error(result.error);
        else {
          setAnswered((current) => new Set(current).add(id));
          toast.success(accept ? "Invitation accepted. You are registered!" : "Invitation declined");
        }
      } catch {
        toast.error("Could not confirm your response. Refresh and try again.");
      } finally {
        setRespondingId(null);
        router.refresh();
      }
    });
  }

  return (
    <section id="invitations" className="mt-6 scroll-mt-6 space-y-3" aria-labelledby="invitations-heading">
      <h2 id="invitations-heading" className="text-xl font-semibold">Opportunity invitations ({remaining.length})</h2>
      {remaining.map(({ id, opportunity, canAccept }) => (
        <article key={id} className="space-y-3 rounded-lg border border-violet-200 bg-white p-5">
          <div>
            <p className="text-sm text-slate-500">{opportunity.organizations?.name}</p>
            <h3 className="text-lg font-semibold">{opportunity.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{formatDate(opportunity.date)} · {formatTime(opportunity.start_time)} – {formatTime(opportunity.end_time)}</p>
            <p className="text-sm text-slate-600">{opportunity.location}</p>
          </div>
          {opportunity.description && <p className="whitespace-pre-wrap text-sm">{opportunity.description}</p>}
          {opportunity.experience_required && <p className="text-sm">Experience: {opportunity.experience_required}</p>}
          {!canAccept && <p className="text-sm text-amber-800">This opportunity is no longer available to accept.</p>}
          <div className="flex gap-3">
            <Button disabled={isPending || !canAccept} onClick={() => respond(id, true)}>Accept invitation</Button>
            <Button variant="outline" disabled={isPending} onClick={() => respond(id, false)}>Decline</Button>
            {respondingId === id && <span role="status" className="self-center text-sm text-slate-500">Saving…</span>}
          </div>
        </article>
      ))}
    </section>
  );
}
