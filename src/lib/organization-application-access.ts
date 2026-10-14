import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrganizationApplication, Profile } from "@/types/database";

// Applications are admin-only under RLS. Derive ownership from verified Auth,
// never a client-supplied email or application ID.
export async function getOwnOrganizationApplication(profile: Profile) {
  if (profile.role !== "organization") return null;
  const user = await getCurrentUser();
  if (!user?.email || user.id !== profile.id) return null;
  const { data, error } = await createAdminClient()
    .from("organization_applications")
    .select("*")
    .eq("email", user.email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Unable to load your organization application");
  return data as OrganizationApplication | null;
}

export async function canAccessOrganizationApplication(profile: Profile) {
  const application = await getOwnOrganizationApplication(profile);
  if (!application || !["rejected", "pending", "contacted"].includes(application.status)) return false;
  const { data, error } = await createAdminClient().from("organizations")
    .select("status").eq("owner_id", profile.id).maybeSingle();
  return !error && Boolean(data && data.status !== "active");
}
