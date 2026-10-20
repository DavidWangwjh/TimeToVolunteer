import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { normalizeProfilePhoto } from "./profile-photo";

test("profile photos become square WebP images without EXIF", async () => {
  const input = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#167461" } }).jpeg().withMetadata().toBuffer();
  const result = await normalizeProfilePhoto(input);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.exif, undefined);
});

test("rejects corrupt files and SVG content regardless of filename", async () => {
  await assert.rejects(normalizeProfilePhoto(Buffer.from("not an image")));
  await assert.rejects(normalizeProfilePhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>')));
});
