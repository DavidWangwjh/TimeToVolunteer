import { InboxClient } from "@/components/inbox/InboxClient";
import { requireActiveVolunteer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InboxMessage } from "@/types/database";

export default async function VolunteerInboxPage() {
  const profile = await requireActiveVolunteer();
  const supabase = createAdminClient();

  const { data: messages } = await supabase
    .from("inbox_messages")
    .select(
      "*, actor:profiles!inbox_messages_actor_id_fkey(first_name, last_name, email), organizations(id, name)"
    )
    .eq("recipient_id", profile.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div>
      <InboxClient
        messages={(messages ?? []) as InboxMessage[]}
        viewer="volunteer"
      />
    </div>
  );
}
