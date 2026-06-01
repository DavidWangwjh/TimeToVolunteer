import type {
  OpportunitySignupMode,
  OpportunityStatus,
  OpportunityVisibility,
} from "@/types/database";

export const opportunityVisibilityLabels: Record<OpportunityVisibility, string> = {
  public: "Public",
  private: "Private to accepted volunteers",
};

export const opportunitySignupModeLabels: Record<OpportunitySignupMode, string> = {
  open: "Open to all",
  application: "Application required",
};

export const opportunityStatusLabels: Record<OpportunityStatus, string> = {
  draft: "Draft",
  published: "Published",
  cancelled: "Cancelled",
  completed: "Completed",
};
