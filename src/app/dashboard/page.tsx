import type React from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Hourglass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { VolunteerScheduleSection } from "@/components/dashboard/VolunteerScheduleSection";
import { formatDate, formatTime } from "@/lib/dates";
import type { BookingStatus } from "@/types/database";

function bookingHours(booking: {
  volunteer_opportunities?: {
    date: string;
    start_time: string;
    end_time: string;
  } | null;
}) {
  const opportunity = booking.volunteer_opportunities;
  if (!opportunity) return 0;

  const start = new Date(`${opportunity.date}T${opportunity.start_time}`);
  const end = new Date(`${opportunity.date}T${opportunity.end_time}`);
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
}

export default async function VolunteerDashboardPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  const [{ data: allBookings }, { data: opportunities }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, volunteer_opportunities(*, organizations(*))")
      .eq("volunteer_id", profile!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("volunteer_opportunities")
      .select("*, organizations(*)")
      .eq("status", "published")
      .order("date", { ascending: true }),
  ]);

  const opportunityIds = (opportunities ?? []).map((opportunity) => opportunity.id);

  const { data: calendarBookings } = await supabase
    .from("bookings")
    .select("opportunity_id, status, volunteer_id")
    .in(
      "opportunity_id",
      opportunityIds.length
        ? opportunityIds
        : ["00000000-0000-0000-0000-000000000000"]
    );

  const today = new Date().toISOString().split("T")[0];

  const upcoming = (allBookings ?? []).filter((booking) => {
    const opportunity = booking.volunteer_opportunities;
    return (
      opportunity &&
      opportunity.date >= today &&
      ["pending", "approved"].includes(booking.status)
    );
  });

  const pending = upcoming.filter((booking) => booking.status === "pending");
  const approved = upcoming.filter((booking) => booking.status === "approved");
  const completed = (allBookings ?? []).filter((booking) => {
    const opportunity = booking.volunteer_opportunities;
    return (
      booking.status === "completed" ||
      (booking.status === "approved" && opportunity && opportunity.date < today)
    );
  });
  const completedHours = completed.reduce(
    (total, booking) => total + bookingHours(booking),
    0
  );

  const nextBooking = [...approved].sort((a, b) => {
    const first = a.volunteer_opportunities;
    const second = b.volunteer_opportunities;
    return `${first?.date ?? ""} ${first?.start_time ?? ""}`.localeCompare(
      `${second?.date ?? ""} ${second?.start_time ?? ""}`
    );
  })[0];
  const nextOpportunity = nextBooking?.volunteer_opportunities;

  const approvedCounts: Record<string, number> = {};
  const userBookingOpportunityIds: string[] = [];
  const userBookingStatuses: Record<string, BookingStatus> = {};

  for (const booking of calendarBookings ?? []) {
    if (booking.status === "approved") {
      approvedCounts[booking.opportunity_id] =
        (approvedCounts[booking.opportunity_id] ?? 0) + 1;
    }

    if (
      booking.volunteer_id === profile!.id &&
      ["pending", "approved"].includes(booking.status)
    ) {
      userBookingOpportunityIds.push(booking.opportunity_id);
      userBookingStatuses[booking.opportunity_id] =
        booking.status as BookingStatus;
    }
  }

  return (
    <div>
      <section className="space-y-4">
        <Card className="border-emerald-950/10 bg-emerald-900 py-0 text-white shadow-lg shadow-emerald-950/10">
          <CardContent className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 p-4 sm:p-5 lg:p-6">
            <div className="flex size-12 items-center justify-center rounded-lg bg-white/10 sm:size-11">
              <Calendar className="size-5" />
            </div>
            <div>
              <p className="max-w-2xl text-xl font-bold leading-tight sm:text-2xl">
                {nextOpportunity ? "Next event" : "No registered events yet"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="max-w-3xl text-sm leading-6 text-emerald-50/75">
                {nextOpportunity
                  ? `${nextOpportunity.title} · ${
                      nextOpportunity.organizations?.name ?? "Independent"
                    } · ${formatDate(nextOpportunity.date)} · ${formatTime(nextOpportunity.start_time)} to ${formatTime(nextOpportunity.end_time)}`
                  : "Explore organizations or browse the calendar to register for a session."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            icon={CheckCircle2}
            label="Upcoming"
            value={approved.length}
            description="Confirmed sessions"
          />
          <MetricCard
            icon={Hourglass}
            label="Pending"
            value={pending.length}
            description="Awaiting review"
          />
          <MetricCard
            icon={History}
            label="Sessions done"
            value={completed.length}
            description="Completed or past approved"
          />
          <MetricCard
            icon={Clock}
            label="Hours done"
            value={Number(completedHours.toFixed(1))}
            description="Completed volunteer time"
          />
        </div>
      </section>

      <div className="mt-6">
        <VolunteerScheduleSection
          opportunities={opportunities ?? []}
          approvedCounts={approvedCounts}
          userBookingOpportunityIds={userBookingOpportunityIds}
          userBookingStatuses={userBookingStatuses}
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <Card className="border-white/70 bg-white/85 py-0 shadow-sm shadow-slate-950/5">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 sm:text-sm">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-950 sm:mt-2 sm:text-3xl">
              {value}
            </p>
          </div>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 sm:size-10">
            <Icon className="size-4 sm:size-5" />
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600 sm:mt-3 sm:text-sm sm:leading-6">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
