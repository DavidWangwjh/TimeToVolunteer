"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  submitOrganizationApplication,
  uploadOrganizationImage,
} from "@/lib/actions";
import {
  organizationApplicationSchema,
  type OrganizationApplicationInput,
} from "@/lib/validators";
import {
  organizationCategories,
  type OrganizationCategory,
} from "@/lib/organization-options";

export function OrganizationApplicationForm() {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationApplicationInput>({
    resolver: zodResolver(organizationApplicationSchema),
  });
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  async function onSubmit(data: OrganizationApplicationInput) {
    let imageUrl = "";

    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      const uploadResult = await uploadOrganizationImage(formData);

      if (uploadResult.error) {
        toast.error(uploadResult.error);
        return;
      }

      imageUrl = uploadResult.url ?? "";
    }

    const result = await submitOrganizationApplication({
      ...data,
      image_url: imageUrl,
    });
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

          <div className="space-y-2">
            <Label htmlFor="organization_description">
              Organization Description *
            </Label>
            <Textarea
              id="organization_description"
              rows={4}
              {...register("organization_description")}
            />
            {errors.organization_description && (
              <p className="text-sm text-destructive">
                {errors.organization_description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select
              value={category}
              onValueChange={(value) => {
                const nextCategory = value as OrganizationCategory;
                setCategory(nextCategory);
                setValue(
                  "category",
                  nextCategory as OrganizationApplicationInput["category"],
                  { shouldValidate: true }
                );
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {organizationCategories.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">
                {errors.category.message}
              </p>
            )}
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password *</Label>
              <Input
                id="confirm_password"
                type="password"
                {...register("confirm_password")}
              />
              {errors.confirm_password && (
                <p className="text-sm text-destructive">
                  {errors.confirm_password.message}
                </p>
              )}
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
            <Label htmlFor="organization_image">Organization Image</Label>
            <Input
              id="organization_image"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setImageFile(file);
                setImagePreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="Selected organization"
                className="mt-2 h-28 w-full rounded-lg object-cover"
              />
            )}
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
