import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export default async function PlatformAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  if (profile.role !== "admin") {
    redirect("/dashboard/organization");
  }

  const supabase = await createClient();

  const [
    { count: pendingApplications },
    { count: activeVolunteers },
    { count: activeOrganizations },
    { count: publishedOpportunities },
  ] = await Promise.all([
    supabase
      .from("organization_applications")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "contacted"]),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "volunteer")
      .eq("status", "active"),
    supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("volunteer_opportunities")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
  ]);

  return (
    <DashboardShell
      variant="admin"
      adminKind="platform"
      navCounts={{
        "/dashboard/admin/applications": pendingApplications ?? 0,
        "/dashboard/admin/volunteers": activeVolunteers ?? 0,
        "/dashboard/admin/organizations": activeOrganizations ?? 0,
        "/dashboard/admin/opportunities": publishedOpportunities ?? 0,
      }}
    >
      {children}
    </DashboardShell>
  );
}
