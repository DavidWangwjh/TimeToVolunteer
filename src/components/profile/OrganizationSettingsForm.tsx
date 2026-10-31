"use client";

import { useEffect, useState, type FormEvent } from "react";
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
import { getOrganizationImageUrl } from "@/lib/organization-display";
import {
  updateOrganizationByAdmin,
  updateOrganizationSettings,
  uploadOrganizationImage,
  removeOrganizationCover,
} from "@/lib/actions";
import {
  organizationCategories,
  type OrganizationCategory,
} from "@/lib/organization-options";
import {
  isOrganizationImageTooLarge,
  ORGANIZATION_IMAGE_SIZE_LABEL,
} from "@/lib/file-limits";
import { organizationSettingsSchema } from "@/lib/validators";
import { PhotoEditor } from "./PhotoEditor";
import { PhotoFrame } from "./PhotoFrame";
import { defaultPhotoPosition, photoPosition } from "@/lib/photo-position";
import type { Organization, OrganizationVisibility } from "@/types/database";

interface OrganizationSettingsFormProps {
  organization: Organization;
  platformAdmin?: boolean;
  onSaved?: () => void;
}

export function OrganizationSettingsForm({
  organization,
  platformAdmin = false,
  onSaved,
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
  const [position, setPosition] = useState(() => photoPosition(organization.image_position));
  const [editor, setEditor] = useState<{ src: string; file?: File } | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  useEffect(() => () => { if (editor?.file && editor.src.startsWith("blob:")) URL.revokeObjectURL(editor.src); }, [editor]);
  useEffect(() => () => { if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview); }, [imagePreview]);
  const [visibility, setVisibility] = useState<OrganizationVisibility>(
    organization.visibility ?? "public"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = organizationSettingsSchema.safeParse({ name, category, description, website, contact_email: contactEmail, contact_phone: contactPhone, image_url: imageUrl, image_position: position, visibility });
    if (!validation.success) { toast.error(validation.error.issues[0].message); return; }
    setIsSubmitting(true);
    try {
    let nextImageUrl = imageUrl;

    if (removeCover) {
      const result = await removeOrganizationCover(organization.id);
      if (result.error) { toast.error(result.error); setIsSubmitting(false); return; }
      if (result.warning) toast.warning(result.warning);
      nextImageUrl = "";
      setImageUrl("");
      setRemoveCover(false);
    }
    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("organizationId", organization.id);
      formData.append("position", JSON.stringify(position));
      const uploadResult = await uploadOrganizationImage(formData);

      if (uploadResult.error) {
        setIsSubmitting(false);
        toast.error(uploadResult.error);
        return;
      }

      nextImageUrl = uploadResult.url ?? "";
      setImageUrl(nextImageUrl);
      setImageFile(null);
      setImagePreview(nextImageUrl);
      if (uploadResult.warning) toast.warning(uploadResult.warning);
    }

    const payload = {
      name,
      category,
      description,
      website,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      image_url: nextImageUrl,
      image_position: position,
      visibility,
    };
    const result = platformAdmin
      ? await updateOrganizationByAdmin(organization.id, payload)
      : await updateOrganizationSettings(payload);
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Organization profile updated");
      onSaved?.();
    }
    } catch {
      toast.error("Unable to save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
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
                accept="image/jpeg,image/png,image/webp"
                disabled={isSubmitting}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (isOrganizationImageTooLarge(file)) { toast.error(`Organization images must be ${ORGANIZATION_IMAGE_SIZE_LABEL} or smaller`); return; }
                  setEditor({ src: URL.createObjectURL(file), file });
                }}
              />
              <p className="text-xs text-slate-500">
                Upload an image up to {ORGANIZATION_IMAGE_SIZE_LABEL}.
              </p>
              <PhotoFrame src={getOrganizationImageUrl(imagePreview)} alt="Organization cover preview" position={position} className="mt-2 aspect-video w-full rounded-lg sm:aspect-[3/1]" />
              {imagePreview && <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => setEditor({ src: imagePreview })}>Reposition / zoom</Button>
                <Button type="button" variant="ghost" size="sm" disabled={isSubmitting} onClick={() => { setImageFile(null); setImagePreview(""); setPosition(defaultPhotoPosition); setRemoveCover(true); }}>Remove cover</Button>
              </div>}
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
      {editor && <PhotoEditor src={editor.src} kind="cover" initialPosition={editor.file ? defaultPhotoPosition : position} onCancel={() => setEditor(null)} onSave={(nextPosition) => {
        setPosition(nextPosition);
        if (editor.file) { setImageFile(editor.file); setImagePreview(URL.createObjectURL(editor.file)); }
        setRemoveCover(false);
        setEditor(null);
      }} />}
    </Card>
  );
}
