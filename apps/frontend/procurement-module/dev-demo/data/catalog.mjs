// DEMO ONLY. Fictional reference data for the temporary demo API. Not real people, companies or tax IDs.
// GSTIN/PAN values use state code "00" and the "ZZD" prefix, which are not issued to real taxpayers.

/** All "relative" calculations (overdue, last 30 days, current month) use this fixed date so the demo is predictable. */
export const DEMO_TODAY = "2026-10-21";
export const FINANCIAL_YEAR = { label: "FY 2026 - 27", start: "2026-04-01", end: "2027-03-31" };

/** Demo calculation constants. They are NOT confirmed business rules (see docs/backend-api-contract.md). */
export const DEMO_RULES = {
  gstRatePercent: 18,
  tdsRatePercent: 1,
  retentionRatePercent: 5,
  annualBudgetPaise: 85_000_000_00,
  previousYearSamePeriodSpendPaise: 41_200_000_00,
  previousYearAverageOrderValuePaise: 22_400_000,
  topRatedThreshold: 4.5,
};

export const USERS = {
  demo: { id: "usr-001", displayName: "Demo User" },
  kavita: { id: "usr-002", displayName: "Kavita Menon" },
  arjun: { id: "usr-003", displayName: "Arjun Desai" },
  neha: { id: "usr-004", displayName: "Neha Kulkarni" },
  vikram: { id: "usr-005", displayName: "Vikram Rao" },
  sana: { id: "usr-006", displayName: "Sana Sheikh" },
  rohit: { id: "usr-007", displayName: "Rohit Bansal" },
};

export const DEPARTMENTS = [
  { id: "dept-projects", name: "Projects" },
  { id: "dept-maintenance", name: "Maintenance" },
  { id: "dept-stores", name: "Stores" },
  { id: "dept-qa", name: "Quality Assurance" },
  { id: "dept-admin", name: "Administration" },
];

export const SUPPLIER_CATEGORIES = [
  { id: "cat-steel", name: "Steel & Metals" },
  { id: "cat-cement", name: "Cement & Aggregates" },
  { id: "cat-electrical", name: "Electrical" },
  { id: "cat-plumbing", name: "Plumbing & Sanitary" },
  { id: "cat-safety", name: "Safety & PPE" },
  { id: "cat-logistics", name: "Logistics" },
];

export const PAYMENT_TERMS = [
  { id: "pt-net30", name: "Net 30 days", days: 30 },
  { id: "pt-net45", name: "Net 45 days", days: 45 },
  { id: "pt-net60", name: "Net 60 days", days: 60 },
];

export const UNITS = [
  { id: "unit-nos", name: "Nos" },
  { id: "unit-mt", name: "MT" },
  { id: "unit-bag", name: "Bags" },
  { id: "unit-m", name: "Metres" },
  { id: "unit-trip", name: "Trips" },
  { id: "unit-day", name: "Days" },
];

/** Unit prices in rupees, before GST. */
export const ITEMS = {
  tmt12: { description: "TMT bars Fe 500D, 12 mm", unitId: "unit-mt", price: 62000 },
  ismb200: { description: "Structural steel ISMB 200", unitId: "unit-mt", price: 68500 },
  msplate10: { description: "MS plates, 10 mm", unitId: "unit-mt", price: 71000 },
  opc53: { description: "OPC 53 grade cement", unitId: "unit-bag", price: 385 },
  agg20: { description: "Crushed aggregate, 20 mm", unitId: "unit-mt", price: 1450 },
  msand: { description: "Manufactured sand (M-sand)", unitId: "unit-mt", price: 1200 },
  xlpe95: { description: "LT XLPE cable, 4C x 95 sq mm", unitId: "unit-m", price: 1850 },
  db12: { description: "MCB distribution board, 12-way", unitId: "unit-nos", price: 6400 },
  flood200: { description: "LED flood light, 200 W", unitId: "unit-nos", price: 7200 },
  cpvc25: { description: "CPVC pipe, 25 mm", unitId: "unit-m", price: 210 },
  gi50: { description: "GI pipe, 50 mm", unitId: "unit-m", price: 640 },
  valve50: { description: "Ball valve, 50 mm", unitId: "unit-nos", price: 1450 },
  helmet: { description: "Safety helmet (ISI marked)", unitId: "unit-nos", price: 320 },
  harness: { description: "Full body harness", unitId: "unit-nos", price: 2850 },
  shoes: { description: "Safety shoes", unitId: "unit-nos", price: 1450 },
  trailer: { description: "Trailer freight, Pune to Mumbai", unitId: "unit-trip", price: 28000 },
  crane: { description: "Mobile crane hire, 25 T", unitId: "unit-day", price: 18500 },
};

