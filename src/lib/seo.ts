export const siteName = "TimeToVolunteer";

export const siteDescription =
  "Find meaningful volunteer opportunities, join trusted organizations, and manage registrations around your schedule.";

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
