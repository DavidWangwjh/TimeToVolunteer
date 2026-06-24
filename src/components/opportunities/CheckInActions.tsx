"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  cancelBookingCheckIn,
  checkInAllBookingsForOpportunity,
  checkInBooking,
} from "@/lib/actions";

interface CheckInButtonProps {
  bookingId: string;
  volunteerName: string;
  checkedIn: boolean;
}

interface CheckInAllButtonProps {
  opportunityId: string;
  disabled?: boolean;
}

export function CheckInButton({
  bookingId,
  volunteerName,
  checkedIn,
}: CheckInButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = checkedIn
        ? await cancelBookingCheckIn(bookingId)
        : await checkInBooking(bookingId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        checkedIn
          ? `${volunteerName}'s check-in was cancelled`
          : `${volunteerName} checked in`
      );
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={checkedIn ? "outline" : "default"}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending
        ? checkedIn
          ? "Cancelling..."
          : "Checking in..."
        : checkedIn
        ? "Cancel check-in"
        : "Check in"}
    </Button>
  );
}

export function CheckInAllButton({
  opportunityId,
  disabled = false,
}: CheckInAllButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await checkInAllBookingsForOpportunity(opportunityId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const count = result.count ?? 0;
      toast.success(
        count === 0
          ? "All registered volunteers are already checked in"
          : `${count} volunteer${count === 1 ? "" : "s"} checked in`
      );
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={disabled || isPending}
    >
      {isPending ? "Checking in..." : "Check in all"}
    </Button>
  );
}
