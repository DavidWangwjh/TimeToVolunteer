"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/lib/actions";

interface RemoveRegisteredVolunteerButtonProps {
  bookingId: string;
  volunteerName: string;
}

export function RemoveRegisteredVolunteerButton({
  bookingId,
  volunteerName,
}: RemoveRegisteredVolunteerButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      const result = await cancelBooking(bookingId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${volunteerName} removed from opportunity`);
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRemove}
      disabled={isPending}
    >
      {isPending ? "Removing..." : "Remove"}
    </Button>
  );
}
