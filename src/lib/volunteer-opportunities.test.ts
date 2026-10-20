import assert from "node:assert/strict";
import { test } from "node:test";
import { getVolunteerAttendance, type VolunteerOpportunityBooking } from "./volunteer-opportunities";

const booking = {
  status: "approved", checked_in_at: null,
  opportunity: { status: "published", date: "2026-10-19", start_time: "16:00:00", end_time: "18:00:00" },
} as VolunteerOpportunityBooking;
const during = new Date("2026-10-20T00:00:00Z");
const ended = new Date("2026-10-20T01:00:00Z");

test("no-show starts only at the end, not during an opportunity", () => {
  assert.equal(getVolunteerAttendance(booking, during), "Not checked in");
  assert.equal(getVolunteerAttendance(booking, ended), "No show");
  assert.equal(getVolunteerAttendance({ ...booking, checked_in_at: "2026-10-19T23:00:00Z" }, ended), "Checked in");
});
test("unapproved and cancelled registrations are never no-shows", () => {
  assert.equal(getVolunteerAttendance({ ...booking, status: "pending" }, during), "Awaiting approval");
  assert.equal(getVolunteerAttendance({ ...booking, status: "pending" }, ended), "Not approved");
  assert.equal(getVolunteerAttendance({ ...booking, opportunity: { ...booking.opportunity, status: "cancelled" } }, ended), "Cancelled");
});
test("an early completion flag does not prematurely mark someone absent", () => {
  assert.equal(getVolunteerAttendance({ ...booking, opportunity: { ...booking.opportunity, status: "completed" } }, during), "Not checked in");
});
