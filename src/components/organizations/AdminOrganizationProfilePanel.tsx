"use client";

import { useState } from "react";
import { OrganizationProfile } from "@/components/organizations/OrganizationProfile";
import { OrganizationSettingsForm } from "@/components/profile/OrganizationSettingsForm";
import type { Organization } from "@/types/database";

interface AdminOrganizationProfilePanelProps {
  organization: Organization;
  platformAdmin?: boolean;
}

export function AdminOrganizationProfilePanel({
  organization,
  platformAdmin = false,
}: AdminOrganizationProfilePanelProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-4">
      <OrganizationProfile
        organization={organization}
        editable
        onEdit={() => setEditing((current) => !current)}
      />
      {editing && (
        <OrganizationSettingsForm
          organization={organization}
          platformAdmin={platformAdmin}
          onSaved={() => setEditing(false)}
        />
      )}
    </div>
  );
}
