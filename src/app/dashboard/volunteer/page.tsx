import type React from "react";
import {
  CheckCircle2,
  Clock,
  History,
  Hourglass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserProfile } from "@/lib/auth";
import { getAppDateString } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";
import { VolunteerScheduleSection } from "@/components/dashboard/VolunteerScheduleSection";
import type {
  BookingStatus,
  VolunteerOpportunityWithOrganization,
} from "@/types/database";

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
  const adminClient = createAdminClient();

  const { data: allBookings } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*, organizations(*))")
    .eq("volunteer_id", profile!.id)
    .order("created_at", { ascending: false });

  const scheduleOpportunities = (allBookings ?? [])
    .filter(
      (booking) =>
        ["pending", "approved"].includes(booking.status) &&
        booking.volunteer_opportunities?.status === "published"
    )
    .map((booking) => {
      const opportunity = Array.isArray(booking.volunteer_opportunities)
        ? booking.volunteer_opportunities[0]
        : booking.volunteer_opportunities;
      return opportunity;
    })
    .filter(
      (opportunity): opportunity is VolunteerOpportunityWithOrganization =>
        Boolean(opportunity)
    );
  const opportunityIds = scheduleOpportunities.map((opportunity) => opportunity.id);

  const [{ data: approvedCalendarBookings }, { data: userCalendarBookings }] =
    opportunityIds.length
      ? await Promise.all([
          adminClient
            .from("bookings")
            .select("id, opportunity_id, status")
            .in("opportunity_id", opportunityIds)
            .eq("status", "approved"),
          supabase
            .from("bookings")
            .select("id, opportunity_id, status, volunteer_id")
            .in("opportunity_id", opportunityIds)
            .eq("volunteer_id", profile!.id)
            .in("status", ["pending", "approved"]),
        ])
      : [{ data: [] }, { data: [] }];

  const today = getAppDateString();

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
    return booking.status === "approved" && Boolean(booking.checked_in_at);
  });
  const completedHours = completed.reduce(
    (total, booking) => total + bookingHours(booking),
    0
  );

  const approvedCounts: Record<string, number> = {};
  const userBookingOpportunityIds: string[] = [];
  const userBookingStatuses: Record<string, BookingStatus> = {};
  const userBookingIds: Record<string, string> = {};

  for (const booking of approvedCalendarBookings ?? []) {
    approvedCounts[booking.opportunity_id] =
      (approvedCounts[booking.opportunity_id] ?? 0) + 1;
  }

  for (const booking of userCalendarBookings ?? []) {
    userBookingOpportunityIds.push(booking.opportunity_id);
    userBookingStatuses[booking.opportunity_id] =
      booking.status as BookingStatus;
    userBookingIds[booking.opportunity_id] = booking.id;
  }

  return (
    <div>
      <section className="space-y-4">
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
          opportunities={scheduleOpportunities}
          approvedCounts={approvedCounts}
          userBookingOpportunityIds={userBookingOpportunityIds}
          userBookingStatuses={userBookingStatuses}
          userBookingIds={userBookingIds}
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
