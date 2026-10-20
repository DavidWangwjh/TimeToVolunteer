"use client";

import { useMemo, useState } from "react";
import { VolunteerCalendar } from "@/components/calendar/VolunteerCalendar";
import { OpportunityDetailsDialog } from "@/components/calendar/OpportunityDetailsDialog";
import type {
  BookingStatus,
  VolunteerOpportunityWithOrganization,
} from "@/types/database";

type RegistrationFilter = "all" | "registered" | "requested";

interface VolunteerScheduleSectionProps {
  opportunities: VolunteerOpportunityWithOrganization[];
  approvedCounts: Record<string, number>;
  userBookingOpportunityIds: string[];
  userBookingStatuses: Record<string, BookingStatus>;
  userBookingIds: Record<string, string>;
}

export function VolunteerScheduleSection({
  opportunities,
  approvedCounts,
  userBookingOpportunityIds,
  userBookingStatuses,
  userBookingIds,
}: VolunteerScheduleSectionProps) {
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [registrationFilter, setRegistrationFilter] =
    useState<RegistrationFilter>("all");
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<VolunteerOpportunityWithOrganization | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const organizations = useMemo(
    () =>
      Array.from(
        new Map(
          opportunities
            .filter((opportunity) => opportunity.organizations)
            .map((opportunity) => [
              opportunity.organizations!.id,
              opportunity.organizations!,
            ])
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [opportunities]
  );

  const filteredOpportunities = opportunities.filter((opportunity) => {
    const bookingStatus = userBookingStatuses[opportunity.id];
    const matchesOrganization =
      organizationFilter === "all" ||
      opportunity.organizations?.id === organizationFilter;
    const matchesRegistration =
      registrationFilter === "all" ||
      (registrationFilter === "registered" && ["approved", "completed"].includes(bookingStatus)) ||
      (registrationFilter === "requested" && bookingStatus === "pending");

    return matchesOrganization && matchesRegistration;
  });

  function handleOpportunitySelect(opportunity: VolunteerOpportunityWithOrganization) {
    setSelectedOpportunity(opportunity);
    setDialogOpen(true);
  }

  return (
    <section id="calendar">
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
          <div className="grid gap-3 sm:grid-cols-2 items-end">
            <label className="space-y-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Organization
              </span>
              <select
                value={organizationFilter}
                onChange={(event) => setOrganizationFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="all">All organizations</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Registration
              </span>
              <select
                value={registrationFilter}
                onChange={(event) =>
                  setRegistrationFilter(event.target.value as RegistrationFilter)
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="all">All statuses</option>
                <option value="registered">Registered</option>
                <option value="requested">Requested</option>
              </select>
            </label>
          </div>
        </div>


          <VolunteerCalendar
            opportunities={filteredOpportunities}
            approvedCounts={approvedCounts}
            userBookingOpportunityIds={userBookingOpportunityIds}
            onOpportunitySelect={handleOpportunitySelect}
          />

      {selectedOpportunity && (
        <OpportunityDetailsDialog
          opportunity={selectedOpportunity}
          approvedCount={approvedCounts[selectedOpportunity.id] ?? 0}
          hasExistingBooking={userBookingOpportunityIds.includes(
            selectedOpportunity.id
          )}
          existingBookingId={userBookingIds[selectedOpportunity.id]}
          existingBookingStatus={userBookingStatuses[selectedOpportunity.id]}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </section>
  );
}
