import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function OrganizationPendingNotice() {
  return (
    <Card className="border-amber-200 bg-amber-50/90 py-0 shadow-sm shadow-amber-950/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
          <Lock className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold text-amber-950">
            Your organization is awaiting approval
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900/80">
            You can view and edit your organization profile and receive messages
            through your inbox. Memberships, registrations, opportunity creation,
            and public search visibility will unlock once a platform admin
            approves your organization.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
