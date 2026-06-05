"use client";

import { useState } from "react";
import { OpportunityDetailsDialog } from "@/components/calendar/OpportunityDetailsDialog";
import { VolunteerCalendar } from "@/components/calendar/VolunteerCalendar";
import type {
  BookingStatus,
  VolunteerOpportunityWithOrganization,
} from "@/types/database";

interface OrganizationOpportunityCalendarProps {
  opportunities: VolunteerOpportunityWithOrganization[];
  approvedCounts: Record<string, number>;
  userBookingOpportunityIds: string[];
  userBookingStatuses: Record<string, BookingStatus>;
  userBookingIds: Record<string, string>;
}

export function OrganizationOpportunityCalendar({
  opportunities,
  approvedCounts,
  userBookingOpportunityIds,
  userBookingStatuses,
  userBookingIds,
}: OrganizationOpportunityCalendarProps) {
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<VolunteerOpportunityWithOrganization | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <VolunteerCalendar
        opportunities={opportunities}
        approvedCounts={approvedCounts}
        userBookingOpportunityIds={userBookingOpportunityIds}
        onOpportunitySelect={(opportunity) => {
          setSelectedOpportunity(opportunity);
          setDialogOpen(true);
        }}
      />

      {selectedOpportunity && (
        <OpportunityDetailsDialog
          opportunity={selectedOpportunity}
          approvedCount={approvedCounts[selectedOpportunity.id] ?? 0}
          hasExistingBooking={userBookingOpportunityIds.includes(
            selectedOpportunity.id
          )}
          existingBookingId={userBookingIds[selectedOpportunity.id]}
          existingBookingStatus={userBookingStatuses[selectedOpportunity.id]}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
}
