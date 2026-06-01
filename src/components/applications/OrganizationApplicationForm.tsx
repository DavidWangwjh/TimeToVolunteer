"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitOrganizationApplication } from "@/lib/actions";
import {
  organizationApplicationSchema,
  type OrganizationApplicationInput,
} from "@/lib/validators";

export function OrganizationApplicationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationApplicationInput>({
    resolver: zodResolver(organizationApplicationSchema),
  });

  async function onSubmit(data: OrganizationApplicationInput) {
    const result = await submitOrganizationApplication(data);
    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Application</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="organization_name">Organization Name *</Label>
            <Input id="organization_name" {...register("organization_name")} />
            {errors.organization_name && (
              <p className="text-sm text-destructive">
                {errors.organization_name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_first_name">Contact First Name *</Label>
              <Input id="contact_first_name" {...register("contact_first_name")} />
              {errors.contact_first_name && (
                <p className="text-sm text-destructive">
                  {errors.contact_first_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_last_name">Contact Last Name *</Label>
              <Input id="contact_last_name" {...register("contact_last_name")} />
              {errors.contact_last_name && (
                <p className="text-sm text-destructive">
                  {errors.contact_last_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" type="url" {...register("website")} />
            {errors.website && (
              <p className="text-sm text-destructive">{errors.website.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mission">Mission / Focus</Label>
            <Textarea id="mission" rows={4} {...register("mission")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why do you want to join? *</Label>
            <Textarea id="reason" rows={4} {...register("reason")} />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
