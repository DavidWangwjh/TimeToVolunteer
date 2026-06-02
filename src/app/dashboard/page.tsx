import Link from "next/link";
import type React from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Hourglass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingTable } from "@/components/bookings/BookingTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatTime } from "@/lib/dates";

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

  const { data: allBookings } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*, organizations(*))")
    .eq("volunteer_id", profile!.id)
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().split("T")[0];

  const upcoming = (allBookings ?? []).filter((booking) => {
    const opportunity = booking.volunteer_opportunities;
    return (
      opportunity &&
      opportunity.date >= today &&
      ["pending", "approved"].includes(booking.status)
    );
  });

  const past = (allBookings ?? []).filter((booking) => {
    const opportunity = booking.volunteer_opportunities;
    return (
      !opportunity ||
      opportunity.date < today ||
      ["rejected", "cancelled", "completed"].includes(booking.status)
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

  const toRows = (bookings: typeof allBookings) =>
    (bookings ?? []).map((booking) => ({
      booking,
      opportunity: booking.volunteer_opportunities,
    }));

  return (
    <div>
      <PageHeader
        eyebrow="Volunteer Dashboard"
        title={`Welcome back, ${profile!.first_name}`}
        description="A quick view of your schedule, requests, and volunteer activity."
        action={
          <Button asChild className="bg-emerald-800 hover:bg-emerald-700">
            <Link href="/dashboard/calendar">
              Find Opportunities
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <section className="space-y-4">
        <Card className="border-emerald-950/10 bg-emerald-900 py-0 text-white shadow-lg shadow-emerald-950/10">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center lg:p-6">
            <div className="flex size-11 items-center justify-center rounded-lg bg-white/10">
              <Calendar className="size-5" />
            </div>
            <div>
              <p className="max-w-2xl text-2xl font-bold leading-tight">
                {nextOpportunity ? "Next session ready" : "No confirmed sessions yet"}
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/75 sm:text-base">
                {nextOpportunity
                  ? `${nextOpportunity.title} · ${
                      nextOpportunity.organizations?.name ?? "Independent"
                    } · ${formatDate(nextOpportunity.date)} · ${formatTime(nextOpportunity.start_time)} to ${formatTime(nextOpportunity.end_time)}`
                  : "Explore organizations or browse the calendar to register for a session."}
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-full border-white/20 bg-white text-emerald-900 hover:bg-emerald-50 sm:w-auto"
            >
              <Link href={nextOpportunity ? "/dashboard/calendar" : "/dashboard/organizations"}>
                {nextOpportunity ? "View Calendar" : "Explore"}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="mt-6 rounded-lg border border-white/70 bg-white/85 p-4 shadow-sm shadow-slate-950/5 sm:p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-950">Bookings</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage upcoming sessions and review request history in one place.
          </p>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList className="max-w-full overflow-x-auto">
            <TabsTrigger value="upcoming">Upcoming ({approved.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="history">History ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4">
            <BookingTable variant="volunteer" bookings={toRows(approved)} />
          </TabsContent>
          <TabsContent value="pending" className="mt-4">
            <BookingTable
              variant="volunteer"
              showActions={false}
              bookings={toRows(pending)}
            />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <BookingTable
              variant="volunteer"
              showActions={false}
              bookings={toRows(past)}
            />
          </TabsContent>
        </Tabs>
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
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
            <Icon className="size-5" />
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}
