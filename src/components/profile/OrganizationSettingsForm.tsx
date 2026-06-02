"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrganizationSettings } from "@/lib/actions";
import type { Organization, OrganizationVisibility } from "@/types/database";

interface OrganizationSettingsFormProps {
  organization: Organization;
}

export function OrganizationSettingsForm({
  organization,
}: OrganizationSettingsFormProps) {
  const [visibility, setVisibility] = useState<OrganizationVisibility>(
    organization.visibility ?? "public"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await updateOrganizationSettings({ visibility });
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Organization settings updated");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(value) =>
                setVisibility(value as OrganizationVisibility)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm leading-6 text-slate-600">
              Public organizations show opportunities to all volunteers. Private
              organizations show opportunities only to accepted volunteers.
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Organization"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
