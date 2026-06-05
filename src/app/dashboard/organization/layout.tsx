import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  if (profile.role !== "organization") {
    redirect("/dashboard/admin");
  }

  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, status")
    .eq("owner_id", profile.id)
    .maybeSingle();
  const organizationLocked = organization?.status !== "active";

  const { data: opportunityIds } = organization
    ? await supabase
        .from("volunteer_opportunities")
        .select("id")
        .eq("organization_id", organization.id)
    : { data: [] };

  const ownedOpportunityIds = (opportunityIds ?? []).map(
    (opportunity) => opportunity.id
  );

  const [{ count: pendingMemberships }, { count: unreadMessages }] =
    await Promise.all([
      organization
        ? supabase
            .from("organization_memberships")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organization.id)
            .eq("status", "pending")
        : Promise.resolve({ count: 0 }),
      supabase
        .from("inbox_messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", profile.id)
        .is("read_at", null)
        .is("deleted_at", null),
    ]);

  const { count: pendingBookings } = ownedOpportunityIds.length
    ? await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .in("opportunity_id", ownedOpportunityIds)
        .eq("status", "pending")
    : { count: 0 };

  return (
    <DashboardShell
      variant="admin"
      adminKind="organization"
      organizationLocked={organizationLocked}
      navCounts={{
        "/dashboard/organization/inbox": unreadMessages ?? 0,
        "/dashboard/organization/memberships": pendingMemberships ?? 0,
        "/dashboard/organization/bookings": pendingBookings ?? 0,
      }}
    >
      {children}
    </DashboardShell>
  );
}
