import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import { ApplicationActions } from "@/components/applications/ApplicationActions";
import { formatDate } from "@/lib/dates";
import {
  fallbackOrganizationImage,
  inferOrganizationCategory,
} from "@/lib/organization-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("organization_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (!application) notFound();

  const imageUrl = application.image_url?.trim() || fallbackOrganizationImage;
  const description =
    application.organization_description?.trim() ||
    "A volunteer organization applying to publish community opportunities.";
  const category = inferOrganizationCategory(
    application.category,
    application.organization_description,
    application.organization_name,
    application.reason
  );

  return (
    <div>
      
      <div className="flex items-center gap-3 mb-6">
        <StatusBadge status={application.status} />
        <span className="text-sm text-muted-foreground">
          Submitted {formatDate(application.created_at.split("T")[0])}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="overflow-hidden md:col-span-2">
          <div className="h-56 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`${application.organization_name} application`}
              className="h-full w-full object-cover"
            />
          </div>
          <CardHeader>
            <CardTitle className="text-xl">
              {application.organization_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-600">{description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Category:</span>{" "}
              {category}
            </p>
            <p><span className="text-muted-foreground">Email:</span> {application.email}</p>
            <p><span className="text-muted-foreground">Phone:</span> {application.phone ?? "—"}</p>
            <p><span className="text-muted-foreground">Website:</span> {application.website ?? "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{description}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Application Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Reason for Joining</p>
              <p>{application.reason ?? "—"}</p>
            </div>
            {application.admin_notes && (
              <div>
                <p className="text-muted-foreground mb-1">Admin Notes</p>
                <p>{application.admin_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ApplicationActions application={application} />
    </div>
  );
}
