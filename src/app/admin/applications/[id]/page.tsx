import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import { ApplicationActions } from "@/components/applications/ApplicationActions";
import { formatDate } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("volunteer_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (!application) notFound();

  return (
    <div>
      <PageHeader
        title={`${application.first_name} ${application.last_name}`}
        description="Application details"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/applications">Back to List</Link>
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <StatusBadge status={application.status} />
        <span className="text-sm text-muted-foreground">
          Submitted {formatDate(application.created_at.split("T")[0])}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Email:</span> {application.email}</p>
            <p><span className="text-muted-foreground">Phone:</span> {application.phone ?? "—"}</p>
            <p><span className="text-muted-foreground">Age:</span> {application.age ?? "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span>{" "}
              {application.emergency_contact_name ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Phone:</span>{" "}
              {application.emergency_contact_phone ?? "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Application Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Availability</p>
              <p>{application.availability ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Experience</p>
              <p>{application.experience ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Preferred Areas</p>
              <p>{application.preferred_areas ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Reason for Volunteering</p>
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
