export const organizationCategories = [
  "Animal Welfare",
  "Arts & Culture",
  "Community Development",
  "Education",
  "Environment",
  "Food Security",
  "Health & Wellness",
  "Housing",
  "Senior Services",
  "Youth Programs",
  "Other",
] as const;

export type OrganizationCategory = (typeof organizationCategories)[number];
