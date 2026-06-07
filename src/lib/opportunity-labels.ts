import type {
  OpportunityStatus,
  OpportunityVisibility,
  OrganizationVisibility,
} from "@/types/database";

export const opportunityVisibilityLabels: Record<OpportunityVisibility, string> = {
  public: "Public",
  private: "Private to accepted volunteers",
};

export function getOpportunityVisibilityLabels(
  organizationVisibility: OrganizationVisibility = "public"
): Record<OpportunityVisibility, string> {
  return {
    public:
      organizationVisibility === "private"
        ? "Open to all organization members"
        : "Open to everyone",
    private: "Registration request required",
  };
}

export const opportunityStatusLabels: Record<OpportunityStatus, string> = {
  draft: "Draft",
  published: "Published",
  cancelled: "Cancelled",
  completed: "Completed",
};
