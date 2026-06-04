import type {
  OpportunityStatus,
  OpportunityVisibility,
} from "@/types/database";

export const opportunityVisibilityLabels: Record<OpportunityVisibility, string> = {
  public: "Public",
  private: "Private to accepted volunteers",
};

export const opportunityStatusLabels: Record<OpportunityStatus, string> = {
  draft: "Draft",
  published: "Published",
  cancelled: "Cancelled",
  completed: "Completed",
};
