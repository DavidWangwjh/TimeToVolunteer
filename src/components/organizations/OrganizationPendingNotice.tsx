import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUserProfile } from "@/lib/auth";
import { getOwnOrganizationApplication } from "@/lib/organization-application-access";
import { ResubmitApplicationForm } from "./ResubmitApplicationForm";

export async function OrganizationPendingNotice() {
  const profile = await getCurrentUserProfile();
  const application = profile ? await getOwnOrganizationApplication(profile) : null;
  const rejected = application?.status === "rejected";
  return (
    <Card className="border-amber-200 bg-amber-50/90 py-0 shadow-sm shadow-amber-950/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
          <Lock className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold text-amber-950">
            {rejected ? "Your application was declined" : "Your organization is awaiting approval"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900/80">
            You can view and edit your organization profile and receive messages
            through your inbox. Memberships, registrations, opportunity creation,
            and public search visibility will unlock once a platform admin
            approves your organization.
          </p>
          {rejected && (
            <>
              <p className="mt-3 whitespace-pre-wrap text-sm text-amber-950"><strong>Reason for rejection:</strong>{"\n"}{application.admin_notes || "Please contact support for details."}</p>
              <p className="mt-3 text-sm text-amber-950">Use Edit Profile below to update and save your organization details, then explain your changes and resubmit for review.</p>
              <ResubmitApplicationForm />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
