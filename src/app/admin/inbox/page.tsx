import { InboxClient } from "@/components/inbox/InboxClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { InboxMessage } from "@/types/database";

export default async function AdminInboxPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("inbox_messages")
    .select("*")
    .eq("recipient_id", profile.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Review new membership and booking requests for your organization."
      />
      <InboxClient messages={(messages ?? []) as InboxMessage[]} />
    </div>
  );
}
