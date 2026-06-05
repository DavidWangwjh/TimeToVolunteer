const knownCategories = [
  "Environment",
  "Education",
  "Food Security",
  "Animal Welfare",
  "Arts & Culture",
  "Senior Services",
  "Health & Wellness",
  "Housing",
  "Youth Programs",
  "Other",
];

export const fallbackOrganizationImage =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

export function inferOrganizationCategory(...values: Array<unknown>) {
  const explicit = values.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  if (typeof explicit === "string") {
    const normalized = explicit.trim();
    const known = knownCategories.find(
      (category) => category.toLowerCase() === normalized.toLowerCase()
    );
    if (known) return known;
  }

  const text = values.join(" ").toLowerCase();
  const fromDescription = knownCategories.find((category) =>
    text.includes(`category: ${category.toLowerCase()}`)
  );
  if (fromDescription) return fromDescription;

  if (text.includes("trail") || text.includes("park") || text.includes("plant")) {
    return "Environment";
  }
  if (text.includes("tutor") || text.includes("student") || text.includes("mentor")) {
    return "Education";
  }
  if (text.includes("food") || text.includes("meal") || text.includes("grocery")) {
    return "Food Security";
  }
  if (text.includes("animal") || text.includes("pet") || text.includes("shelter")) {
    return "Animal Welfare";
  }
  if (text.includes("art") || text.includes("mural") || text.includes("creative")) {
    return "Arts & Culture";
  }
  if (text.includes("senior") || text.includes("older adult")) {
    return "Senior Services";
  }
  if (text.includes("health") || text.includes("clinic") || text.includes("wellness")) {
    return "Health & Wellness";
  }
  if (text.includes("housing") || text.includes("renter")) {
    return "Housing";
  }
  if (text.includes("youth") || text.includes("teen")) {
    return "Youth Programs";
  }

  return "Other";
}

export function getOrganizationImageUrl(imageUrl?: string | null) {
  return imageUrl?.trim() || fallbackOrganizationImage;
}
