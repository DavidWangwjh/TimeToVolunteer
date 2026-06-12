export const siteName = "TimeToVolunteer";

export const siteDescription =
  "TimeToVolunteer helps people find volunteer opportunities near them, join volunteer programs and organizations, and helps organizations manage registrations and community impact in one place.";

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
