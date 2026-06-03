"use client";

import { useState } from "react";
import { OpportunityDetailsDialog } from "@/components/calendar/OpportunityDetailsDialog";
import { VolunteerCalendar } from "@/components/calendar/VolunteerCalendar";
import type { VolunteerOpportunityWithOrganization } from "@/types/database";

interface OrganizationOpportunityCalendarProps {
  opportunities: VolunteerOpportunityWithOrganization[];
  approvedCounts: Record<string, number>;
  userBookingOpportunityIds: string[];
}

export function OrganizationOpportunityCalendar({
  opportunities,
  approvedCounts,
  userBookingOpportunityIds,
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
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
}
