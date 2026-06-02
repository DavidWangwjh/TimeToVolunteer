import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OrganizationSettingsForm } from "@/components/profile/OrganizationSettingsForm";
import { ProfileForm } from "@/components/profile/ProfileForm";
import type { Organization } from "@/types/database";

export default async function AdminProfilePage() {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const { data: organization } =
    profile.role === "organization"
      ? await supabase
          .from("organizations")
          .select("*")
          .eq("owner_id", profile.id)
          .eq("status", "active")
          .maybeSingle()
      : { data: null };

  return (
    <div className="space-y-4">
      <ProfileForm profile={profile} />
      {organization && (
        <OrganizationSettingsForm organization={organization as Organization} />
      )}
    </div>
  );
}
