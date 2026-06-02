import { getCurrentUserProfile } from "@/lib/auth";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
  const profile = await getCurrentUserProfile();

  return (
    <div>
            <ProfileForm profile={profile!} />
    </div>
  );
}
