import Link from "next/link";
import { Building2, Globe, Mail, Pencil, Phone, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MembershipStatus, Organization } from "@/types/database";

interface OrganizationProfileProps {
  organization: Organization;
  membershipStatus?: MembershipStatus;
  editable?: boolean;
  onEdit?: () => void;
}

function membershipLabel(status?: MembershipStatus) {
  if (status === "accepted") return "You are a member";
  if (status === "pending") return "Request pending";
  if (status === "rejected") return "Request declined";
  return "Not joined";
}

export function OrganizationProfile({
  organization,
  membershipStatus,
  editable = false,
  onEdit,
}: OrganizationProfileProps) {
  const imageUrl = organization.image_url?.trim();

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
      <div className="relative h-44 bg-slate-100 sm:h-56 lg:h-64">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${organization.name} organization`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#ecfdf5_0%,#f8fafc_55%,#e2e8f0_100%)] text-emerald-900">
            <div className="text-center">
              <ShieldCheck className="mx-auto size-9 opacity-80" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-900/70">
                Organization profile
              </p>
            </div>
          </div>
        )}
        {imageUrl && (
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/35 to-transparent" />
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border-4 border-white bg-emerald-50 text-emerald-800 shadow-sm sm:size-[4.5rem]">
              <Building2 className="size-8" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <h1 className="text-2xl font-bold leading-tight text-slate-950 sm:text-[2rem]">
                  {organization.name}
                </h1>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {organization.category && (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                    {organization.category}
                  </Badge>
                )}
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  {organization.visibility === "private" ? "Private" : "Public"}
                </Badge>
                {!editable && (
                  <Badge variant="outline">{membershipLabel(membershipStatus)}</Badge>
                )}
              </div>
            </div>
          </div>

          {editable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              asChild={!onEdit}
            >
              {onEdit ? (
                <>
                  <Pencil className="size-4" />
                  Edit profile
                </>
              ) : (
                <Link href="#edit-organization">
                  <Pencil className="size-4" />
                  Edit profile
                </Link>
              )}
            </Button>
          )}
        </div>

        {organization.description && (
          <p className="mt-5 max-w-4xl text-sm leading-6 text-slate-600 sm:text-base">
            {organization.description}
          </p>
        )}

        <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href={`mailto:${organization.contact_email}`}
            className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:text-emerald-800 hover:underline"
          >
            <Mail className="size-4 shrink-0 text-emerald-800" />
            <span className="truncate">{organization.contact_email}</span>
          </a>
          {organization.contact_phone && (
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Phone className="size-4 shrink-0 text-emerald-800" />
              <span className="truncate">{organization.contact_phone}</span>
            </div>
          )}
          {organization.website && (
            <a
              href={organization.website}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:text-emerald-800 hover:underline"
            >
              <Globe className="size-4 shrink-0 text-emerald-800" />
              <span className="truncate">{organization.website}</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
