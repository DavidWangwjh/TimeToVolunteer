import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OrganizationOpportunities } from "@/components/opportunities/OrganizationOpportunities";
import { Button } from "@/components/ui/button";

export default async function OpportunitiesPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, status")
    .eq("owner_id", profile.id)
    .maybeSingle();

  if (organization?.status !== "active") {
    redirect("/dashboard/organization");
  }

  const { data: opportunities, error } = await
    supabase
      .from("volunteer_opportunities")
      .select("*")
      .eq("organization_id", organization?.id ?? "00000000-0000-0000-0000-000000000000")
      .order("date", { ascending: false });
  if (error) throw new Error("Unable to load opportunities");
  const ids = (opportunities ?? []).map((opportunity) => opportunity.id);
  const { data: bookings, error: bookingsError } = ids.length ? await supabase
      .from("bookings")
      .select("opportunity_id, status").in("opportunity_id", ids) : { data: [], error: null };
  if (bookingsError) throw new Error("Unable to load registration counts");

  const counts = (bookings ?? []).reduce<Record<string, { approved: number; pending: number }>>(
    (counts, booking) => {
      if (!counts[booking.opportunity_id]) {
        counts[booking.opportunity_id] = { approved: 0, pending: 0 };
      }

      if (booking.status === "approved") {
        counts[booking.opportunity_id].approved += 1;
      }

      if (booking.status === "pending") {
        counts[booking.opportunity_id].pending += 1;
      }

      return counts;
    },
    {}
  );

  const opportunitiesWithCounts = (opportunities ?? []).map((opportunity) => ({
    ...opportunity,
    approved_count: counts[opportunity.id]?.approved ?? 0,
    pending_count: counts[opportunity.id]?.pending ?? 0,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-950">Opportunities</h1><p className="mt-1 text-sm text-slate-600">Manage your opportunities and volunteer registrations.</p></div>
        <Button asChild>
          <Link href="/dashboard/organization/opportunities/new">
            <Plus className="size-4" />
            Create Opportunity
          </Link>
        </Button>
      </div>

      <OrganizationOpportunities
        opportunities={opportunitiesWithCounts}
        initialNow={new Date().toISOString()}
      />
    </div>
  );
}
