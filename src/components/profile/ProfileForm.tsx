"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile } from "@/lib/actions";
import { profileUpdateSchema, type ProfileUpdateInput } from "@/lib/validators";
import {
  organizationCategories,
  type OrganizationCategory,
} from "@/lib/organization-options";
import type { Profile } from "@/types/database";

interface ProfileFormProps {
  profile: Profile;
  userMetadata?: Record<string, unknown>;
}

function parseInterests(value: unknown): OrganizationCategory[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is OrganizationCategory =>
    organizationCategories.includes(item as OrganizationCategory)
  );
}

export function ProfileForm({ profile, userMetadata = {} }: ProfileFormProps) {
  const isVolunteer = profile.role === "volunteer";
  const initialInterests = parseInterests(
    profile.volunteer_interests?.length
      ? profile.volunteer_interests
      : userMetadata.volunteer_interests
  );
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone ?? "",
      volunteer_interests: initialInterests,
      volunteer_intro: String(
        profile.volunteer_intro ?? userMetadata.volunteer_intro ?? ""
      ),
      date_of_birth: String(
        profile.date_of_birth ?? userMetadata.date_of_birth ?? ""
      ),
    },
  });
  const [selectedInterests, setSelectedInterests] =
    useState<OrganizationCategory[]>(initialInterests);

  async function onSubmit(data: ProfileUpdateInput) {
    if (isVolunteer && !data.date_of_birth?.trim()) {
      setError("date_of_birth", {
        type: "required",
        message: "Date of birth is required",
      });
      return;
    }

    const result = await updateProfile(data);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated");
    }
  }

  function toggleInterest(interest: OrganizationCategory) {
    const next = selectedInterests.includes(interest)
      ? selectedInterests.filter((item) => item !== interest)
      : [...selectedInterests, interest];

    setSelectedInterests(next);
    setValue("volunteer_interests", next, { shouldValidate: true });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input id="first_name" {...register("first_name")} />
            {errors.first_name && (
              <p className="text-sm text-destructive">{errors.first_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input id="last_name" {...register("last_name")} />
            {errors.last_name && (
              <p className="text-sm text-destructive">{errors.last_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" {...register("phone")} />
          </div>
          {isVolunteer && (
            <>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...register("date_of_birth")}
                />
                {errors.date_of_birth && (
                  <p className="text-sm text-destructive">
                    {errors.date_of_birth.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="volunteer_intro">Self Introduction</Label>
                <Textarea
                  id="volunteer_intro"
                  rows={4}
                  placeholder="Tell organizations about yourself, what motivates you, and the kinds of volunteer work you enjoy."
                  {...register("volunteer_intro")}
                />
              </div>
              <div className="space-y-2">
                <Label>Interested Opportunities</Label>
                <div className="flex flex-wrap gap-2">
                  {organizationCategories.map((interest) => {
                    const selected = selectedInterests.includes(interest);

                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={
                          selected
                            ? "rounded-full border border-emerald-700 bg-emerald-800 px-3 py-1.5 text-sm font-medium text-white"
                            : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                        }
                        aria-pressed={selected}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
                {errors.volunteer_interests && (
                  <p className="text-sm text-destructive">
                    {errors.volunteer_interests.message}
                  </p>
                )}
              </div>
            </>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
