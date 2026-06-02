import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
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

  const stats = [
    { label: "Pending Applications", value: pendingApplications ?? 0, href: "/admin/applications" },
    { label: "Active Volunteers", value: acceptedVolunteers ?? 0, href: "/admin/volunteers" },
    { label: "Pending Bookings", value: pendingBookings ?? 0, href: "/admin/bookings" },
    { label: "Upcoming Sessions", value: upcomingSessions ?? 0, href: "/admin/calendar" },
    {
      label: "Approved This Month",
      value: approvedBookingsThisMonth ?? 0,
      href: "/admin/bookings",
    },
    {
      label: "Available This Week",
      value: availableSessionsThisWeek ?? 0,
      href: "/admin/opportunities",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Admin Overview"
        description="Monitor volunteer program activity at a glance."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/admin/opportunities/new">Create Opportunity</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/applications">Review Applications</Link>
        </Button>
      </div>
    </div>
  );
}