// [code suffix, name, categoryId, city, state, contact person, payment term, status, invoice prefix, opening balance (rupees)]
const SUPPLIER_ROWS = [
  [1, "Velora Steel Traders", "cat-steel", "Pune", "Maharashtra", "Meera Joshi", "pt-net45", "active", "VST", 1250000],
  [2, "Granitex Cement Supplies", "cat-cement", "Nashik", "Maharashtra", "Anil Pawar", "pt-net30", "active", "GCS", 340000],
  [3, "Brightwire Electricals", "cat-electrical", "Bengaluru", "Karnataka", "Farah Khan", "pt-net30", "active", "BWE", 185000],
  [4, "Aquaflow Sanitary Systems", "cat-plumbing", "Ahmedabad", "Gujarat", "Jignesh Patel", "pt-net45", "active", "AFS", 96000],
  [5, "Shieldline Safety Gear", "cat-safety", "Chennai", "Tamil Nadu", "Lakshmi Narayan", "pt-net30", "active", "SLS", 42000],
  [6, "Swiftroute Logistics", "cat-logistics", "Mumbai", "Maharashtra", "Deepak Shetty", "pt-net60", "active", "SRL", 118000],
  [7, "Ironcrest Fabricators", "cat-steel", "Nagpur", "Maharashtra", "Sameer Kale", "pt-net60", "active", "ICF", 410000],
  [8, "Terrabuild Aggregates", "cat-cement", "Hyderabad", "Telangana", "Ravi Teja", "pt-net30", "active", "TBA", 75000],
  [9, "Voltgrid Cables", "cat-electrical", "Coimbatore", "Tamil Nadu", "Priya Raman", "pt-net45", "active", "VGC", 0],
  [10, "Pureline Pipes & Fittings", "cat-plumbing", "Jaipur", "Rajasthan", "Manish Gupta", "pt-net30", "inactive", "PPF", 0],
  [11, "Safeguard PPE Depot", "cat-safety", "Indore", "Madhya Pradesh", "Kiran Verma", "pt-net30", "active", "SPD", 0],
  [12, "Northbay Freight Movers", "cat-logistics", "Kochi", "Kerala", "Thomas Mathew", "pt-net45", "inactive", "NFM", 0],
];

export function demoPan(entityLetter, n) {
  return `ZZD${entityLetter}X${String(n).padStart(4, "0")}D`;
}

export function demoGstin(pan) {
  return `00${pan}1Z${pan.at(-2)}`;
}

export const SUPPLIERS = SUPPLIER_ROWS.map(
  ([n, name, categoryId, city, state, contactPerson, paymentTermId, status, invoicePrefix, openingRupees]) => {
    const pan = demoPan("C", n);
    const slug = name.toLowerCase().replace(/[^a-z]+/g, "");
    return {
      id: `sup-${String(n).padStart(3, "0")}`,
      code: `SUP-${String(n).padStart(3, "0")}`,
      name,
      categoryId,
      gstin: demoGstin(pan),
      pan,
      contactPerson,
      phone: `+91 90000 100${String(n).padStart(2, "0")}`,
      email: `accounts@${slug}.example`,
      address: `Plot ${10 + n}, Demo Industrial Estate`,
      city,
      state,
      paymentTermId,
      status,
      invoicePrefix,
      openingBalancePaise: openingRupees * 100,
    };
  },
);

export const RETURN_REASONS = [
  { id: "rr-damaged", name: "Damaged in transit" },
  { id: "rr-spec", name: "Not as per specification" },
  { id: "rr-excess", name: "Excess quantity supplied" },
  { id: "rr-quality", name: "Failed quality inspection" },
];

export const PROJECTS = [
  { id: "prj-001", name: "Riverside Residency, Tower B" },
  { id: "prj-002", name: "Eastgate Logistics Park" },
  { id: "prj-003", name: "Metro Depot Civil Works" },
];

