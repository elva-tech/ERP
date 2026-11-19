import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TopBar from "../src/components/layout/TopBar.jsx";
import { PageSearchProvider } from "../src/hooks/usePageSearch.jsx";
import {
  filterByDatePeriod,
  getToday,
  isWithinDateRange,
  parseRecordDate,
  resolveDateRange,
} from "../src/lib/dateRange.js";
import { mockApiAdapter } from "../src/mock-api/mockApiAdapter.js";
import { mockDb } from "../src/mock-api/mockDatabase.js";
import InwardPage from "../src/pages/InwardPage.jsx";
import OutwardPage from "../src/pages/OutwardPage.jsx";
import StockLedgerPage from "../src/pages/StockLedgerPage.jsx";

const WAIT = { timeout: 3000 };
const utc = (iso) => Date.parse(`${iso}T00:00:00Z`);
const TODAY = "2026-11-01";

// Only Date is faked so waitFor and the search debounce keep using real timers.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("parseRecordDate", () => {
  it("reads every date format the inventory uses as a calendar day", () => {
    const expected = utc("2026-09-11");
    expect(parseRecordDate("11 Sep 2026")).toBe(expected);
    expect(parseRecordDate("11 Sept 2026")).toBe(expected);
    expect(parseRecordDate("11 september 2026")).toBe(expected);
    expect(parseRecordDate("2026-09-11")).toBe(expected);
    expect(parseRecordDate("11/09/2026")).toBe(expected);
    expect(parseRecordDate("1 Sep 2026")).toBe(utc("2026-09-01"));
  });

  it("ignores the time of day and the timezone offset", () => {
    const expected = utc("2026-09-11");
    expect(parseRecordDate("2026-09-11T00:00:00Z")).toBe(expected);
    expect(parseRecordDate("2026-09-11T23:59:59Z")).toBe(expected);
    expect(parseRecordDate("2026-09-11T00:30:00+05:30")).toBe(expected);
    expect(parseRecordDate("2026-09-11T23:30:00-08:00")).toBe(expected);
  });

  it("rejects values that are not real dates", () => {
    for (const value of ["", null, undefined, "Sep 2026", "31 Feb 2026", "11 Foo 2026", "not a date"]) {
      expect(parseRecordDate(value)).toBeNull();
    }
  });
});

describe("resolveDateRange", () => {
  it("uses the real current date as the reference", () => {
    expect(getToday()).toBe(TODAY);
    expect(getToday(new Date(2027, 0, 5, 23, 59))).toBe("2027-01-05");
  });

  it("makes rolling periods inclusive of both the first and last day", () => {
    expect(resolveDateRange("30d", "11 Sep 2026")).toEqual({ from: utc("2026-08-13"), to: utc("2026-09-11") });
    expect(resolveDateRange("60d", "11 Sep 2026")).toEqual({ from: utc("2026-07-14"), to: utc("2026-09-11") });
  });

  it("maps Last Quarter to the previous completed calendar quarter", () => {
    const q = (from, to) => ({ from: utc(from), to: utc(to) });
    expect(resolveDateRange("quarter", "01 Nov 2026")).toEqual(q("2026-07-01", "2026-09-30"));
    expect(resolveDateRange("quarter", "01 Oct 2026")).toEqual(q("2026-07-01", "2026-09-30"));
    expect(resolveDateRange("quarter", "30 Sep 2026")).toEqual(q("2026-04-01", "2026-06-30"));
    expect(resolveDateRange("quarter", "15 Jan 2027")).toEqual(q("2026-10-01", "2026-12-31"));
    expect(resolveDateRange("quarter", "01 Apr 2027")).toEqual(q("2027-01-01", "2027-03-31"));
    expect(resolveDateRange("90d", "01 Nov 2026")).toBeNull();
  });

  it("maps the default period to the financial year containing the reference date", () => {
    expect(resolveDateRange("all", "11 Sep 2026")).toEqual({ from: utc("2026-04-01"), to: utc("2027-03-31") });
    expect(resolveDateRange("all", "15 Feb 2027")).toEqual({ from: utc("2026-04-01"), to: utc("2027-03-31") });
    expect(resolveDateRange("all", "31 Mar 2027")).toEqual({ from: utc("2026-04-01"), to: utc("2027-03-31") });
    expect(resolveDateRange("all", "01 Apr 2027")).toEqual({ from: utc("2027-04-01"), to: utc("2028-03-31") });
  });

  it("applies no restriction for an unknown period or reference", () => {
    expect(resolveDateRange("", "11 Sep 2026")).toBeNull();
    expect(resolveDateRange("bogus", "11 Sep 2026")).toBeNull();
    expect(resolveDateRange("30d", null)).toBeNull();
  });

  it("includes both boundary days and excludes the days just outside", () => {
    const range = resolveDateRange("30d", "11 Sep 2026");
    expect(isWithinDateRange("13 Aug 2026", range)).toBe(true);
    expect(isWithinDateRange("12 Aug 2026", range)).toBe(false);
    expect(isWithinDateRange("11 Sep 2026", range)).toBe(true);
    expect(isWithinDateRange("2026-09-11T23:59:59Z", range)).toBe(true);
    expect(isWithinDateRange("12 Sep 2026", range)).toBe(false);
    expect(isWithinDateRange("unreadable", range)).toBe(false);
    expect(isWithinDateRange("unreadable", null)).toBe(true);
  });
});

