"use client";

import "./fullcalendar.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import type { VolunteerOpportunityWithOrganization } from "@/types/database";
import { formatTime } from "@/lib/dates";

interface VolunteerCalendarProps {
  opportunities: VolunteerOpportunityWithOrganization[];
  approvedCounts: Record<string, number>;
  userBookingOpportunityIds: string[];
  onOpportunitySelect: (opportunity: VolunteerOpportunityWithOrganization) => void;
}

export function VolunteerCalendar({
  opportunities,
  approvedCounts,
  userBookingOpportunityIds,
  onOpportunitySelect,
}: VolunteerCalendarProps) {
  const events = opportunities.map((opp) => {
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
    onOpportunitySelect(opp);
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
  );
}
