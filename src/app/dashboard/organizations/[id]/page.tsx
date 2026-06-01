import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Calendar, Globe, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveVolunteer } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizationRequestButton } from "@/components/organizations/OrganizationRequestButton";
import { formatDate, formatTime } from "@/lib/dates";
import type {
  MembershipStatus,
  Organization,
  VolunteerOpportunity,
} from "@/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

function MembershipBadge({ status }: { status?: MembershipStatus }) {
  if (status === "accepted") {
    return <Badge className="bg-emerald-100 text-emerald-800">Accepted</Badge>;
  }

  if (status === "pending") {
    return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
  }

  if (status === "rejected") {
    return <Badge className="bg-slate-100 text-slate-600">Rejected</Badge>;
  }

  return <Badge variant="outline">Not joined</Badge>;
}

export default async function OrganizationDetailPage({ params }: Props) {
  const { id } = await params;
  const profile = await requireActiveVolunteer();
  const supabase = await createClient();

  const [{ data: organization }, { data: membership }, { data: opportunities }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .single(),
      supabase
        .from("organization_memberships")
        .select("status")
        .eq("organization_id", id)
        .eq("volunteer_id", profile.id)
        .maybeSingle(),
      supabase
        .from("volunteer_opportunities")
        .select("*")
        .eq("organization_id", id)
        .eq("status", "published")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true }),
    ]);

  if (!organization) notFound();

  const organizationRecord = organization as Organization;
  const membershipStatus = membership?.status as MembershipStatus | undefined;
  const canRequest =
    membershipStatus === undefined || membershipStatus === "rejected";
  const visibleOpportunities = (opportunities ?? []) as VolunteerOpportunity[];

  return (
    <div>
      <PageHeader
        eyebrow="Organization"
        title={organizationRecord.name}
        description={
          organizationRecord.description ??
          "Review this organization and its available volunteer opportunities."
        }
        action={
          canRequest ? (
            <OrganizationRequestButton organizationId={organizationRecord.id} />
          ) : undefined
        }
      />

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-slate-200 bg-white">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                <Building2 className="size-5" />
              </span>
              <MembershipBadge status={membershipStatus} />
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-emerald-800" />
                <a
                  href={`mailto:${organizationRecord.contact_email}`}
                  className="hover:text-emerald-800 hover:underline"
                >
                  {organizationRecord.contact_email}
                </a>
              </div>

              {organizationRecord.contact_phone && (
                <div className="flex gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-emerald-800" />
                  <span>{organizationRecord.contact_phone}</span>
                </div>
              )}

              {organizationRecord.website && (
                <div className="flex gap-3">
                  <Globe className="mt-0.5 size-4 shrink-0 text-emerald-800" />
                  <a
                    href={organizationRecord.website}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all hover:text-emerald-800 hover:underline"
                  >
                    {organizationRecord.website}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="size-5 text-emerald-800" />
              <h2 className="font-semibold text-slate-950">
                Available opportunities
              </h2>
            </div>

            {visibleOpportunities.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                No visible upcoming opportunities from this organization.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border border-slate-200">
                {visibleOpportunities.map((opportunity) => (
                  <li key={opportunity.id} className="px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {opportunity.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(opportunity.date)} ·{" "}
                          {formatTime(opportunity.start_time)} -{" "}
                          {formatTime(opportunity.end_time)} ·{" "}
                          {opportunity.location}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/calendar">View in calendar</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
