"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { VolunteerCalendar } from "@/components/calendar/VolunteerCalendar";
import { OpportunityDetailsDialog } from "@/components/calendar/OpportunityDetailsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatTime } from "@/lib/dates";
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
      (registrationFilter === "registered" && bookingStatus === "approved") ||
      (registrationFilter === "requested" && bookingStatus === "pending");

    return matchesOrganization && matchesRegistration;
  });

  function handleOpportunitySelect(opportunity: VolunteerOpportunityWithOrganization) {
    setSelectedOpportunity(opportunity);
    setDialogOpen(true);
  }

  return (
    <section id="calendar">
      <Tabs defaultValue="calendar">
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
          <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto] items-end">
            <div className="space-y-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                View
              </span>
              <TabsList className="!h-10 w-40 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <TabsTrigger className="min-w-0 px-3" value="calendar">
                  Calendar
                </TabsTrigger>
                <TabsTrigger className="min-w-0 px-3" value="list">
                  List
                </TabsTrigger>
              </TabsList>
            </div>

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

        <TabsContent value="calendar">
          <VolunteerCalendar
            opportunities={filteredOpportunities}
            approvedCounts={approvedCounts}
            userBookingOpportunityIds={userBookingOpportunityIds}
            onOpportunitySelect={handleOpportunitySelect}
          />
        </TabsContent>

        <TabsContent value="list">
          <div className="rounded-lg border border-white/70 bg-white/85 p-4 shadow-sm shadow-slate-950/5 sm:p-5">
            {filteredOpportunities.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 py-12 text-center text-sm text-slate-500">
                No opportunities match this filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {filteredOpportunities.map((opportunity) => {
                  const bookingStatus = userBookingStatuses[opportunity.id];
                  const registered = approvedCounts[opportunity.id] ?? 0;
                  const statusLabel =
                    bookingStatus === "approved"
                      ? "Registered"
                      : bookingStatus === "pending"
                      ? "Requested"
                      : "Open";
                  const badgeClassName =
                    bookingStatus === "approved"
                      ? "bg-blue-50 text-blue-800"
                      : bookingStatus === "pending"
                      ? "bg-amber-50 text-amber-800"
                      : "bg-emerald-50 text-emerald-800";

                  return (
                    <button
                      key={opportunity.id}
                      type="button"
                      onClick={() => handleOpportunitySelect(opportunity)}
                      className="grid w-full gap-3 px-4 py-3 text-left transition hover:bg-emerald-50/50 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">
                            {opportunity.title}
                          </p>
                          <Badge variant="secondary" className={badgeClassName}>
                            {statusLabel}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {opportunity.organizations?.name ?? "Independent"} ·{" "}
                          {opportunity.location}
                        </p>
                      </div>
                      <div className="grid gap-1 text-sm text-slate-600 sm:text-right">
                        <span className="font-medium text-slate-900">
                          {formatDate(opportunity.date)}
                        </span>
                        <span className="whitespace-nowrap">
                          {formatTime(opportunity.start_time)} to{" "}
                          {formatTime(opportunity.end_time)}
                        </span>
                        <span className="whitespace-nowrap">
                          {registered}/{opportunity.max_volunteers} registered
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

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
