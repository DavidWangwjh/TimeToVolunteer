import { Building2, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveVolunteer } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrganizationRequestButton } from "@/components/organizations/OrganizationRequestButton";
import type { MembershipStatus, Organization } from "@/types/database";

function MembershipBadge({ status }: { status?: MembershipStatus }) {
  if (status === "accepted") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        <CheckCircle2 className="mr-1 size-3.5" />
        Accepted
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        <Clock3 className="mr-1 size-3.5" />
        Pending
      </Badge>
    );
  }

  if (status === "rejected") {
    return (
      <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">
        <XCircle className="mr-1 size-3.5" />
        Rejected
      </Badge>
    );
  }

  return null;
}

export default async function OrganizationsPage() {
  const profile = await requireActiveVolunteer();
  const supabase = await createClient();

  const [{ data: organizations }, { data: memberships }] = await Promise.all([
    supabase
      .from("organizations")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("organization_memberships")
      .select("organization_id, status")
      .eq("volunteer_id", profile.id),
  ]);

  const membershipByOrganization = new Map(
    (memberships ?? []).map((membership) => [
      membership.organization_id,
      membership.status as MembershipStatus,
    ])
  );
  const organizationList = (organizations ?? []) as Organization[];

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Request access to private organizations and unlock their member-only opportunities."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {organizationList.map((organization) => {
          const membershipStatus = membershipByOrganization.get(organization.id);
          const canRequest =
            membershipStatus === undefined || membershipStatus === "rejected";

          return (
            <Card key={organization.id} className="border-slate-200 bg-white">
              <CardContent className="flex h-full flex-col gap-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                      <Building2 className="size-5" />
                    </span>
                    <div>
                      <h2 className="font-bold text-slate-950">
                        {organization.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {organization.contact_email}
                      </p>
                    </div>
                  </div>
                  <MembershipBadge status={membershipStatus} />
                </div>

                {organization.description && (
                  <p className="text-sm leading-6 text-slate-600">
                    {organization.description}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-3">
                  {organization.website ? (
                    <a
                      href={organization.website}
                      className="text-sm font-semibold text-emerald-800 hover:text-emerald-700"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Website
                    </a>
                  ) : (
                    <span />
                  )}
                  {canRequest && (
                    <OrganizationRequestButton organizationId={organization.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {organizationList.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 py-12 text-center text-sm text-slate-500">
          No organizations are available yet.
        </div>
      )}
    </div>
  );
}
