export const OPPORTUNITY_DRAFT_STORAGE_KEY = "timetovolunteer:opportunity-draft";

export interface OpportunityDraft {
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  experience_required: string;
  max_volunteers: number;
  visibility: "public" | "private";
}

export function loadOpportunityDraft(): OpportunityDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(OPPORTUNITY_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OpportunityDraft;
  } catch {
    return null;
  }
}

export function saveOpportunityDraft(draft: OpportunityDraft) {
  if (typeof window === "undefined") return;
  const hasContent =
    draft.title.trim() !== "" ||
    draft.description.trim() !== "" ||
    draft.date.trim() !== "" ||
    draft.start_time.trim() !== "" ||
    draft.end_time.trim() !== "" ||
    draft.location.trim() !== "" ||
    draft.experience_required.trim() !== "";
  if (!hasContent) {
    localStorage.removeItem(OPPORTUNITY_DRAFT_STORAGE_KEY);
    return;
  }
  localStorage.setItem(OPPORTUNITY_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearOpportunityDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(OPPORTUNITY_DRAFT_STORAGE_KEY);
}
