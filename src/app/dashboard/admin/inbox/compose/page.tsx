import { InboxMessageComposeForm } from "@/components/inbox/InboxMessageComposeForm";
import { requireAdmin } from "@/lib/auth";

export default async function AdminInboxComposePage() {
  await requireAdmin();

  return <InboxMessageComposeForm mode="admin" />;
}
