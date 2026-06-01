import { requireActiveVolunteer } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireActiveVolunteer();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { count: activeBookings },
    { count: pendingBookings },
    { count: availableSessions },
    { count: acceptedOrganizations },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("volunteer_id", profile.id)
      .in("status", ["pending", "approved"]),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("volunteer_id", profile.id)
      .eq("status", "pending"),
    supabase
      .from("volunteer_opportunities")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("date", today),
    supabase
      .from("organization_memberships")
      .select("*", { count: "exact", head: true })
      .eq("volunteer_id", profile.id)
      .eq("status", "accepted"),
  ]);

  return (
    <DashboardShell
      variant="volunteer"
      navCounts={{
        "/dashboard": pendingBookings ?? 0,
        "/dashboard/organizations": acceptedOrganizations ?? 0,
        "/dashboard/calendar": availableSessions ?? 0,
        "/dashboard/bookings": activeBookings ?? 0,
      }}
    >
      {children}
    </DashboardShell>
  );
}
