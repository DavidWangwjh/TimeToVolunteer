import sharp from "sharp";

export async function normalizeProfilePhoto(input: Uint8Array) {
  const image = sharp(input, { limitInputPixels: 25000000 });
  const info = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(info.format ?? "")) throw new Error("Unsupported image format");
  // Re-encoding also strips EXIF (including camera/location metadata).
  return image.rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
}

export async function normalizeOrganizationCover(input: Uint8Array) {
  const image = sharp(input, { limitInputPixels: 25000000 });
  const info = await image.metadata();
  if (!["jpeg", "png", "webp", "gif", "avif", "tiff"].includes(info.format ?? "")) throw new Error("Unsupported image format");
  return image.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
}
