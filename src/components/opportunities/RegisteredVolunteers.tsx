import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile, VolunteerOpportunity } from "@/types/database";

interface RegisteredBooking {
  id: string;
  profiles: Profile;
}

interface RegisteredVolunteersProps {
  opportunity: VolunteerOpportunity;
  registeredBookings: RegisteredBooking[];
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
            {registeredBookings.map((booking) => (
              <li key={booking.id} className="px-4 py-3">
                <Link
                  href={`/admin/volunteers/${booking.profiles.id}`}
                  className="text-sm font-medium text-slate-950 hover:text-emerald-800 hover:underline"
                >
                  {getVolunteerName(booking.profiles)}
                </Link>

                {booking.profiles.email && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {booking.profiles.email}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
