"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitVolunteerApplication } from "@/lib/actions";
import {
  volunteerApplicationSchema,
  type VolunteerApplicationInput,
} from "@/lib/validators";

export function ApplicationForm() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VolunteerApplicationInput>({
    resolver: zodResolver(volunteerApplicationSchema),
    defaultValues: {
      agreement_accepted: false,
    },
  });

  const agreementAccepted = watch("agreement_accepted");

  async function onSubmit(data: VolunteerApplicationInput) {
    try {
      await submitVolunteerApplication(data);
    } catch {
      // redirect handled by server action
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Volunteer Application</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" {...register("phone")} />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age or Date of Birth</Label>
            <Input id="age" {...register("age")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availability">Availability</Label>
            <Textarea
              id="availability"
              placeholder="e.g. Weekends, weekday evenings..."
              {...register("availability")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Relevant Experience</Label>
            <Textarea id="experience" {...register("experience")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred_areas">Preferred Volunteer Areas</Label>
            <Textarea
              id="preferred_areas"
              placeholder="e.g. Food bank, tutoring, events..."
              {...register("preferred_areas")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Volunteering *</Label>
            <Textarea id="reason" {...register("reason")} />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
              <Input id="emergency_contact_name" {...register("emergency_contact_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
              <Input id="emergency_contact_phone" type="tel" {...register("emergency_contact_phone")} />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="agreement"
              checked={agreementAccepted === true}
              onCheckedChange={(checked) =>
                setValue("agreement_accepted", checked === true)
              }
            />
            <div className="space-y-1">
              <Label htmlFor="agreement" className="font-normal leading-relaxed">
                I agree to the volunteer program terms and understand that my application
                will be reviewed by the team.
              </Label>
              {errors.agreement_accepted && (
                <p className="text-sm text-destructive">{errors.agreement_accepted.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
