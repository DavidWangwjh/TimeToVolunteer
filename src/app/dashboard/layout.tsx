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

  const [
    { count: pendingBookings },
    { count: acceptedOrganizations },
    { count: unreadMessages },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("volunteer_id", profile.id)
      .eq("status", "pending"),
    supabase
      .from("organization_memberships")
      .select("*", { count: "exact", head: true })
      .eq("volunteer_id", profile.id)
      .eq("status", "accepted"),
    supabase
      .from("inbox_messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", profile.id)
      .is("read_at", null)
      .is("deleted_at", null),
  ]);

  return (
    <DashboardShell
      variant="volunteer"
      navCounts={{
        "/dashboard": pendingBookings ?? 0,
        "/dashboard/inbox": unreadMessages ?? 0,
        "/dashboard/organizations": acceptedOrganizations ?? 0,
      }}
    >
      {children}
    </DashboardShell>
  );
}
