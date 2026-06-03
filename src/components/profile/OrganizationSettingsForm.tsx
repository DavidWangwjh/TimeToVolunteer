"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  updateOrganizationSettings,
  uploadOrganizationImage,
} from "@/lib/actions";
import {
  organizationCategories,
  type OrganizationCategory,
} from "@/lib/organization-options";
import type { Organization, OrganizationVisibility } from "@/types/database";

interface OrganizationSettingsFormProps {
  organization: Organization;
}

export function OrganizationSettingsForm({
  organization,
}: OrganizationSettingsFormProps) {
  const [name, setName] = useState(organization.name);
  const [category, setCategory] = useState<OrganizationCategory>(
    organizationCategories.includes(organization.category as OrganizationCategory)
      ? (organization.category as OrganizationCategory)
      : organizationCategories[0]
  );
  const [description, setDescription] = useState(organization.description ?? "");
  const [website, setWebsite] = useState(organization.website ?? "");
  const [contactEmail, setContactEmail] = useState(organization.contact_email);
  const [contactPhone, setContactPhone] = useState(
    organization.contact_phone ?? ""
  );
  const [imageUrl, setImageUrl] = useState(organization.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(organization.image_url ?? "");
  const [visibility, setVisibility] = useState<OrganizationVisibility>(
    organization.visibility ?? "public"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    let nextImageUrl = imageUrl;

    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      const uploadResult = await uploadOrganizationImage(formData);

      if (uploadResult.error) {
        setIsSubmitting(false);
        toast.error(uploadResult.error);
        return;
      }

      nextImageUrl = uploadResult.url ?? "";
      setImageUrl(nextImageUrl);
    }

    const result = await updateOrganizationSettings({
      name,
      category,
      description,
      website,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      image_url: nextImageUrl,
      visibility,
    });
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Organization profile updated");
    }
  }

  return (
    <Card id="edit-organization">
      <CardHeader>
        <CardTitle>Edit organization profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organization_name">Organization Name</Label>
              <Input
                id="organization_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(value) =>
                  setCategory(value as OrganizationCategory)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {organizationCategories.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization_description">
              Organization Description
            </Label>
            <Textarea
              id="organization_description"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
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
                  setImagePreview(file ? URL.createObjectURL(file) : imageUrl);
                }}
              />
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Organization profile"
                  className="mt-2 h-28 w-full rounded-lg object-cover"
                />
              )}
            </div>
          </div>

          <div className="max-w-md space-y-2">
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
            {isSubmitting ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
