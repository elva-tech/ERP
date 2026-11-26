import { describe, it, expect } from "vitest";
import {
  parseBoundaryMs,
  parseRecordDateToMs,
  isValidDateRange,
  isWithinDateRange,
} from "../src/lib/dateUtils.js";

describe("Date Utilities - Timezone & Range Verification", () => {
  describe("parseBoundaryMs", () => {
    it("should parse YYYY-MM-DD start of day to 00:00:00.000 local time without timezone day-shift", () => {
      const ms = parseBoundaryMs("2026-10-31", false);
      const d = new Date(ms);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(9); // 0-indexed October
      expect(d.getDate()).toBe(31);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
    });

    it("should parse YYYY-MM-DD end of day to 23:59:59.999 local time", () => {
      const ms = parseBoundaryMs("2026-10-31", true);
      const d = new Date(ms);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(9);
      expect(d.getDate()).toBe(31);
      expect(d.getHours()).toBe(23);
      expect(d.getMinutes()).toBe(59);
      expect(d.getSeconds()).toBe(59);
      expect(d.getMilliseconds()).toBe(999);
    });

    it("should return null for empty or invalid date strings", () => {
      expect(parseBoundaryMs("")).toBeNull();
      expect(parseBoundaryMs(null)).toBeNull();
      expect(parseBoundaryMs("invalid-date")).toBeNull();
    });
  });

  describe("parseRecordDateToMs", () => {
    it("should parse human formatted dates 'DD MMM YYYY' correctly", () => {
      const ms = parseRecordDateToMs("11 Sep 2026");
      expect(ms).not.toBeNull();
      const d = new Date(ms);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(8); // September
      expect(d.getDate()).toBe(11);
    });

    it("should parse ISO formatted dates 'YYYY-MM-DD' correctly", () => {
      const ms = parseRecordDateToMs("2026-10-31");
      expect(ms).not.toBeNull();
      const d = new Date(ms);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(9);
      expect(d.getDate()).toBe(31);
    });

    it("should return null for missing or unparseable record dates", () => {
      expect(parseRecordDateToMs(null)).toBeNull();
      expect(parseRecordDateToMs("")).toBeNull();
      expect(parseRecordDateToMs("not a date")).toBeNull();
    });
  });

  describe("isValidDateRange", () => {
    it("should return true when startDate is before or equal to endDate", () => {
      expect(isValidDateRange("2026-10-01", "2026-10-31")).toBe(true);
      expect(isValidDateRange("2026-10-15", "2026-10-15")).toBe(true);
    });

    it("should return false when startDate is chronologically after endDate (inverted range)", () => {
      expect(isValidDateRange("2026-10-31", "2026-10-01")).toBe(false);
      expect(isValidDateRange("2026-11-01", "2026-10-31")).toBe(false);
    });

    it("should return true if either date is omitted (open-ended range)", () => {
      expect(isValidDateRange("2026-10-01", "")).toBe(true);
      expect(isValidDateRange("", "2026-10-31")).toBe(true);
      expect(isValidDateRange("", "")).toBe(true);
    });
  });

  describe("isWithinDateRange", () => {
    it("should include records within normal date ranges (inclusive boundaries)", () => {
      expect(isWithinDateRange("2026-10-15", "2026-10-01", "2026-10-31")).toBe(true);
      expect(isWithinDateRange("2026-10-01", "2026-10-01", "2026-10-31")).toBe(true); // Exact start
      expect(isWithinDateRange("2026-10-31", "2026-10-01", "2026-10-31")).toBe(true); // Exact end
    });

    it("should exclude records outside normal date ranges", () => {
      expect(isWithinDateRange("2026-09-30", "2026-10-01", "2026-10-31")).toBe(false);
      expect(isWithinDateRange("2026-11-01", "2026-10-01", "2026-10-31")).toBe(false);
    });

    it("should support same-day date ranges (startDate === endDate)", () => {
      expect(isWithinDateRange("2026-10-15", "2026-10-15", "2026-10-15")).toBe(true);
      expect(isWithinDateRange("15 Oct 2026", "2026-10-15", "2026-10-15")).toBe(true);
      expect(isWithinDateRange("2026-10-16", "2026-10-15", "2026-10-15")).toBe(false);
    });

    it("should strictly reject inverted date ranges (start > end returns false, NOT true)", () => {
      // Previous defect: inverted date range returned true to prevent zeroing records
      // Production requirement: inverted date ranges must be rejected
      expect(isWithinDateRange("2026-10-15", "2026-10-31", "2026-10-01")).toBe(false);
    });

    it("should reject invalid or missing record dates", () => {
      expect(isWithinDateRange(null, "2026-10-01", "2026-10-31")).toBe(false);
      expect(isWithinDateRange("", "2026-10-01", "2026-10-31")).toBe(false);
      expect(isWithinDateRange("invalid-date", "2026-10-01", "2026-10-31")).toBe(false);
    });

    it("should return true when no range filters are applied", () => {
      expect(isWithinDateRange("2026-10-15", "", "")).toBe(true);
      expect(isWithinDateRange("11 Sep 2026", null, null)).toBe(true);
    });
  });
});

