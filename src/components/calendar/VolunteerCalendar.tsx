"use client";

import "./fullcalendar.css";
import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import { OpportunityDetailsDialog } from "./OpportunityDetailsDialog";
import type { VolunteerOpportunityWithOrganization } from "@/types/database";
import { formatTime } from "@/lib/dates";

interface VolunteerCalendarProps {
  opportunities: VolunteerOpportunityWithOrganization[];
  approvedCounts: Record<string, number>;
  userBookingOpportunityIds: string[];
}

export function VolunteerCalendar({
  opportunities,
  approvedCounts,
  userBookingOpportunityIds,
}: VolunteerCalendarProps) {
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<VolunteerOpportunityWithOrganization | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [registrationFilter, setRegistrationFilter] = useState("all");

  const organizations = Array.from(
    new Map(
      opportunities
        .filter((opp) => opp.organizations)
        .map((opp) => [opp.organizations!.id, opp.organizations!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filteredOpportunities = opportunities.filter((opp) => {
    const isBooked = userBookingOpportunityIds.includes(opp.id);
    const matchesOrganization =
      organizationFilter === "all" ||
      opp.organizations?.id === organizationFilter;
    const matchesRegistration =
      registrationFilter === "all" ||
      (registrationFilter === "registered" && isBooked) ||
      (registrationFilter === "not_registered" && !isBooked);

    return matchesOrganization && matchesRegistration;
  });

  const events = filteredOpportunities.map((opp) => {
    const approved = approvedCounts[opp.id] ?? 0;
    const isFull = approved >= opp.max_volunteers;
    const isBooked = userBookingOpportunityIds.includes(opp.id);
    return {
      id: opp.id,
      title: opp.title,
      start: `${opp.date}T${opp.start_time}`,
      end: `${opp.date}T${opp.end_time}`,
      backgroundColor: isFull ? "#f97316" : "#059669",
      borderColor: isFull ? "#ea580c" : "#047857",
      extendedProps: { opportunity: opp, approvedCount: approved, isBooked, isFull },
    };
  });

  function handleEventClick(info: EventClickArg) {
    const opp = info.event.extendedProps
      .opportunity as VolunteerOpportunityWithOrganization;
    setSelectedOpportunity(opp);
    setDialogOpen(true);
  }

  function renderEventContent(info: EventContentArg) {
    const opp = info.event.extendedProps
      .opportunity as VolunteerOpportunityWithOrganization;
    const approved = info.event.extendedProps.approvedCount as number;
    const isBooked = info.event.extendedProps.isBooked as boolean;
    const isFull = info.event.extendedProps.isFull as boolean;
    const isTimeGrid = info.view.type.startsWith("timeGrid");

    return (
      <div
        className={[
          "fc-opportunity-event",
          isBooked
            ? "fc-opportunity-event--booked"
            : isFull
            ? "fc-opportunity-event--full"
            : "fc-opportunity-event--open",
          isTimeGrid ? "fc-opportunity-event--timegrid" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="fc-opportunity-event__topline">
          <span title={`${formatTime(opp.start_time)} - ${formatTime(opp.end_time)}`}>
            {formatTime(opp.start_time)}
          </span>
          <span>
            {approved}/{opp.max_volunteers}
          </span>
        </div>
        <div className="fc-opportunity-event__title">{opp.title}</div>
        <div className="fc-opportunity-event__meta">
          {opp.organizations?.name ?? opp.location}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Organization
            </span>
            <select
              value={organizationFilter}
              onChange={(event) => setOrganizationFilter(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
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
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Registration
            </span>
            <select
              value={registrationFilter}
              onChange={(event) => setRegistrationFilter(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All opportunities</option>
              <option value="registered">Registered or requested</option>
              <option value="not_registered">Not registered</option>
            </select>
          </label>

          <div className="text-sm font-medium text-slate-500">
            Showing {filteredOpportunities.length} of {opportunities.length}
          </div>
        </div>
      </div>

      <div className="fc-volunteer-calendar rounded-lg border bg-white p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          events={events}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          height="auto"
          dayMaxEvents={false}
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
        />
      </div>

      {selectedOpportunity && (
        <OpportunityDetailsDialog
          opportunity={selectedOpportunity}
          approvedCount={approvedCounts[selectedOpportunity.id] ?? 0}
          hasExistingBooking={userBookingOpportunityIds.includes(selectedOpportunity.id)}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
}
