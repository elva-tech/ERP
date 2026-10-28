import assert from "node:assert/strict";
import test from "node:test";
import { formatIndianMoneyInput, indianMoneyCaret, parseIndianMoneyInput } from "./formatters.js";
import { exceedsDecimal, isMoneyAmount, isPositiveDecimal } from "./validation.js";

test("formats whole amounts with Indian grouping", () => {
  assert.equal(formatIndianMoneyInput("1000"), "1,000");
  assert.equal(formatIndianMoneyInput("150000"), "1,50,000");
  assert.equal(formatIndianMoneyInput("1500000"), "15,00,000");
  assert.equal(formatIndianMoneyInput("25000000"), "2,50,00,000");
});

test("keeps decimals and a trailing point while typing", () => {
  assert.equal(formatIndianMoneyInput("1500.5"), "1,500.5");
  assert.equal(formatIndianMoneyInput("1500.50"), "1,500.50");
  assert.equal(formatIndianMoneyInput("1500."), "1,500.");
  assert.equal(formatIndianMoneyInput("1.999"), "1.99");
  assert.equal(formatIndianMoneyInput(".5"), "0.5");
  assert.equal(formatIndianMoneyInput(""), "");
  assert.equal(formatIndianMoneyInput("abc"), "");
});

test("parses a formatted amount back to a comma-free decimal", () => {
  assert.equal(parseIndianMoneyInput("2,50,00,000"), "25000000");
  assert.equal(parseIndianMoneyInput("₹1,50,000.50"), "150000.50");
  assert.equal(parseIndianMoneyInput("15,00,000."), "1500000.");
  assert.equal(isMoneyAmount(parseIndianMoneyInput("1,50,000")), true);
  assert.equal(isMoneyAmount("1,50,000"), false);
  assert.equal(isPositiveDecimal(parseIndianMoneyInput("1,500.50")), true);
  assert.equal(exceedsDecimal(parseIndianMoneyInput("2,50,00,000"), "1500000.00", 2), true);
  assert.equal(exceedsDecimal(parseIndianMoneyInput("1,50,000"), "1500000.00", 2), false);
});

test("places the caret after the same number of digits when commas are inserted", () => {
  let display = "";
  let caret = 0;
  for (const digit of "150000") {
    const raw = `${display.slice(0, caret)}${digit}${display.slice(caret)}`;
    const significant = raw.slice(0, caret + 1).replace(/[^\d.]/g, "").length;
    display = formatIndianMoneyInput(raw);
    caret = indianMoneyCaret(display, significant);
  }
  assert.equal(display, "1,50,000");
  assert.equal(caret, display.length);
  assert.equal(parseIndianMoneyInput(display), "150000");
});
