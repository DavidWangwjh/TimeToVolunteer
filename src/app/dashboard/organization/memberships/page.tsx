import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import { MembershipActions } from "@/components/organizations/MembershipActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import type {
  MembershipStatus,
  Organization,
  OrganizationMembership,
  Profile,
} from "@/types/database";

type MembershipRow = OrganizationMembership & {
  organizations: Organization | null;
  profiles: Profile | null;
};

export default async function MembershipsPage() {
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

  const { data } = await supabase
    .from("organization_memberships")
    .select(
      "*, organizations(*), profiles:profiles!organization_memberships_volunteer_id_fkey(*)"
    )
    .eq("organization_id", organization?.id ?? "00000000-0000-0000-0000-000000000000")
    .order("created_at", { ascending: false });

  const memberships = (data ?? []) as MembershipRow[];
  const pending = memberships.filter((membership) => membership.status === "pending");
  const reviewed = memberships.filter((membership) => membership.status !== "pending");

  return (
    <div>
      
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
          Awaiting Review
        </h2>
        <MembershipTable memberships={pending} showActions />
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
          Reviewed
        </h2>
        <MembershipTable memberships={reviewed} />
      </section>
    </div>
  );
}

function MembershipTable({
  memberships,
  showActions = false,
}: {
  memberships: MembershipRow[];
  showActions?: boolean;
}) {
  if (memberships.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 py-10 text-center text-sm text-slate-500">
        No membership requests found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Volunteer</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requested</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {memberships.map((membership) => (
            <TableRow key={membership.id}>
              <TableCell>
                {membership.profiles ? (
                  <Link
                    href={`/dashboard/admin/volunteers/${membership.profiles.id}`}
                    className="font-semibold text-slate-950 hover:text-emerald-800 hover:underline"
                  >
                    {membership.profiles.first_name} {membership.profiles.last_name}
                  </Link>
                ) : (
                  <div className="font-semibold text-slate-950">Volunteer</div>
                )}
                <div className="text-sm text-slate-500">
                  {membership.profiles?.email ?? "No email available"}
                </div>
              </TableCell>
              <TableCell className="text-slate-600">
                {membership.organizations?.name ?? "Organization"}
              </TableCell>
              <TableCell>
                <StatusBadge status={membership.status as MembershipStatus} />
              </TableCell>
              <TableCell className="text-slate-600">
                {formatDate(membership.created_at.split("T")[0])}
              </TableCell>
              {showActions && (
                <TableCell>
                  <MembershipActions membershipId={membership.id} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
