import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MembershipActions } from "@/components/organizations/MembershipActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, getAge } from "@/lib/dates";
import type {
  Organization,
  OrganizationMembership,
  Profile,
} from "@/types/database";

type MembershipRow = OrganizationMembership & {
  organizations: Organization | null;
  profiles: Profile | null;
};

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const showReview = (await searchParams).view === "review";
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

  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      "*, organizations(*), profiles:profiles!organization_memberships_volunteer_id_fkey(*)"
    )
    .eq("organization_id", organization?.id ?? "00000000-0000-0000-0000-000000000000")
    .in("status", ["pending", "accepted"])
    .order("reviewed_at", { ascending: false, nullsFirst: false });

  if (error) throw new Error("Unable to load memberships");

  const memberships = (data ?? []) as MembershipRow[];
  const pending = memberships.filter((membership) => membership.status === "pending");
  const joined = memberships.filter((membership) => membership.status === "accepted");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            {showReview ? "Awaiting review" : "Memberships"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {showReview ? "Review volunteers who would like to join your organization." : "Volunteers who have joined your organization."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={showReview ? "/dashboard/organization/memberships" : "/dashboard/organization/memberships?view=review"}>
            {showReview ? "Back to members" : `Awaiting review (${pending.length})`}
          </Link>
        </Button>
      </div>
      <MembershipTable memberships={showReview ? pending : joined} showActions={showReview} />
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
        {showActions ? "No volunteers awaiting review." : "No joined volunteers yet."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Volunteer</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone number</TableHead>
            <TableHead>{showActions ? "Requested" : "Member since"}</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {memberships.map((membership) => (
            <TableRow key={membership.id}>
              <TableCell>
                {membership.profiles ? (
                  <Link
                    href={`/dashboard/organization/volunteers/${membership.profiles.id}${showActions ? "?from=review" : ""}`}
                    className="font-semibold text-slate-950 hover:text-emerald-800 hover:underline"
                  >
                    {membership.profiles.first_name} {membership.profiles.last_name}
                  </Link>
                ) : (
                  <div className="font-semibold text-slate-950">Volunteer</div>
                )}
              </TableCell>
              <TableCell className="text-slate-600">{getAge(membership.profiles?.date_of_birth) ?? "—"}</TableCell>
              <TableCell className="text-slate-600">{membership.profiles?.email ?? "—"}</TableCell>
              <TableCell className="text-slate-600">{membership.profiles?.phone || "—"}</TableCell>
              <TableCell className="text-slate-600">
                {showActions
                  ? formatDate(membership.created_at.split("T")[0])
                  : membership.reviewed_at
                    ? formatDate(membership.reviewed_at.split("T")[0])
                    : "—"}
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
