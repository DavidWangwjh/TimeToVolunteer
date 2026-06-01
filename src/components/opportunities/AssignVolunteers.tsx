"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import {
  assignVolunteerToOpportunity,
  unassignVolunteerFromOpportunity,
} from "@/lib/actions";
import type { Profile, VolunteerOpportunity } from "@/types/database";

interface AssignedBooking {
  id: string;
  status: string;
  profiles: Profile;
}

interface AssignVolunteersProps {
  opportunity: VolunteerOpportunity;
  volunteers: Profile[];
  assignedBookings: AssignedBooking[];
  approvedCount: number;
}

function getVolunteerName(volunteer?: Profile) {
  if (!volunteer) return "Unknown volunteer";

  const name = [volunteer.first_name, volunteer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || volunteer.email || "Volunteer account";
}

function getVolunteerSelectLabel(volunteer?: Profile) {
  if (!volunteer) return "Select a volunteer";

  const name = [volunteer.first_name, volunteer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (name && volunteer.email) {
    return `${name} (${volunteer.email})`;
  }

  if (name) {
    return name;
  }

  if (volunteer.email) {
    return volunteer.email;
  }

  return "Volunteer account";
}

export function AssignVolunteers({
  opportunity,
  volunteers,
  assignedBookings,
}: AssignVolunteersProps) {
  const [selectedVolunteerId, setSelectedVolunteerId] = useState("");
  const [pending, startTransition] = useTransition();

  // Used to prevent assigning someone who already has a pending or approved booking.
  const bookedVolunteerIds = new Set(
    assignedBookings
      .filter((booking) => ["pending", "approved"].includes(booking.status))
      .map((booking) => booking.profiles?.id)
      .filter(Boolean)
  );

  const availableVolunteers = volunteers.filter(
    (volunteer) => !bookedVolunteerIds.has(volunteer.id)
  );

  // These are the only volunteers that should display in Assigned Volunteers.
  const approvedBookings = assignedBookings.filter(
    (booking) => booking.status === "approved"
  );

  const selectedVolunteer = availableVolunteers.find(
    (volunteer) => volunteer.id === selectedVolunteerId
  );

  const spotsRemaining = Math.max(
    0,
    opportunity.max_volunteers - approvedBookings.length
  );

  const canAssign =
    spotsRemaining > 0 &&
    availableVolunteers.length > 0 &&
    !["cancelled", "completed"].includes(opportunity.status);

  function handleAssign() {
    if (!selectedVolunteerId) {
      toast.error("Select a volunteer");
      return;
    }

    startTransition(async () => {
      const result = await assignVolunteerToOpportunity(
        opportunity.id,
        selectedVolunteerId
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Volunteer assigned");
        setSelectedVolunteerId("");
      }
    });
  }

  function handleUnassign(bookingId: string) {
    startTransition(async () => {
      const result = await unassignVolunteerFromOpportunity(bookingId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Volunteer removed");
      }
    });
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-base">Assigned Volunteers</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {approvedBookings.length} of {opportunity.max_volunteers} registered
          {spotsRemaining > 0 && ` · ${spotsRemaining} remaining`}
        </p>

        {approvedBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No volunteers assigned yet.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {approvedBookings.map((booking) => {
              const volunteer = booking.profiles;

              return (
                <li
                  key={booking.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      {getVolunteerName(volunteer)}
                    </p>

                    {volunteer?.email && (
                      <p className="text-xs text-muted-foreground">
                        {volunteer.email}
                      </p>
                    )}

                    {volunteer?.phone && (
                      <p className="text-xs text-muted-foreground">
                        {volunteer.phone}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={booking.status} />

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleUnassign(booking.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {canAssign && (
          <div className="border-t pt-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="w-full sm:max-w-lg space-y-2">
                <Label>Assign volunteer</Label>

                <Select
                  value={selectedVolunteerId}
                  onValueChange={(value) => setSelectedVolunteerId(value)}
                >
                  <SelectTrigger className="w-full min-w-[320px]">
                    <span
                      className={
                        selectedVolunteer
                          ? "block truncate"
                          : "block truncate text-muted-foreground"
                      }
                    >
                      {getVolunteerSelectLabel(selectedVolunteer)}
                    </span>
                  </SelectTrigger>

                  <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[320px]">
                    {availableVolunteers.map((volunteer) => (
                      <SelectItem key={volunteer.id} value={volunteer.id}>
                        {getVolunteerSelectLabel(volunteer)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAssign} disabled={pending}>
                {pending ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        )}

        {!canAssign && spotsRemaining > 0 && availableVolunteers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No available volunteers to assign.
          </p>
        )}

        {spotsRemaining === 0 && (
          <p className="text-sm text-muted-foreground">
            This opportunity is full.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
