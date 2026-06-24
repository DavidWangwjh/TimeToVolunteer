import { InboxClient } from "@/components/inbox/InboxClient";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import type { InboxMessage } from "@/types/database";

export default async function AdminInboxPage() {
  const profile = await requireAdmin();
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild className="bg-emerald-800 hover:bg-emerald-700">
          <Link href="/dashboard/organization/inbox/compose">
            Compose message
          </Link>
        </Button>
      </div>
      <InboxClient
        messages={(messages ?? []) as InboxMessage[]}
        viewer="organization"
      />
    </div>
  );
}
