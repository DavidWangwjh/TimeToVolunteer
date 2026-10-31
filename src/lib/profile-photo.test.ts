import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { normalizeProfilePhoto } from "./profile-photo";

test("profile photos retain their full frame as WebP without EXIF", async () => {
  const input = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#167461" } }).jpeg().withMetadata().toBuffer();
  const result = await normalizeProfilePhoto(input);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width, 800);
  assert.equal(metadata.height, 600);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.exif, undefined);
});

test("rejects corrupt files and SVG content regardless of filename", async () => {
  await assert.rejects(normalizeProfilePhoto(Buffer.from("not an image")));
  await assert.rejects(normalizeProfilePhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>')));
});

test("organization covers retain their aspect ratio and strip EXIF", async () => {
  const { normalizeOrganizationCover } = await import("./profile-photo");
  const input = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#167461" } }).jpeg().withMetadata().toBuffer();
  const result = await normalizeOrganizationCover(input);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 800);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.exif, undefined);
  await assert.rejects(normalizeOrganizationCover(Buffer.from("not an image")));
});