export const TRADE_SPECIALTIES = [
  { id: "ts-civil", name: "Civil & Structural" },
  { id: "ts-mep", name: "MEP Services" },
  { id: "ts-electrical", name: "Electrical Works" },
  { id: "ts-plumbing", name: "Plumbing & Drainage" },
  { id: "ts-waterproofing", name: "Waterproofing" },
  { id: "ts-finishing", name: "Interior Finishing" },
  { id: "ts-facade", name: "Facade & Glazing" },
  { id: "ts-earthwork", name: "Earthwork & Excavation" },
];

export const PAYMENT_SCHEDULES = [
  { id: "ps-monthly", name: "Monthly running bills" },
  { id: "ps-milestone", name: "Milestone based" },
  { id: "ps-advance", name: "10% advance, balance on running bills" },
];

export const REPORTING_PERIODS = [
  { id: "rp-2026-10", name: "October 2026" },
  { id: "rp-2026-09", name: "September 2026" },
  { id: "rp-q2", name: "Q2 FY 2026-27 (Jul-Sep)" },
  { id: "rp-fy", name: "FY 2026-27 (year to date)" },
];

export const PERFORMANCE_PERIODS = [
  { id: "pp-q2", name: "Q2 FY 2026-27 (Jul-Sep)" },
  { id: "pp-q1", name: "Q1 FY 2026-27 (Apr-Jun)" },
];

// [n, name, trade, contact person, status, rating]
const SUBCONTRACTOR_ROWS = [
  [1, "Bedrock Civil Contractors", "ts-civil", "Mahesh Gaikwad", "active", "4.6"],
  [2, "Ampere MEP Services", "ts-mep", "Rekha Pillai", "active", "4.4"],
  [3, "Hydroseal Waterproofing", "ts-waterproofing", "Imran Qureshi", "active", "4.8"],
  [4, "Finetouch Interiors", "ts-finishing", "Pooja Deshmukh", "active", "4.1"],
  [5, "Keystone Structural Works", "ts-civil", "Harish Reddy", "active", "4.5"],
  [6, "Circuitline Electricals", "ts-electrical", "Naveen Kumar", "suspended", "3.2"],
  [7, "Aquaguard Plumbing Works", "ts-plumbing", "Sunita Yadav", "active", "3.9"],
  [8, "Skyline Facade Systems", "ts-facade", "Ajay Malhotra", "active", "4.3"],
  [9, "Groundwork Earthmovers", "ts-earthwork", "Balwinder Singh", "inactive", "3.6"],
];

export const SUBCONTRACTORS = SUBCONTRACTOR_ROWS.map(([n, name, tradeSpecialtyId, contactPerson, status, rating]) => {
  const pan = demoPan("F", 100 + n);
  return {
    id: `sc-${String(n).padStart(3, "0")}`,
    code: `SC-${String(n).padStart(3, "0")}`,
    name,
    firmName: name,
    tradeSpecialtyId,
    gstin: demoGstin(pan),
    pan,
    contactPerson,
    phone: `+91 90000 200${String(n).padStart(2, "0")}`,
    email: `projects@${name.toLowerCase().replace(/[^a-z]+/g, "")}.example`,
    address: `Unit ${n}, Demo Contractors Hub`,
    licenseNumber: `DEMO-LIC-${1000 + n}`,
    licenseExpiryDate: "2027-12-31",
    rating,
    status,
  };
});

export const REPORT_DEFINITIONS = {
  purchase: [
    { key: "po-register", title: "Purchase Order Register", description: "All purchase orders with supplier, value and delivery status for the selected period.", formats: ["pdf", "xlsx"] },
    { key: "pending-deliveries", title: "Pending Deliveries", description: "Sent and partially received purchase orders with their expected delivery dates.", formats: ["xlsx"] },
    { key: "invoice-register", title: "Purchase Invoice Register", description: "Recorded supplier invoices with TDS, net payable and verification status.", formats: ["pdf", "xlsx"] },
    { key: "returns-summary", title: "Purchase Returns Summary", description: "Returns raised against purchase orders, with reasons and credit note status.", formats: ["pdf"] },
    { key: "category-spend", title: "Category-wise Spend", description: "Purchase order value grouped by supplier category.", formats: ["xlsx", "pdf"] },
    { key: "requisition-status", title: "Requisition Status Report", description: "Purchase requisitions by department, priority and approval status.", formats: ["pdf"] },
  ],
};
