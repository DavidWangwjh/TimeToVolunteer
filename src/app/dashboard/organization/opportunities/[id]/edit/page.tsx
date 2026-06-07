import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { Copy } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditOpportunityForm } from "@/components/opportunities/EditOpportunityForm";
import { RegisteredVolunteers } from "@/components/opportunities/RegisteredVolunteers";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/database";

interface RegisteredBooking {
  id: string;
  profiles: Profile;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditOpportunityPage({ params }: Props) {
  const { id } = await params;
  const profile = await requireAdmin();
  const supabase = createAdminClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, status, visibility")
    .eq("owner_id", profile.id)
    .maybeSingle();

  if (organization?.status !== "active") {
    redirect("/dashboard/organization");
  }

  const { data: opportunity } = await supabase
    .from("volunteer_opportunities")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization?.id ?? "00000000-0000-0000-0000-000000000000")
    .single();

  if (!opportunity) notFound();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id,
      profiles:profiles!bookings_volunteer_id_fkey (
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        status,
        must_reset_password,
        created_at,
        updated_at
      )
    `)
    .eq("opportunity_id", id)
    .eq("status", "approved")
    .order("approved_at", { ascending: true });

  const registeredBookings: RegisteredBooking[] = (bookings ?? [])
    .map((booking) => ({
      id: booking.id,
      profiles: Array.isArray(booking.profiles)
        ? booking.profiles[0]
        : booking.profiles,
    }))
    .filter(
      (booking): booking is RegisteredBooking => Boolean(booking.profiles)
    );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/dashboard/organization/opportunities/new?duplicate=${opportunity.id}`}>
            <Copy className="size-4" />
            Duplicate
          </Link>
        </Button>
      </div>

      <EditOpportunityForm
        opportunity={opportunity}
        organizationVisibility={organization.visibility}
      />

      <RegisteredVolunteers
        opportunity={opportunity}
        registeredBookings={registeredBookings}
        volunteerBasePath="/dashboard/organization/volunteers"
      />
    </div>
  );
}
