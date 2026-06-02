import { requireAdmin } from "@/lib/auth";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function AdminProfilePage() {
  const profile = await requireAdmin();

  return (
    <div>
            <ProfileForm profile={profile} />
    </div>
  );
}
