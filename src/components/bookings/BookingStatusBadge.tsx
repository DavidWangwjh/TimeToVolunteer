import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ApplicationStatus,
  BookingStatus,
  OpportunityStatus,
  ProfileStatus,
} from "@/types/database";

type StatusType =
  | ApplicationStatus
  | BookingStatus
  | OpportunityStatus
  | ProfileStatus;

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  approved: "bg-green-100 text-green-800 hover:bg-green-100",
  accepted: "bg-green-100 text-green-800 hover:bg-green-100",
  rejected: "bg-red-100 text-red-800 hover:bg-red-100",
  cancelled: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  completed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  draft: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  published: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  full: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  booked: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  contacted: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  active: "bg-green-100 text-green-800 hover:bg-green-100",
  inactive: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  suspended: "bg-red-100 text-red-800 hover:bg-red-100",
};

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "capitalize font-medium",
        statusStyles[status] ?? "bg-gray-100 text-gray-800",
        className
      )}
    >
      {status}
    </Badge>
  );
}
