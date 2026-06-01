import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditOpportunityForm } from "@/components/opportunities/EditOpportunityForm";
import { AssignVolunteers } from "@/components/opportunities/AssignVolunteers";
import type { Profile } from "@/types/database";

interface AssignedBooking {
  id: string;
  status: string;
  profiles: Profile;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditOpportunityPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: opportunity } = await supabase
    .from("volunteer_opportunities")
    .select("*")
    .eq("id", id)
    .single();

  if (!opportunity) notFound();

  const [{ data: volunteers }, { data: bookings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, role, status")
      .eq("role", "volunteer")
      .eq("status", "active")
      .order("last_name"),
  
    supabase
      .from("bookings")
      .select(`
        id,
        status,
        volunteer_id,
        profiles:profiles!bookings_volunteer_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          role,
          status
        )
      `)
      .eq("opportunity_id", id)
      .in("status", ["pending", "approved"])
      .order("created_at"),
  ]);

  const assignedBookings: AssignedBooking[] = (bookings ?? [])
    .map((booking) => ({
      id: booking.id,
      status: booking.status,
      profiles: Array.isArray(booking.profiles)
        ? booking.profiles[0]
        : booking.profiles,
    }))
    .filter((booking): booking is AssignedBooking => Boolean(booking.profiles));

  const approvedCount = assignedBookings.filter(
    (booking) => booking.status === "approved"
  ).length;

  return (
    <div>
      <PageHeader title="Edit Opportunity" description={opportunity.title} />

      <EditOpportunityForm opportunity={opportunity} />

      <AssignVolunteers
        opportunity={opportunity}
        volunteers={volunteers ?? []}
        assignedBookings={assignedBookings}
        approvedCount={approvedCount}
      />
    </div>
  );
}
