import assert from "node:assert/strict";
import { test } from "node:test";
import { getOpportunityLifecycle } from "./dates";

const opportunity = { status: "published" as const, date: "2026-10-16", start_time: "16:00:00", end_time: "18:00:00" };

test("published opportunities transition at their Pacific start and end times", () => {
  for (const [instant, category, ongoing] of [
    ["2026-10-16T22:59:59Z", "active", false],
    ["2026-10-16T23:00:00Z", "active", true],
    ["2026-10-17T00:59:59Z", "active", true],
    ["2026-10-17T01:00:00Z", "past", false],
  ] as const) {
    assert.deepEqual(getOpportunityLifecycle(opportunity, new Date(instant)), { category, ongoing });
  }
});

test("drafts and cancellations keep their categories even after their dates pass", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  assert.deepEqual(getOpportunityLifecycle({ ...opportunity, status: "draft" }, now), { category: "draft", ongoing: false });
  assert.deepEqual(getOpportunityLifecycle({ ...opportunity, status: "cancelled" }, now), { category: "cancelled", ongoing: false });
  assert.deepEqual(getOpportunityLifecycle({ ...opportunity, status: "completed" }, now), { category: "past", ongoing: false });
});

test("uses Pacific winter time rather than a fixed UTC offset or browser timezone", () => {
  const winter = { ...opportunity, date: "2026-12-01" };
  assert.deepEqual(getOpportunityLifecycle(winter, new Date("2026-12-02T00:00:00Z")), { category: "active", ongoing: true });
  assert.deepEqual(getOpportunityLifecycle(winter, new Date("2026-12-02T02:00:00Z")), { category: "past", ongoing: false });
});
