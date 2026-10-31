import { photoPositionSchema, defaultPhotoPosition } from "@/lib/photo-position";
import { isVolunteerAvatarPath, removeOldVolunteerPhotos } from "@/lib/photo-storage";
import { normalizeProfilePhoto } from "@/lib/profile-photo";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserProfile } from "@/lib/auth";

const bucket = "volunteer-avatars";
const maxBytes = 3 * 1024 * 1024;

async function context() {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "volunteer" || profile.status !== "active") return null;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || user.id !== profile.id) return null;
  const value = user.user_metadata.volunteer_avatar_path;
  const path = isVolunteerAvatarPath(value, user.id) ? value : null;
  return { client, user, path };
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return new Response(null, { status: 401 });
  if (!ctx.path) return new Response(null, { status: 404 });
  const { data, error } = await createAdminClient().storage.from(bucket).download(ctx.path);
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(data, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  const ctx = await context();
  if (!ctx) return Response.json({ error: "Sign in as an active volunteer" }, { status: 401 });
  if (Number(request.headers.get("content-length")) > maxBytes + 65536) return Response.json({ error: "Choose a photo smaller than 3 MB" }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Invalid upload" }, { status: 400 }); }
  const file = form.get("photo");
  if (!(file instanceof File) || !file.size || file.size > maxBytes || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return Response.json({ error: "Choose a JPEG, PNG, or WebP photo up to 3 MB" }, { status: 400 });
  }
  let position;
  try { position = photoPositionSchema.parse(JSON.parse(String(form.get("position") || JSON.stringify(defaultPhotoPosition)))); }
  catch { return Response.json({ error: "Invalid photo position" }, { status: 400 }); }
  let bytes: Buffer;
  try {
    bytes = await normalizeProfilePhoto(Buffer.from(await file.arrayBuffer()));
  } catch { return Response.json({ error: "This photo could not be read. Try another JPEG, PNG, or WebP image." }, { status: 400 }); }
  const admin = createAdminClient();
  // Provision private storage on first use. No public bucket or client write policies.
  const { data: existing, error: bucketError } = await admin.storage.getBucket(bucket);
  if (!existing) {
    if (bucketError && String(bucketError.statusCode) !== "404") return Response.json({ error: "Photo storage is unavailable" }, { status: 503 });
    const { error } = await admin.storage.createBucket(bucket, { public: false, fileSizeLimit: maxBytes, allowedMimeTypes: ["image/webp"] });
    if (error && !["409", "400"].includes(String(error.statusCode))) return Response.json({ error: "Photo storage is unavailable" }, { status: 503 });
  }
  const { data: verifiedBucket } = await admin.storage.getBucket(bucket);
  if (!verifiedBucket || verifiedBucket.public) {
    return Response.json({ error: "Photo storage must be private" }, { status: 503 });
  }
  const path = `${ctx.user.id}/profile.webp`;
  const { error: uploadError } = await admin.storage.from(bucket).upload(path, bytes, { contentType: "image/webp", upsert: true, cacheControl: "0" });
  if (uploadError) return Response.json({ error: "Unable to upload photo. Please try again." }, { status: 500 });
  const { error } = await ctx.client.auth.updateUser({ data: { volunteer_avatar_path: path, volunteer_avatar_position: position } });
  if (error) {
    // Keep the single reusable object for a retry; it may already be in use.
    return Response.json({ error: "Unable to save photo" }, { status: 500 });
  }
  const warning = await removeOldVolunteerPhotos(admin.storage.from(bucket), ctx.user.id, path);
  revalidatePath("/dashboard/volunteer");
  return Response.json({ success: true, warning });
}

export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  const ctx = await context();
  if (!ctx) return Response.json({ error: "Not authorized" }, { status: 401 });
  const { error } = await ctx.client.auth.updateUser({ data: { volunteer_avatar_path: null, volunteer_avatar_position: null } });
  if (error) return Response.json({ error: "Unable to remove photo" }, { status: 500 });
  const warning = await removeOldVolunteerPhotos(createAdminClient().storage.from(bucket), ctx.user.id);
  revalidatePath("/dashboard/volunteer");
  return Response.json({ success: true, warning });
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  const ctx = await context();
  if (!ctx || !ctx.path) return Response.json({ error: "No profile photo to edit" }, { status: 400 });
  if (Number(request.headers.get("content-length")) > 4096) return Response.json({ error: "Invalid request" }, { status: 413 });
  let position;
  try {
    const form = await request.formData();
    position = photoPositionSchema.parse(JSON.parse(String(form.get("position"))));
  } catch { return Response.json({ error: "Invalid photo position" }, { status: 400 }); }
  const { error } = await ctx.client.auth.updateUser({ data: { volunteer_avatar_position: position } });
  if (error) return Response.json({ error: "Unable to save photo position" }, { status: 500 });
  revalidatePath("/dashboard/volunteer");
  return Response.json({ success: true });
}
