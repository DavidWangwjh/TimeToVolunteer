import { redirect } from "next/navigation";
import { InboxMessageComposeForm } from "@/components/inbox/InboxMessageComposeForm";
import { requireAdmin } from "@/lib/auth";

export default async function OrganizationInboxComposePage() {
  const profile = await requireAdmin();

  if (profile.role !== "organization") {
    redirect("/dashboard/admin/inbox/compose");
  }

  return <InboxMessageComposeForm mode="organization" />;
}
