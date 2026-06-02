"use client";

import "./fullcalendar.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventContentArg } from "@fullcalendar/core";
import { formatTime } from "@/lib/dates";
import { opportunityStatusLabels } from "@/lib/opportunity-labels";
import type { VolunteerOpportunity } from "@/types/database";

interface AdminCalendarProps {
  opportunities: (VolunteerOpportunity & {
    approved_count: number;
    pending_count: number;
  })[];
}

const statusColors: Record<string, { bg: string; border: string }> = {
  draft: { bg: "#9ca3af", border: "#6b7280" },
  published: { bg: "#059669", border: "#047857" },
  cancelled: { bg: "#ef4444", border: "#dc2626" },
  completed: { bg: "#3b82f6", border: "#2563eb" },
};

export function AdminCalendar({ opportunities }: AdminCalendarProps) {
  const events = opportunities.map((opp) => {
    const colors = statusColors[opp.status] ?? statusColors.draft;
    return {
      id: opp.id,
      title: opp.title,
      start: `${opp.date}T${opp.start_time}`,
      end: `${opp.date}T${opp.end_time}`,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      extendedProps: { opportunity: opp },
    };
  });

  function renderEventContent(info: EventContentArg) {
    const opp = info.event.extendedProps.opportunity as VolunteerOpportunity & {
      approved_count: number;
      pending_count: number;
    };

    return (
      <div className={`fc-admin-event fc-admin-event--${opp.status}`}>
        <div className="fc-admin-event__topline">
          <span>{formatTime(opp.start_time)}</span>
          <span>
            {opp.approved_count}/{opp.max_volunteers}
          </span>
        </div>
        <div className="fc-admin-event__title">{opp.title}</div>
        <div className="fc-admin-event__status">
          {opportunityStatusLabels[opp.status]}
        </div>
      </div>
    );
  }

  return (
    <div className="fc-admin-calendar overflow-x-auto rounded-lg border bg-white p-4">
      <div className="min-w-[720px]">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          events={events}
          eventContent={renderEventContent}
          eventDisplay="block"
          height="auto"
          eventClick={(info) => {
            const opp = info.event.extendedProps
              .opportunity as VolunteerOpportunity;
            window.location.href = `/admin/opportunities/${opp.id}/edit`;
          }}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {Object.entries(statusColors).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors.bg }}
            />
            <span className="capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
