import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AssignVolunteerSearch,
  type AssignableVolunteer,
} from "@/components/opportunities/AssignVolunteerSearch";
import {
  CheckInAllButton,
  CheckInButton,
} from "@/components/opportunities/CheckInActions";
import { RemoveRegisteredVolunteerButton } from "@/components/opportunities/RemoveRegisteredVolunteerButton";
import type { Profile, VolunteerOpportunity } from "@/types/database";

interface RegisteredBooking {
  id: string;
  volunteer_id?: string;
  profiles: Profile | null;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
}

interface RegisteredVolunteersProps {
  opportunity: VolunteerOpportunity;
  registeredBookings: RegisteredBooking[];
  volunteerBasePath?: string;
  assignableVolunteers?: AssignableVolunteer[];
  showRemoveActions?: boolean;
  showCheckInActions?: boolean;
  registeredCount?: number;
}

function getVolunteerName(volunteer: Profile | null) {
  if (!volunteer) return "Volunteer account";

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
  showCheckInActions = false,
  registeredCount = registeredBookings.length,
}: RegisteredVolunteersProps) {
  const uncheckedCount = registeredBookings.filter(
    (booking) => !booking.checked_in_at
  ).length;

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-base">Registered Volunteers</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {registeredCount} of {opportunity.max_volunteers} registered
          </p>

          {showCheckInActions && registeredCount > 0 && (
            <CheckInAllButton
              opportunityId={opportunity.id}
              disabled={uncheckedCount === 0}
            />
          )}
        </div>

        {registeredBookings.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {registeredBookings.map((booking) => {
              const volunteerName = getVolunteerName(booking.profiles);
              const checkedIn = Boolean(booking.checked_in_at);

              return (
                <li
                  key={booking.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    {booking.profiles ? (
                      <Link
                        href={`${volunteerBasePath}/${booking.profiles.id}`}
                        className="text-sm font-medium text-slate-950 hover:text-emerald-800 hover:underline"
                      >
                        {volunteerName}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-slate-500">
                        {volunteerName}
                      </p>
                    )}

                    {booking.profiles?.email && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {booking.profiles.email}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {showCheckInActions && (
                      <>
                        <CheckInButton
                          bookingId={booking.id}
                          volunteerName={volunteerName}
                          checkedIn={checkedIn}
                        />
                      </>
                    )}

                    {showRemoveActions && (
                      <RemoveRegisteredVolunteerButton
                        bookingId={booking.id}
                        volunteerName={volunteerName}
                      />
                    )}
                  </div>
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
