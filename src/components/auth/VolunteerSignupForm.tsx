"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { signUpVolunteer } from "@/lib/actions";
import { volunteerSignupSchema, type VolunteerSignupInput } from "@/lib/validators";
import {
  organizationCategories,
  type OrganizationCategory,
} from "@/lib/organization-options";

export function VolunteerSignupForm() {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VolunteerSignupInput>({
    resolver: zodResolver(volunteerSignupSchema),
    defaultValues: {
      volunteer_interests: [],
    },
  });
  const [selectedInterests, setSelectedInterests] = useState<
    OrganizationCategory[]
  >([]);

  async function onSubmit(data: VolunteerSignupInput) {
    const result = await signUpVolunteer(data);
    if (result?.error) {
      toast.error(result.error);
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
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="volunteer_intro">Self Introduction</Label>
            <Input
              id="volunteer_intro"
              placeholder="A short note about yourself"
              {...register("volunteer_intro")}
            />
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>What opportunities are you interested in? *</Label>
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

            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password *</Label>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                {...register("confirm_password")}
              />
              {errors.confirm_password && (
                <p className="text-sm text-destructive">
                  {errors.confirm_password.message}
                </p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create Volunteer Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
