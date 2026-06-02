import Link from "next/link";
import type React from "react";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StatItem = {
  label: string;
  value: number;
  href: string;
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
    { count: pendingApplications },
    { count: acceptedVolunteers },
    { count: pendingBookings },
    { count: upcomingSessions },
    { count: approvedBookingsThisMonth },
    { count: availableSessionsThisWeek },
    { count: pendingMemberships },
  ] = await Promise.all([
    isPlatformAdmin
      ? supabase
          .from("organization_applications")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),

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
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),

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
    supabase
      .from("organization_memberships")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const reviewTotal =
    (pendingApplications ?? 0) + (pendingMemberships ?? 0) + (pendingBookings ?? 0);

  const stats: StatItem[] = [
    {
      label: "Active volunteers",
      value: acceptedVolunteers ?? 0,
      href: "/admin/volunteers",
      icon: Users,
      description: isPlatformAdmin
        ? "Approved people in the program"
        : "Accepted members in your organization",
    },
    {
      label: "Upcoming sessions",
      value: upcomingSessions ?? 0,
      href: "/admin/opportunities",
      icon: CalendarDays,
      description: "Published sessions still ahead",
    },
    {
      label: "Approved this month",
      value: approvedBookingsThisMonth ?? 0,
      href: "/admin/bookings",
      icon: CheckCircle2,
      description: "Volunteer registrations confirmed",
    },
    {
      label: "Available this week",
      value: availableSessionsThisWeek ?? 0,
      href: "/admin/opportunities",
      icon: Briefcase,
      description: "Open opportunities in the next 7 days",
    },
  ];

  return (
    <div>
      
      <section className="space-y-4">
        <Card className="border-emerald-950/10 bg-emerald-900 py-0 text-white shadow-lg shadow-emerald-950/10">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center lg:p-6">
            <div className="flex size-11 items-center justify-center rounded-lg bg-white/10">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <p className="max-w-2xl text-2xl font-bold leading-tight">
                {reviewTotal > 0 ? "Review queue ready" : "Operations are clear"}
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/75 sm:text-base">
                {reviewTotal > 0
                  ? `${reviewTotal} item${
                      reviewTotal === 1 ? "" : "s"
                    } need review across applications, memberships, and registrations.`
                  : "No pending reviews right now. Keep an eye on inbox and upcoming sessions."}
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-full border-white/20 bg-white text-emerald-900 hover:bg-emerald-50 sm:w-auto"
            >
              <Link href="/admin/inbox">Open Inbox</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <MetricCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          icon={ClipboardList}
          title="Work the queue"
          description="Review applications, memberships, and registration requests that need a decision."
          href="/admin/inbox"
        />

        <ActionCard
          icon={isPlatformAdmin ? FileText : Users}
          title={isPlatformAdmin ? "Review organizations" : "Review members"}
          description={
            isPlatformAdmin
              ? "Move organization applicants through the queue and keep decisions visible."
              : "Accept volunteers into your private organization network."
          }
          href={isPlatformAdmin ? "/admin/applications" : "/admin/memberships"}
        />

        <ActionCard
          icon={Briefcase}
          title="Manage opportunities"
          description="Create, edit, and publish sessions with the right capacity."
          href="/admin/opportunities"
        />

        <ActionCard
          icon={CalendarDays}
          title="View schedule"
          description="Switch between the opportunity list and calendar view without leaving the page."
          href="/admin/opportunities"
        />
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  href,
  icon: Icon,
  description,
}: StatItem) {
  return (
    <Link href={href}>
      <Card className="h-full border-white/70 bg-white/85 shadow-sm shadow-slate-950/5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
            </div>

            <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <Icon className="size-5" />
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full border-white/70 bg-white/80 shadow-sm shadow-slate-950/5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Icon className="size-5" />
            </div>

            <ArrowRight className="size-4 text-slate-400" />
          </div>

          <h2 className="mt-4 font-semibold text-slate-950">{title}</h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