describe("filterByDatePeriod", () => {
  const records = [{ date: "11 Sep 2026" }, { date: "13 Aug 2026" }, { date: "12 Aug 2026" }];

  it("measures from today, not from the newest record", () => {
    expect(filterByDatePeriod(records, "30d")).toEqual([]);
    expect(filterByDatePeriod(records, "30d", { today: "11 Sep 2026" }).map((r) => r.date)).toEqual([
      "11 Sep 2026",
      "13 Aug 2026",
    ]);
    expect(filterByDatePeriod(records, undefined)).toHaveLength(3);
  });
});

// Each injected record sits on a boundary of a period, measured from today (1 Nov 2026).
const BOUNDARY_RECORDS = [
  ["A", "03 Oct 2026"], // first day of the 30-day window
  ["B", "02 Oct 2026"],
  ["C", "03 Sep 2026"], // first day of the 60-day window
  ["D", "02 Sep 2026"], // just outside 60 days
  ["E", "30 Sep 2026"], // last day of the previous calendar quarter
  ["F", "01 Jul 2026"], // first day of the previous calendar quarter
  ["G", "30 Jun 2026"], // just before the previous calendar quarter
  ["H", "01 Oct 2026"], // first day of the current quarter
  ["I", "01 Nov 2026"], // today
  ["J", "02 Nov 2026"], // in the future
  ["K", "2026-04-01T00:30:00+05:30"], // first day of the financial year, ISO with an offset
  ["L", "31 Mar 2026"], // before the financial year
];

const EXPECTED_BY_PERIOD = {
  all: "ABCDEFGHIJK",
  "30d": "AI",
  "60d": "ABCEHI",
  quarter: "CDEF",
};

const KINDS = {
  inward: {
    collection: () => mockDb.inwardEntries,
    list: (query) => mockApiAdapter.listInward(query),
    record: (key, date) => ({
      id: `t-inw-${key}`,
      grnNo: `GRN-T-${key}`,
      supplier: "Date Test Supplier",
      date,
      totalItems: 1,
      warehouseId: "wh-1",
      warehouseName: "Pune Main Warehouse",
      status: "Received",
      lineItems: [],
    }),
    marker: (key) => `GRN-T-${key}`,
  },
  outward: {
    collection: () => mockDb.outwardEntries,
    list: (query) => mockApiAdapter.listOutward(query),
    record: (key, date) => ({
      id: `t-out-${key}`,
      deliveryNoteNo: `DN-T-${key}`,
      destination: "Date Test Site",
      purpose: "Site Issue",
      date,
      totalItems: 1,
      warehouseId: "wh-1",
      warehouseName: "Pune Main Warehouse",
      status: "Dispatched",
      lineItems: [],
    }),
    marker: (key) => `DN-T-${key}`,
  },
  ledger: {
    collection: () => mockDb.ledgerEntries,
    list: (query) => mockApiAdapter.getLedger(query),
    record: (key, date) => ({
      id: `t-led-${key}`,
      date,
      voucherNo: `VCH-T-${key}`,
      type: "Inward",
      itemId: "item-1",
      itemCode: "CBL-1.5-3C",
      itemName: "Date test item",
      warehouseId: "wh-1",
      warehouseName: "Pune Main Warehouse",
      quantityIn: 1,
      quantityOut: 0,
      balance: 1,
      reference: "date test",
    }),
    marker: (key) => `VCH-T-${key}`,
  },
};

function injectRecords(kind) {
  kind.collection().unshift(...BOUNDARY_RECORDS.map(([key, date]) => kind.record(key, date)));
}

function removeInjected(kind) {
  const collection = kind.collection();
  for (let i = collection.length - 1; i >= 0; i -= 1) {
    if (String(collection[i].id).startsWith("t-")) collection.splice(i, 1);
  }
}

const presentKeys = (rows, kind) =>
  BOUNDARY_RECORDS.map(([key]) => key)
    .filter((key) => rows.some((row) => JSON.stringify(row).includes(kind.marker(key))))
    .join("");

