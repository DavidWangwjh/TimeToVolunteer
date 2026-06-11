"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { assignVolunteerToOpportunity } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Profile } from "@/types/database";

export type AssignableVolunteer = Pick<
  Profile,
  | "id"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "date_of_birth"
  | "volunteer_interests"
  | "volunteer_intro"
>;

interface AssignVolunteerSearchProps {
  opportunityId: string;
  volunteers: AssignableVolunteer[];
}

function getVolunteerName(volunteer: AssignableVolunteer) {
  const name = [volunteer.first_name, volunteer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || volunteer.email || "Volunteer account";
}

function getAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;

  const birthday = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birthday.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDifference = today.getMonth() - birthday.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthday.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function AssignVolunteerSearch({
  opportunityId,
  volunteers,
}: AssignVolunteerSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [selectedVolunteer, setSelectedVolunteer] =
    useState<AssignableVolunteer | null>(null);
  const [pendingVolunteerId, setPendingVolunteerId] = useState<string | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const availableVolunteers = useMemo(
    () => volunteers.filter((volunteer) => !assignedIds.has(volunteer.id)),
    [assignedIds, volunteers]
  );

  const results = useMemo(() => {
    if (submittedQuery === null) return [];

    const normalizedQuery = submittedQuery.trim().toLowerCase();

    if (!normalizedQuery) return availableVolunteers;

    return availableVolunteers.filter((volunteer) => {
      const name = getVolunteerName(volunteer).toLowerCase();
      return (
        name.includes(normalizedQuery) ||
        volunteer.email.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [availableVolunteers, submittedQuery]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query);
  }

  function handleAssign(volunteer: AssignableVolunteer) {
    setPendingVolunteerId(volunteer.id);
    startTransition(async () => {
      const result = await assignVolunteerToOpportunity({
        opportunityId,
        volunteerId: volunteer.id,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setAssignedIds((current) => new Set(current).add(volunteer.id));
        toast.success(`${getVolunteerName(volunteer)} assigned`);
        router.refresh();
      }

      setPendingVolunteerId(null);
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-slate-50/70 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-950">
          Assign volunteer
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Search accepted organization members who are not registered for this
          opportunity.
        </p>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSearch}>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by volunteer name"
          className="h-10 bg-white"
        />
        <Button type="submit" className="h-10 sm:w-auto">
          <Search className="size-4" />
          Search
        </Button>
      </form>

      {submittedQuery !== null && (
        <div className="overflow-hidden rounded-lg border bg-white">
          {results.length > 0 ? (
            <ul className="divide-y">
              {results.map((volunteer) => {
                const age = getAge(volunteer.date_of_birth);
                return (
                  <li
                    key={volunteer.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedVolunteer(volunteer)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-semibold text-slate-950 hover:text-emerald-800 hover:underline">
                        {getVolunteerName(volunteer)}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {age === null ? "Age unavailable" : `${age} years old`}
                      </span>
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAssign(volunteer)}
                      disabled={isPending}
                    >
                      {pendingVolunteerId === volunteer.id
                        ? "Assigning..."
                        : "Assign"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matching volunteers found.
            </p>
          )}
        </div>
      )}

      <Dialog
        open={Boolean(selectedVolunteer)}
        onOpenChange={(open) => {
          if (!open) setSelectedVolunteer(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {selectedVolunteer && (
            <>
              <DialogHeader>
                <DialogTitle>{getVolunteerName(selectedVolunteer)}</DialogTitle>
                <DialogDescription>
                  Volunteer profile details
                </DialogDescription>
              </DialogHeader>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="font-medium text-slate-950">Age</dt>
                  <dd className="mt-1 text-muted-foreground">
                    {getAge(selectedVolunteer.date_of_birth) ?? "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-950">Email</dt>
                  <dd className="mt-1 text-muted-foreground">
                    {selectedVolunteer.email}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-950">Phone</dt>
                  <dd className="mt-1 text-muted-foreground">
                    {selectedVolunteer.phone ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-950">Interests</dt>
                  <dd className="mt-1 text-muted-foreground">
                    {selectedVolunteer.volunteer_interests?.length
                      ? selectedVolunteer.volunteer_interests.join(", ")
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-950">
                    Self introduction
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {selectedVolunteer.volunteer_intro ?? "-"}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
