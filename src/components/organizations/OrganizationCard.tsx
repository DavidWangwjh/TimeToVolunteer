"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizationRequestButton } from "@/components/organizations/OrganizationRequestButton";
import { cn } from "@/lib/utils";
import {
  getOrganizationImageUrl,
  inferOrganizationCategory,
} from "@/lib/organization-display";
import type { MembershipStatus, OrganizationVisibility } from "@/types/database";

export interface OrganizationCardData {
  id: string;
  name: string;
  description: string | null;
  category?: string | null;
  imageUrl?: string | null;
  visibility: OrganizationVisibility;
  membershipStatus?: MembershipStatus;
  opportunityCount: number;
}

interface OrganizationCardProps {
  organization: OrganizationCardData;
  href: string;
  showAction?: boolean;
}

export function OrganizationCard({
  organization,
  href,
  showAction = true,
}: OrganizationCardProps) {
  const category = inferOrganizationCategory(
    organization.category,
    organization.description,
    organization.name
  );

  return (
    <div className="h-full">
      <Card className="h-full overflow-hidden border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md hover:shadow-slate-950/5">
        <CardContent className="flex h-full flex-col p-0">
          <Link href={href} className="group block">
            <div className="relative h-28 overflow-hidden bg-emerald-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getOrganizationImageUrl(organization.imageUrl)}
                alt={`${organization.name} organization`}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-bold uppercase text-emerald-900 shadow-sm">
                <Building2 className="size-3.5" />
                Organization
              </div>
            </div>
          </Link>

          <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
            <div>
              <Link
                href={href}
                className="line-clamp-2 text-lg font-bold text-slate-950 hover:text-emerald-800 hover:underline"
              >
                {organization.name}
              </Link>
              {organization.description && (
                <p
                  className={cn(
                    "mt-1.5 text-sm leading-5 text-slate-600",
                    showAction ? "line-clamp-3" : "line-clamp-4"
                  )}
                >
                  {organization.description}
                </p>
              )}
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                {category}
              </Badge>
              <Badge className="capitalize bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                {organization.visibility}
              </Badge>
              <Badge variant="outline">
                {organization.opportunityCount} opportunities
              </Badge>
              {organization.membershipStatus === "pending" && (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  Requested
                </Badge>
              )}
            </div>

            {showAction && (
              <OrganizationRequestButton
                organizationId={organization.id}
                organizationVisibility={organization.visibility}
                membershipStatus={organization.membershipStatus}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
