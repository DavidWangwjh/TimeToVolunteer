import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AssignVolunteerSearch,
  type AssignableVolunteer,
} from "@/components/opportunities/AssignVolunteerSearch";
import { RemoveRegisteredVolunteerButton } from "@/components/opportunities/RemoveRegisteredVolunteerButton";
import type { Profile, VolunteerOpportunity } from "@/types/database";

interface RegisteredBooking {
  id: string;
  profiles: Profile;
}

interface RegisteredVolunteersProps {
  opportunity: VolunteerOpportunity;
  registeredBookings: RegisteredBooking[];
  volunteerBasePath?: string;
  assignableVolunteers?: AssignableVolunteer[];
  showRemoveActions?: boolean;
}

function getVolunteerName(volunteer: Profile) {
  const name = [volunteer.first_name, volunteer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || volunteer.email || "Volunteer account";
}

export function RegisteredVolunteers({
  opportunity,
  registeredBookings,
  volunteerBasePath = "/dashboard/admin/volunteers",
  assignableVolunteers,
  showRemoveActions = false,
}: RegisteredVolunteersProps) {
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-base">Registered Volunteers</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {registeredBookings.length} of {opportunity.max_volunteers} registered
        </p>

        {registeredBookings.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {registeredBookings.map((booking) => {
              const volunteerName = getVolunteerName(booking.profiles);

              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`${volunteerBasePath}/${booking.profiles.id}`}
                      className="text-sm font-medium text-slate-950 hover:text-emerald-800 hover:underline"
                    >
                      {volunteerName}
                    </Link>

                    {booking.profiles.email && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {booking.profiles.email}
                      </p>
                    )}
                  </div>

                  {showRemoveActions && (
                    <RemoveRegisteredVolunteerButton
                      bookingId={booking.id}
                      volunteerName={volunteerName}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {assignableVolunteers && (
          <AssignVolunteerSearch
            opportunityId={opportunity.id}
            volunteers={assignableVolunteers}
          />
        )}
      </CardContent>
    </Card>
  );
}
