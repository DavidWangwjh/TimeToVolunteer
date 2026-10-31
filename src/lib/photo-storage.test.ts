import assert from "node:assert/strict";
import { test } from "node:test";
import { isVolunteerAvatarPath, organizationImagePath } from "./photo-storage";

const user = "12345678-abcd-abcd-abcd-123456789012";
const base = "https://example.supabase.co";
const prefix = `${base}/storage/v1/object/public/organization-images/`;

test("avatar access accepts current and legacy files only within the account", () => {
  assert.equal(isVolunteerAvatarPath(`${user}/profile.webp`, user), true);
  assert.equal(isVolunteerAvatarPath(`${user}/abcd-1234.webp`, user), true);
  for (const path of [null, `${user}2/profile.webp`, `${user}/../profile.webp`, `${user}/folder/profile.webp`, `${user}/profile.png`, "other/profile.webp"]) {
    assert.equal(isVolunteerAvatarPath(path, user), false);
  }
});

test("cover cleanup targets only owned bucket URLs, ignoring cache versions", () => {
  assert.equal(organizationImagePath(`${prefix}profiles/${user}.png`, base), `profiles/${user}.png`);
  assert.equal(organizationImagePath(`${prefix}profiles/${user}/cover.webp?v=2`, base), `profiles/${user}/cover.webp`);
  for (const url of [null, "/organization-placeholder.svg", `${prefix.replace(base, 'https://other.supabase.co')}profiles/${user}.png`, `${base}/storage/v1/object/public/other/profiles/${user}.png`, `${prefix}profiles/%2e%2e/secret.png`, `${prefix}profiles/${user}/unrelated.webp`]) {
    assert.equal(organizationImagePath(url, base), null);
  }
});

test("avatar cleanup paginates, preserves the current photo, and deletes only legacy photo keys", async () => {
  const { removeOldVolunteerPhotos } = await import("./photo-storage");
  const removed: string[] = [];
  const files = [...Array.from({ length: 102 }, (_, i) => ({ name: `${i}.webp` })), { name: "profile.webp" }, { name: "unrelated.txt" }];
  const result = await removeOldVolunteerPhotos({
    async list(prefix, { limit, offset }) {
      assert.equal(prefix, user);
      return { data: files.slice(offset, offset + limit), error: null };
    },
    async remove(paths) { removed.push(...paths); return { error: null }; },
  }, user, `${user}/profile.webp`);
  assert.equal(result, undefined);
  assert.equal(removed.length, 102);
  assert.ok(removed.every(path => path.startsWith(`${user}/`) && path !== `${user}/profile.webp`));
});

test("avatar cleanup reports failures rather than silently claiming success", async () => {
  const { removeOldVolunteerPhotos } = await import("./photo-storage");
  const warning = await removeOldVolunteerPhotos({
    async list() { return { data: null, error: { message: "Unavailable" } }; },
    async remove() { assert.fail("must not delete after listing failure"); },
  }, user);
  assert.match(warning ?? "", /could not be cleaned up/);
});
