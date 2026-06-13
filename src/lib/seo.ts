export const siteName = "TimeToVolunteer";

export const siteDescription =
  "Find volunteer opportunities near you, student volunteering programs, volunteer jobs, and trusted volunteer organizations with TimeToVolunteer.";

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
