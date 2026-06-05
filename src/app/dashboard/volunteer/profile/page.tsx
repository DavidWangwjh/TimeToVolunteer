import { getCurrentUserProfile } from "@/lib/auth";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <ProfileForm profile={profile!} userMetadata={user?.user_metadata ?? {}} />
    </div>
  );
}
