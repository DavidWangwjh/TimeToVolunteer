"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileByAdmin } from "@/lib/actions";
import type { Profile } from "@/types/database";

interface AdminVolunteerProfileFormProps {
  volunteer: Profile;
}

export function AdminVolunteerProfileForm({
  volunteer,
}: AdminVolunteerProfileFormProps) {
  const [firstName, setFirstName] = useState(volunteer.first_name);
  const [lastName, setLastName] = useState(volunteer.last_name);
  const [phone, setPhone] = useState(volunteer.phone ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await updateProfileByAdmin(volunteer.id, {
      first_name: firstName,
      last_name: lastName,
      phone,
    });

    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Volunteer profile updated");
    }
  }

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader>
        <CardTitle className="text-base">Edit profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
