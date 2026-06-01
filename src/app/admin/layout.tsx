import { requireAdmin } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const isPlatformAdmin = profile.role === "admin";

  const [
    { count: pendingApplications },
    { count: activeMembers },
    { count: publishedOpportunities },
    { count: pendingBookings },
    { count: upcomingSessions },
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
      .from("volunteer_opportunities")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
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
      .from("organization_memberships")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const reviewCount =
    (pendingApplications ?? 0) + (pendingMemberships ?? 0) + (pendingBookings ?? 0);

  return (
    <DashboardShell
      variant="admin"
      adminKind={isPlatformAdmin ? "platform" : "organization"}
      navCounts={{
        "/admin": reviewCount,
        "/admin/applications": pendingApplications ?? 0,
        "/admin/memberships": pendingMemberships ?? 0,
        "/admin/volunteers": activeMembers ?? 0,
        "/admin/opportunities": publishedOpportunities ?? 0,
        "/admin/bookings": pendingBookings ?? 0,
        "/admin/calendar": upcomingSessions ?? 0,
      }}
    >
      {children}
    </DashboardShell>
  );
}
