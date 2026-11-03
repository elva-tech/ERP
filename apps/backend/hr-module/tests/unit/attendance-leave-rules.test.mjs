import test from "node:test";
import assert from "node:assert/strict";
import { countLeaveDays, eachDate, weekdayName } from "../../lib/rules/leave-days.mjs";
import { isNightShift, pairPunches, validateNightWindow } from "../../lib/rules/punch-pairing.mjs";

test("eachDate and weekdayName handle month, leap-year and year boundaries", () => {
  assert.deepEqual(eachDate("2028-02-28", "2028-03-01"), ["2028-02-28", "2028-02-29", "2028-03-01"]);
  assert.equal(eachDate("2026-12-31", "2026-12-31").length, 1);
  assert.equal(weekdayName("2026-10-25"), "sunday");
});

test("calendar-day counting includes weekly offs and holidays", () => {
  assert.equal(countLeaveDays("2026-10-23", "2026-10-27").days, 5);
});

test("excluding weekly offs and holidays", () => {
  const result = countLeaveDays("2026-10-23", "2026-10-27", {
    mode: "exclude_weekly_offs_and_holidays",
    weeklyOffFor: () => "Sunday",
    holidays: new Set(["2026-10-26"]),
  });
  assert.equal(result.days, 3); // Fri, Sat, Tue
  assert.deepEqual(result.excluded.map((e) => e.reason), ["Weekly off", "Holiday"]);
});

test("no rostered weekly off means only holidays are excluded", () => {
  const result = countLeaveDays("2026-10-24", "2026-10-25", {
    mode: "exclude_weekly_offs_and_holidays",
    weeklyOffFor: () => null,
  });
  assert.equal(result.days, 2);
});

test("a request entirely on non-working days counts zero days", () => {
  const result = countLeaveDays("2026-10-25", "2026-10-25", {
    mode: "exclude_weekly_offs_and_holidays",
    weeklyOffFor: () => "Sunday",
  });
  assert.equal(result.days, 0);
});

const day = { id: 1, name: "General", start_time: "09:00", end_time: "18:00" };
const night = { id: 2, name: "Night", start_time: "22:00", end_time: "06:00" };

test("night shift detection", () => {
  assert.equal(isNightShift(day), false);
  assert.equal(isNightShift(night), true);
  assert.equal(isNightShift(null), false);
});

test("day shift uses the calendar date's first and last punch", () => {
  const punches = [
    { local: "2026-10-22 18:05" },
    { local: "2026-10-22 09:02" },
    { local: "2026-10-22 13:00" },
    { local: "2026-10-23 09:00" },
  ];
  const r = pairPunches("2026-10-22", punches, { shift: day, nightWindowMinutes: 120 });
  assert.equal(r.mode, "calendar_date");
  assert.equal(r.checkIn, "09:02");
  assert.equal(r.checkOut, "18:05");
  assert.equal(r.used, 3);
});

test("night shift pairs punches across midnight onto the start date", () => {
  const punches = [
    { local: "2026-10-21 05:58" }, // previous night's check-out
    { local: "2026-10-22 21:55" },
    { local: "2026-10-23 06:04" },
    { local: "2026-10-23 21:58" }, // next night's check-in
  ];
  const r = pairPunches("2026-10-22", punches, { shift: night, nightWindowMinutes: 120 });
  assert.equal(r.mode, "night_shift_window");
  assert.deepEqual([r.checkIn, r.checkInDate, r.checkOut, r.checkOutDate], ["21:55", "2026-10-22", "06:04", "2026-10-23"]);
  assert.equal(r.used, 2);
});

test("night shift without a configured window falls back to the calendar date", () => {
  const punches = [{ local: "2026-10-22 21:55" }, { local: "2026-10-23 06:04" }];
  const r = pairPunches("2026-10-22", punches, { shift: night, nightWindowMinutes: null });
  assert.equal(r.mode, "calendar_date");
  assert.equal(r.checkIn, "21:55");
  assert.equal(r.checkOut, null);
});

test("window boundaries are inclusive and a single punch has no check-out", () => {
  const punches = [{ local: "2026-10-22 20:00" }, { local: "2026-10-23 08:00" }, { local: "2026-10-23 08:01" }];
  const r = pairPunches("2026-10-22", punches, { shift: night, nightWindowMinutes: 120 });
  assert.equal(r.checkIn, "20:00");
  assert.equal(r.checkOut, "08:00");
  const single = pairPunches("2026-10-22", [{ local: "2026-10-23 00:30" }], { shift: night, nightWindowMinutes: 60 });
  assert.equal(single.checkIn, "00:30");
  assert.equal(single.checkInDate, "2026-10-23");
  assert.equal(single.checkOut, null);
});

test("window must leave a gap between consecutive night shifts", () => {
  assert.equal(validateNightWindow(night, 120), null); // gap 16h
  assert.match(validateNightWindow(night, 480), /too large/);
});
