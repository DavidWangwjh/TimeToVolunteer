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
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ReviewItem = {
  label: string;
  value: number;
  href: string;
  icon: React.ElementType;
  tone: "amber" | "emerald";
};

type StatItem = {
  label: string;
  value: number;
  href: string;
  icon: React.ElementType;
  description: string;
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();

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
  ] = await Promise.all([
    supabase
      .from("volunteer_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "volunteer")
      .eq("status", "active"),

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
  ]);

  const reviewItems: ReviewItem[] = [
    {
      label: "Applications waiting",
      value: pendingApplications ?? 0,
      href: "/admin/applications",
      icon: FileText,
      tone: "amber",
    },
    {
      label: "Booking requests",
      value: pendingBookings ?? 0,
      href: "/admin/bookings",
      icon: ClipboardList,
      tone: "emerald",
    },
  ];

  const stats: StatItem[] = [
    {
      label: "Active volunteers",
      value: acceptedVolunteers ?? 0,
      href: "/admin/volunteers",
      icon: Users,
      description: "Approved people in the program",
    },
    {
      label: "Upcoming sessions",
      value: upcomingSessions ?? 0,
      href: "/admin/calendar",
      icon: CalendarDays,
      description: "Published sessions still ahead",
    },
    {
      label: "Approved this month",
      value: approvedBookingsThisMonth ?? 0,
      href: "/admin/bookings",
      icon: CheckCircle2,
      description: "Volunteer bookings confirmed",
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
      <PageHeader
        eyebrow="Admin dashboard"
        title="Program command center"
        description="Review incoming demand, keep sessions staffed, and spot the operational work that needs attention."
        action={
          <Button asChild className="bg-emerald-800 hover:bg-emerald-700">
            <Link href="/admin/opportunities/new">
              Create Opportunity
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-emerald-950/10 bg-slate-950 text-white shadow-lg shadow-slate-950/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-200">
                  Needs review
                </p>
                <h2 className="mt-2 text-3xl font-bold">
                  {(pendingApplications ?? 0) + (pendingBookings ?? 0)}
                </h2>
              </div>

              <div className="flex size-12 items-center justify-center rounded-lg bg-white/10">
                <ClipboardList className="size-6" />
              </div>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300">
              Prioritize pending applications and booking requests so volunteers
              can move from interest to confirmed impact quickly.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {reviewItems.map((item) => (
                <ReviewTile key={item.label} {...item} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {stats.map((stat) => (
            <MetricCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <ActionCard
          icon={FileText}
          title="Review applications"
          description="Move applicants through the queue and keep decisions visible."
          href="/admin/applications"
        />

        <ActionCard
          icon={Briefcase}
          title="Manage opportunities"
          description="Create, edit, and publish sessions with the right capacity."
          href="/admin/opportunities"
        />

        <ActionCard
          icon={CalendarDays}
          title="Open calendar"
          description="Scan the schedule and spot coverage gaps across the week."
          href="/admin/calendar"
        />
      </section>
    </div>
  );
}

function ReviewTile({
  label,
  value,
  href,
  icon: Icon,
  tone,
}: ReviewItem) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-400/15 text-amber-100 ring-amber-300/20"
      : "bg-emerald-400/15 text-emerald-100 ring-emerald-300/20";

  return (
    <Link
      href={href}
      className={`rounded-lg p-4 ring-1 transition-colors hover:bg-white/10 ${toneClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <Icon className="size-5" />
        <ArrowRight className="size-4 opacity-70" />
      </div>

      <p className="mt-4 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
    </Link>
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