import Link from "next/link";
import type React from "react";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { AdminScheduleSection } from "@/components/dashboard/AdminScheduleSection";
import { Card, CardContent } from "@/components/ui/card";

type StatItem = {
  label: string;
  value: number;
  icon: React.ElementType;
  description: string;
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const profile = await getCurrentUserProfile();
  const isPlatformAdmin = profile?.role === "admin";

  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const today = now.toISOString().split("T")[0];

  const [
    { count: acceptedVolunteers },
    { count: upcomingSessions },
    { count: approvedBookingsThisMonth },
    { count: availableSessionsThisWeek },
  ] = await Promise.all([
    isPlatformAdmin
      ? supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "volunteer")
          .eq("status", "active")
      : supabase
          .from("organization_memberships")
          .select("*", { count: "exact", head: true })
          .eq("status", "accepted"),

    supabase
      .from("volunteer_opportunities")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("date", today),

    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("approved_at", monthStart),

    supabase
      .from("volunteer_opportunities")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("date", today)
      .lte("date", weekEnd),
  ]);

  const stats: StatItem[] = [
    {
      label: "Active volunteers",
      value: acceptedVolunteers ?? 0,
      icon: Users,
      description: isPlatformAdmin
        ? "Approved people in the program"
        : "Accepted members in your organization",
    },
    {
      label: "Upcoming sessions",
      value: upcomingSessions ?? 0,
      icon: CalendarDays,
      description: "Published sessions still ahead",
    },
    {
      label: "Approved this month",
      value: approvedBookingsThisMonth ?? 0,
      icon: CheckCircle2,
      description: "Volunteer registrations confirmed",
    },
    {
      label: "Available this week",
      value: availableSessionsThisWeek ?? 0,
      icon: Briefcase,
      description: "Open opportunities in the next 7 days",
    },
  ];

  const [{ data: opportunities }, { data: bookings }] = await Promise.all([
    supabase
      .from("volunteer_opportunities")
      .select("*")
      .order("date", { ascending: true }),
    supabase.from("bookings").select("opportunity_id, status"),
  ]);

  const counts = (bookings ?? []).reduce<
    Record<string, { approved: number; pending: number }>
  >((counts, booking) => {
    if (!counts[booking.opportunity_id]) {
      counts[booking.opportunity_id] = { approved: 0, pending: 0 };
    }

    if (booking.status === "approved") {
      counts[booking.opportunity_id].approved += 1;
    }

    if (booking.status === "pending") {
      counts[booking.opportunity_id].pending += 1;
    }

    return counts;
  }, {});

  const opportunitiesWithCounts = (opportunities ?? []).map((opportunity) => ({
    ...opportunity,
    approved_count: counts[opportunity.id]?.approved ?? 0,
    pending_count: counts[opportunity.id]?.pending ?? 0,
  }));

  const registeredCounts = Object.fromEntries(
    Object.entries(counts).map(([opportunityId, value]) => [
      opportunityId,
      value.approved,
    ])
  );

  return (
    <div>
      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {stats.map((stat) => (
            <MetricCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <AdminScheduleSection
        opportunities={opportunitiesWithCounts}
        registeredCounts={registeredCounts}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  description,
}: StatItem) {
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
