import type React from "react";
import {
  Building2,
  Briefcase,
  CalendarDays,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminAnalyticsChart } from "@/components/admin/AdminAnalyticsChart";
import { Card, CardContent } from "@/components/ui/card";

type Metric = {
  label: string;
  value: number;
  icon: React.ElementType;
  description: string;
};

export default async function PlatformAdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: totalVolunteers },
    { count: totalOrganizations },
    { count: totalOpportunities },
    { count: totalRegistrations },
    { data: volunteerActivity },
    { data: organizationActivity },
    { data: opportunityActivity },
    { data: registrationActivity },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "volunteer"),
    supabase
      .from("organizations")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("volunteer_opportunities")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "approved", "completed"]),
    supabase
      .from("profiles")
      .select("created_at")
      .eq("role", "volunteer")
      .order("created_at", { ascending: true }),
    supabase
      .from("organizations")
      .select("created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("volunteer_opportunities")
      .select("created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("bookings")
      .select("created_at")
      .order("created_at", { ascending: true }),
  ]);

  const metrics: Metric[] = [
    {
      label: "Total volunteers",
      value: totalVolunteers ?? 0,
      icon: Users,
      description: "All volunteer accounts",
    },
    {
      label: "Total organizations",
      value: totalOrganizations ?? 0,
      icon: Building2,
      description: "Approved organization profiles",
    },
    {
      label: "Total opportunities",
      value: totalOpportunities ?? 0,
      icon: Briefcase,
      description: "Draft, published, and completed sessions",
    },
    {
      label: "Total registrations",
      value: totalRegistrations ?? 0,
      icon: CalendarDays,
      description: "Pending, approved, and completed registrations",
    },
  ];

  const analyticsEvents = [
    ...(volunteerActivity ?? []).map((event) => ({
      type: "volunteers" as const,
      created_at: event.created_at,
    })),
    ...(organizationActivity ?? []).map((event) => ({
      type: "organizations" as const,
      created_at: event.created_at,
    })),
    ...(opportunityActivity ?? []).map((event) => ({
      type: "opportunities" as const,
      created_at: event.created_at,
    })),
    ...(registrationActivity ?? []).map((event) => ({
      type: "registrations" as const,
      created_at: event.created_at,
    })),
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <AdminAnalyticsChart events={analyticsEvents} />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
}: Metric) {
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
