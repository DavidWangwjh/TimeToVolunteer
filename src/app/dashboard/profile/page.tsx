import { getCurrentUserProfile } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
  const profile = await getCurrentUserProfile();

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Manage your account information."
      />
      <ProfileForm profile={profile!} />
    </div>
  );
}
