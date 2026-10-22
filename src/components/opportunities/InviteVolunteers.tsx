"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inviteVolunteersToOpportunity } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookingStatus } from "@/types/database";

export interface InvitableVolunteer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  bookingStatus?: BookingStatus;
}

export function InviteVolunteers({ opportunityId, volunteers, canInvite }: {
  opportunityId: string;
  volunteers: InvitableVolunteer[];
  canInvite: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const query = search.trim().toLowerCase();
  const matches = volunteers.filter((volunteer) =>
    `${volunteer.first_name} ${volunteer.last_name} ${volunteer.email}`.toLowerCase().includes(query)
  );

  function unavailable(volunteer: InvitableVolunteer) {
    if (["approved", "completed"].includes(volunteer.bookingStatus ?? "")) return "Joined";
    if (volunteer.bookingStatus === "invited") return "Invited";
    if (volunteer.bookingStatus === "pending") return "Awaiting review";
    if (volunteer.status !== "active") return "Inactive";
    return null;
  }
  const eligible = matches.filter((volunteer) => !unavailable(volunteer));
  const allSelected = eligible.length > 0 && eligible.every((volunteer) => selected.has(volunteer.id));
  const selectedIds = volunteers.filter((volunteer) => selected.has(volunteer.id) && !unavailable(volunteer)).map((volunteer) => volunteer.id);

  function inviteSelected() {
    startTransition(async () => {
      let invited = 0;
      let skipped = 0;
      try {
        for (let offset = 0; offset < selectedIds.length; offset += 100) {
          const result = await inviteVolunteersToOpportunity(opportunityId, selectedIds.slice(offset, offset + 100));
          if (result.error) { toast.error(result.error); break; }
          const sentIds = (result.results ?? []).filter((result) => result.outcome === "invited").map((result) => result.volunteer_id);
          invited += sentIds.length;
          skipped += (result.results?.length ?? 0) - sentIds.length;
          setSelected((current) => {
            const next = new Set(current);
            for (const resultRow of result.results ?? []) next.delete(resultRow.volunteer_id);
            return next;
          });
        }
        if (invited) toast.success(`${invited} invitation${invited === 1 ? "" : "s"} sent`);
        if (skipped) toast.info(`${skipped} volunteer${skipped === 1 ? " is" : "s are"} no longer eligible to invite`);
      } catch {
        toast.error("Could not finish sending invitations. Refresh to check which were sent before trying again.");
      } finally {
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-4" aria-labelledby="invite-volunteers-heading">
      <h2 id="invite-volunteers-heading" className="text-lg font-semibold">Invite volunteers</h2>
      <Input aria-label="Search organization volunteers" placeholder="Search by volunteer name or email" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(10); }} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={allSelected} disabled={isPending || !canInvite || eligible.length === 0}
            onChange={() => setSelected((current) => {
              const next = new Set(current);
              for (const volunteer of eligible) { if (allSelected) next.delete(volunteer.id); else next.add(volunteer.id); }
              return next;
            })} />
          Select all{query ? " matching" : ""} ({eligible.length})
        </label>
        <span className="text-sm text-slate-500" aria-live="polite">{selectedIds.length} selected · {matches.length} volunteers</span>
      </div>
      <div className="max-h-80 overflow-y-auto rounded-lg border bg-white" tabIndex={0} role="region" aria-label="Organization volunteers"
        onScroll={(event) => {
          const target = event.currentTarget;
          if (target.scrollHeight - target.scrollTop - target.clientHeight < 60) setVisibleCount((count) => Math.min(count + 10, matches.length));
        }}>
        <ul className="divide-y">
          {matches.slice(0, visibleCount).map((volunteer) => {
            const state = unavailable(volunteer);
            const name = `${volunteer.first_name} ${volunteer.last_name}`.trim() || volunteer.email;
            return (
              <li key={volunteer.id} className="flex items-center gap-3 px-4 py-4">
                <input type="checkbox" aria-label={`Select ${name}`} checked={!state && selected.has(volunteer.id)} disabled={Boolean(state) || isPending || !canInvite}
                  onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(volunteer.id)) next.delete(volunteer.id); else next.add(volunteer.id); return next; })} />
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/organization/volunteers/${volunteer.id}?returnTo=${encodeURIComponent(`/dashboard/organization/opportunities/${opportunityId}/edit`)}`} className="font-semibold text-slate-950 hover:text-emerald-800 hover:underline">{name}</Link>
                  <p className="truncate text-sm text-slate-500">{volunteer.email}</p>
                </div>
                {state && <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{state}</span>}
              </li>
            );
          })}
        </ul>
        {matches.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No matching organization members.</p>}
        {visibleCount < matches.length && <Button type="button" variant="ghost" className="w-full" onClick={() => setVisibleCount((count) => count + 10)}>Load more volunteers</Button>}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={isPending || !canInvite || selectedIds.length === 0} onClick={inviteSelected}>{isPending ? "Sending invitations…" : `Invite selected (${selectedIds.length})`}</Button>
        {selectedIds.length > 0 && <Button type="button" variant="ghost" disabled={isPending} onClick={() => setSelected(new Set())}>Clear selection</Button>}
      </div>
    </section>
  );
}