describe.each(Object.entries(KINDS))("%s date period in the service layer", (_name, kind) => {
  beforeEach(() => injectRecords(kind));
  afterEach(() => removeInjected(kind));

  it.each(Object.entries(EXPECTED_BY_PERIOD))("period %s returns only the matching records", async (period, keys) => {
    const { data } = await kind.list({ dateRange: period });
    expect(presentKeys(data, kind)).toBe(keys);
  });

  it("returns every record when no period is sent, including old ones", async () => {
    const { data } = await kind.list({});
    expect(presentKeys(data, kind)).toBe("ABCDEFGHIJKL");
  });

  it("gives different results for different periods (regression: every option used to look the same)", async () => {
    const results = new Set();
    for (const period of Object.keys(EXPECTED_BY_PERIOD)) {
      const { data } = await kind.list({ dateRange: period });
      results.add(presentKeys(data, kind));
    }
    expect(results.size).toBe(Object.keys(EXPECTED_BY_PERIOD).length);
  });

  it("keeps the same window when combined with a search", async () => {
    const hit = await kind.list({ dateRange: "60d", search: kind.marker("C") });
    expect(presentKeys(hit.data, kind)).toBe("C");
    const miss = await kind.list({ dateRange: "60d", search: kind.marker("D") });
    expect(presentKeys(miss.data, kind)).toBe("");
  });
});

describe("ledger summary follows the date period", () => {
  beforeEach(() => injectRecords(KINDS.ledger));
  afterEach(() => removeInjected(KINDS.ledger));

  it("only sums movements inside the period", async () => {
    const all = await mockApiAdapter.getLedger({ dateRange: "all" });
    const last30 = await mockApiAdapter.getLedger({ dateRange: "30d" });
    expect(last30.data.length).toBeLessThanOrEqual(all.data.length);
    expect(last30.summary.totalInward).toBeLessThanOrEqual(all.summary.totalInward);
  });
});

function renderPage(element) {
  return render(
    <PageSearchProvider>
      <TopBar title="Page" searchPlaceholder="Search" />
      {element}
    </PageSearchProvider>,
  );
}

const pageText = () => document.body.textContent;

async function expectPeriod(kind, keys) {
  await waitFor(() => {
    const text = pageText();
    for (const [key] of BOUNDARY_RECORDS) {
      expect(text.includes(kind.marker(key))).toBe(keys.includes(key));
    }
  }, WAIT);
}

const PAGE_CASES = {
  Inward: {
    kind: KINDS.inward,
    element: () => <InwardPage onShowToast={() => {}} />,
    select: () => screen.getByLabelText("Date range"),
    periods: ["30d", "60d", "quarter", "all"],
  },
  Outward: {
    kind: KINDS.outward,
    element: () => <OutwardPage onShowToast={() => {}} />,
    select: () => screen.getByLabelText("Date range"),
    // Outward only offers Current period, Last 30 days and Last 60 days.
    periods: ["30d", "60d", "all"],
  },
  Stock: {
    kind: KINDS.ledger,
    element: () => <StockLedgerPage onShowToast={() => {}} />,
    // The Stock page's Date Period select is the fourth dropdown in its toolbar.
    select: () => screen.getAllByRole("combobox")[3],
    periods: ["30d", "60d", "quarter", "all"],
  },
};

describe.each(Object.entries(PAGE_CASES))("%s page date filter", (_name, page) => {
  beforeEach(() => injectRecords(page.kind));
  afterEach(() => removeInjected(page.kind));

  it("starts on the current period and applies every option, then restores", async () => {
    renderPage(page.element());
    await expectPeriod(page.kind, EXPECTED_BY_PERIOD.all);

    for (const period of page.periods) {
      fireEvent.change(page.select(), { target: { value: period } });
      await expectPeriod(page.kind, EXPECTED_BY_PERIOD[period]);
    }
  });

  it("works together with the main search and clearing it restores the period's records", async () => {
    renderPage(page.element());
    await expectPeriod(page.kind, EXPECTED_BY_PERIOD.all);
    fireEvent.change(page.select(), { target: { value: "60d" } });
    await expectPeriod(page.kind, "ABCEHI");

    const search = screen.getAllByRole("searchbox")[0];
    fireEvent.change(search, { target: { value: page.kind.marker("C") } });
    await expectPeriod(page.kind, "C");

    fireEvent.change(search, { target: { value: page.kind.marker("D") } });
    await expectPeriod(page.kind, "");

    fireEvent.change(search, { target: { value: "" } });
    await expectPeriod(page.kind, "ABCEHI");
  });
});
