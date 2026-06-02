"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { signUpVolunteer } from "@/lib/actions";
import { volunteerSignupSchema, type VolunteerSignupInput } from "@/lib/validators";

export function VolunteerSignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VolunteerSignupInput>({
    resolver: zodResolver(volunteerSignupSchema),
  });

  async function onSubmit(data: VolunteerSignupInput) {
    const result = await signUpVolunteer(data);
    if (result?.error) {
      toast.error(result.error);
    }
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

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
            <h2 className="text-sm font-bold text-emerald-950">
              Help us recommend good matches
            </h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="volunteer_interests">
                  What causes or activities interest you? *
                </Label>
                <Textarea
                  id="volunteer_interests"
                  placeholder="Tutoring, food support, parks, events, animals..."
                  {...register("volunteer_interests")}
                />
                {errors.volunteer_interests && (
                  <p className="text-sm text-destructive">
                    {errors.volunteer_interests.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="volunteer_availability">
                  When are you usually available? *
                </Label>
                <Textarea
                  id="volunteer_availability"
                  placeholder="Weekday evenings, Saturday mornings, once a month..."
                  {...register("volunteer_availability")}
                />
                {errors.volunteer_availability && (
                  <p className="text-sm text-destructive">
                    {errors.volunteer_availability.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="volunteer_goals">
                  What kind of volunteer experience are you looking for? *
                </Label>
                <Textarea
                  id="volunteer_goals"
                  placeholder="Build mentoring experience, meet neighbors, volunteer outdoors..."
                  {...register("volunteer_goals")}
                />
                {errors.volunteer_goals && (
                  <p className="text-sm text-destructive">
                    {errors.volunteer_goals.message}
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
