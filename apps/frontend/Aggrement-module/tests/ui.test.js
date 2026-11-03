import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatDate,
  formatInr,
  formatInrCompact,
  displayText,
  sanitizeMoneyInput,
} from "../src/lib/formatters.js";
import { AGREEMENT_STATUS_CONFIG } from "../src/components/ui/badgeStyles.js";
import { STATUS_FILTER_OPTIONS } from "../src/features/agreements/schemas/agreementSchema.js";

describe("UI Logic and Formatters Tests", () => {
  it("formats dates correctly", () => {
    assert.equal(formatDate("2024-01-15"), "15-Jan-2024");
    assert.equal(formatDate("2027-04-24"), "24-Apr-2027");
    assert.equal(formatDate(null), "—");
    assert.equal(formatDate("invalid-date"), "—");
  });

  it("formats Indian Rupee currency standard notation", () => {
    // ₹ 2,40,00,000.00
    const val = formatInr(24000000);
    assert.ok(val.includes("₹"));
    assert.ok(val.includes("2,40,00,000"));

    assert.equal(formatInr(null), "—");
    assert.equal(formatInr(""), "—");
  });

  it("formats compact Indian currency for KPI cards and badges", () => {
    assert.equal(formatInrCompact(124500000), "₹12.45 Cr");
    assert.equal(formatInrCompact(485000000), "₹48.5 Cr");
    assert.equal(formatInrCompact(8500000), "₹85 L");
    assert.equal(formatInrCompact(450000), "₹4.5 L");
    assert.equal(formatInrCompact(25000), "₹25 K");
    assert.equal(formatInrCompact(0), "₹0");
    assert.equal(formatInrCompact(null), "—");
  });

  it("sanitizes monetary input cleanly", () => {
    assert.equal(sanitizeMoneyInput("₹ 1,23,456.78"), "123456.78");
    assert.equal(sanitizeMoneyInput("abc"), "");
  });

  it("provides fallback for display text", () => {
    assert.equal(displayText(null), "—");
    assert.equal(displayText(undefined), "—");
    assert.equal(displayText(""), "—");
    assert.equal(displayText("Valid Text"), "Valid Text");
  });

  it("maps status configurations correctly for all 8 statuses", () => {
    const statuses = ["active", "expiring_soon", "expired", "pending_approval", "draft", "completed", "terminated", "pending_renewal"];
    statuses.forEach((st) => {
      const cfg = AGREEMENT_STATUS_CONFIG[st];
      assert.ok(cfg, `Status ${st} must have config`);
      assert.ok(cfg.label, `Status ${st} must have label`);
      assert.ok(cfg.dotClass, `Status ${st} must have dotClass`);
      assert.ok(cfg.badgeClass, `Status ${st} must have badgeClass`);
    });
  });

  it("contains all filter options specified in PRD", () => {
    const filterValues = STATUS_FILTER_OPTIONS.map((o) => o.value);
    assert.ok(filterValues.includes(""));
    assert.ok(filterValues.includes("draft"));
    assert.ok(filterValues.includes("pending_approval"));
    assert.ok(filterValues.includes("active"));
    assert.ok(filterValues.includes("expired"));
    assert.ok(filterValues.includes("completed"));
    assert.ok(filterValues.includes("terminated"));
    assert.ok(filterValues.includes("pending_renewal"));
  });
});

