import { InboxClient } from "@/components/inbox/InboxClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireActiveVolunteer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { InboxMessage } from "@/types/database";

export default async function VolunteerInboxPage() {
  const profile = await requireActiveVolunteer();
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
        description="Review booking updates and organization access decisions."
      />
      <InboxClient messages={(messages ?? []) as InboxMessage[]} />
    </div>
  );
}
