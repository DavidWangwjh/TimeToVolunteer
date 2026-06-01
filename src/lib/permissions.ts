import type { Profile } from "@/types/database";

export function isAdmin(profile: Profile) {
  return profile.role === "organization" || profile.role === "admin";
}

export function isActiveVolunteer(profile: Profile) {
  return profile.role === "volunteer" && profile.status === "active";
}
