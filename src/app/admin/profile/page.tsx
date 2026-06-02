import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function AdminProfilePage() {
  const profile = await requireAdmin();

  return (
    <div>
      <PageHeader
        eyebrow="Admin account"
        title="Profile"
        description="Manage the contact details tied to your admin account."
      />
      <ProfileForm profile={profile} />
    </div>
  );
}
