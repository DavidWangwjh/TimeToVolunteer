import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultPhotoPosition, photoPosition, photoPositionSchema, photoOverflow, photoStyle } from "./photo-position";

test("legacy photos default to centered, unzoomed framing", () => {
  assert.deepEqual(photoPosition(undefined), defaultPhotoPosition);
  assert.deepEqual(photoPosition(null), defaultPhotoPosition);
});

test("rejects malformed, out-of-bounds, and nonfinite framing", () => {
  for (const value of [{ x: -1, y: 50, zoom: 1 }, { x: 50, y: 101, zoom: 1 }, { x: 50, y: 50, zoom: 0.5 }, { x: 50, y: 50, zoom: 4 }, { x: Infinity, y: 0, zoom: 1 }, { x: "50", y: 50, zoom: 1 }, {}]) {
    assert.equal(photoPositionSchema.safeParse(value).success, false);
  }
});

test("focal point and zoom produce matching CSS anchors", () => {
  assert.deepEqual(photoStyle({ x: 25, y: 80, zoom: 2 }), {
    objectPosition: "25% 80%", transformOrigin: "25% 80%", transform: "scale(2)",
  });
});

test("drag geometry accounts for mobile, desktop, portrait, and zoom", () => {
  assert.deepEqual(photoOverflow(1600, 900, 600, 200, 1), { x: 0, y: 137.5 });
  assert.deepEqual(photoOverflow(1600, 900, 320, 180, 1), { x: 0, y: 0 });
  assert.deepEqual(photoOverflow(800, 1200, 256, 256, 1), { x: 0, y: 128 });
  assert.deepEqual(photoOverflow(800, 1200, 256, 256, 2), { x: 256, y: 512 });
});
