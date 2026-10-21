import assert from "node:assert/strict";
import test from "node:test";
import { getVolunteerHours, getVolunteerRank } from "./volunteer-ranks";

test("rank thresholds include fractional hours without rounding up", () => {
  for (const [hours, rank] of [[0, "Bronze"], [49.99, "Bronze"], [50, "Silver"], [99.99, "Silver"], [100, "Gold"], [249.99, "Gold"], [250, "Platinum"], [499.99, "Platinum"], [500, "Diamond"], [1000, "Diamond"]] as const) assert.equal(getVolunteerRank(hours), rank);
});

test("credit checked-in past sessions only, using Pacific end time", () => {
  const booking = { status: "approved" as const, checked_in_at: "2026-10-20T17:00:00Z", opportunity: { status: "published" as const, date: "2026-10-20", start_time: "10:00:00", end_time: "11:30:00" } };
  assert.equal(getVolunteerHours([booking], new Date("2026-10-20T18:29:59Z")), 0);
  assert.equal(getVolunteerHours([booking], new Date("2026-10-20T18:30:00Z")), 1.5);
  const now = new Date("2026-10-21T18:30:00Z");
  assert.equal(getVolunteerHours([{ ...booking, checked_in_at: null }], now), 0);
  assert.equal(getVolunteerHours([{ ...booking, status: "cancelled" }], now), 0);
  assert.equal(getVolunteerHours([{ ...booking, opportunity: { ...booking.opportunity, status: "cancelled" } }], now), 0);
  assert.equal(getVolunteerHours([{ ...booking, opportunity: { ...booking.opportunity, status: "completed", date: "2026-10-22" } }], now), 0);
  assert.equal(getVolunteerHours([booking, { ...booking, opportunity: { ...booking.opportunity, date: "2026-10-19" } }], now), 3);
});
