import Link from "next/link";
import type React from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Compass,
  Hourglass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingTable } from "@/components/bookings/BookingTable";
import { formatDate, formatTime } from "@/lib/dates";

export default async function VolunteerDashboardPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*, organizations(*))")
    .eq("volunteer_id", profile!.id)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  const now = new Date().toISOString().split("T")[0];
  const upcoming = (upcomingBookings ?? []).filter((booking) => {
    const opportunity = booking.volunteer_opportunities;
    return opportunity && opportunity.date >= now;
  });

  const pending = upcoming.filter((booking) => booking.status === "pending");
  const approved = upcoming.filter((booking) => booking.status === "approved");
  const nextBooking = [...approved].sort((a, b) => {
    const first = a.volunteer_opportunities;
    const second = b.volunteer_opportunities;
    return `${first?.date ?? ""} ${first?.start_time ?? ""}`.localeCompare(
      `${second?.date ?? ""} ${second?.start_time ?? ""}`
    );
  })[0];
  const nextOpportunity = nextBooking?.volunteer_opportunities;

  return (
    <div>
      <PageHeader
        eyebrow="Volunteer dashboard"
        title={`Welcome back, ${profile!.first_name}`}
        description="Track upcoming sessions, keep an eye on pending requests, and find the next opportunity that fits your week."
        action={
          <Button asChild className="bg-emerald-800 hover:bg-emerald-700">
            <Link href="/dashboard/calendar">
              Browse Calendar
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <section className="space-y-4">
        <Card className="border-emerald-950/10 bg-emerald-900 py-0 text-white shadow-lg shadow-emerald-950/10">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center lg:p-6">
            <div className="flex size-11 items-center justify-center rounded-lg bg-white/10">
              <Compass className="size-5" />
            </div>
            <div>
              <p className="max-w-2xl text-2xl font-bold leading-tight">
                {nextOpportunity ? "Next session ready" : "Your calendar is open"}
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/75 sm:text-base">
                {nextOpportunity
                  ? `${nextOpportunity.title} · ${
                      nextOpportunity.organizations?.name ?? "Independent"
                    } · ${formatDate(nextOpportunity.date)} · ${formatTime(nextOpportunity.start_time)} to ${formatTime(nextOpportunity.end_time)}`
                  : "Browse the calendar to find sessions that match your interests and availability."}
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-full border-white/20 bg-white text-emerald-900 hover:bg-emerald-50 sm:w-auto"
            >
              <Link href={nextOpportunity ? "/dashboard/bookings" : "/dashboard/calendar"}>
                {nextOpportunity ? "View Booking" : "Find Opportunities"}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            icon={CheckCircle2}
            label="Approved sessions"
            value={approved.length}
            description="Booked and ready to attend"
          />
          <MetricCard
            icon={Hourglass}
            label="Pending requests"
            value={pending.length}
            description="Waiting for coordinator review"
          />
        </div>
      </section>

      <section className="mt-6 space-y-6">
        {approved.length > 0 && (
          <Panel title="Upcoming booked sessions" description="Confirmed sessions on your calendar.">
            <BookingTable
              variant="volunteer"
              showActions
              bookings={approved.map((booking) => ({
                booking,
                opportunity: booking.volunteer_opportunities,
              }))}
            />
          </Panel>
        )}

        {pending.length > 0 && (
          <Panel title="Pending booking requests" description="Requests awaiting approval.">
            <BookingTable
              variant="volunteer"
              showActions={false}
              bookings={pending.map((booking) => ({
                booking,
                opportunity: booking.volunteer_opportunities,
              }))}
            />
          </Panel>
        )}

        {upcoming.length === 0 && (
          <div className="rounded-lg border border-dashed border-emerald-300 bg-white/80 px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <Calendar className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              No upcoming sessions yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Find a session that matches your schedule and send a booking request.
            </p>
            <Button asChild className="mt-5 bg-emerald-800 hover:bg-emerald-700">
              <Link href="/dashboard/calendar">Find Opportunities</Link>
            </Button>
          </div>
        )}
      </section>
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
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
            <Icon className="size-5" />
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/85 p-4 shadow-sm shadow-slate-950/5 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </div>
  );
}
