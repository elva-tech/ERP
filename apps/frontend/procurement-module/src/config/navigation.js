import {
  ArrowLeft,
  ChartNoAxesColumnIncreasing,
  ChartPie,
  CircleX,
  Database,
  GitPullRequestArrow,
  Handshake,
  History,
  LayoutGrid,
  ReceiptIndianRupee,
  ReceiptText,
  Route,
  Subscript,
} from "lucide-react";

export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  supplierMaster: "/supplier-master",
  supplierLedger: "/supplier-ledger",
  supplierLedgerDetail: "/supplier-ledger/detail",
  supplierPerformance: "/supplier-performance",
  purchaseRequisitions: "/purchase-requisitions",
  purchaseOrders: "/purchase-orders",
  purchaseInvoices: "/purchase-invoices",
  purchaseReturns: "/purchase-returns",
  purchaseReports: "/purchase-reports",
  subcontractors: "/subcontractors",
  subcontractAgreements: "/subcontract-agreements",
  subcontractOrders: "/subcontract-orders",
  subcontractBills: "/subcontract-bills",
  pendingApprovals: "/pending-approvals",
  approvalHistory: "/approval-history",
  supplierReports: "/supplier-reports",
  spendAnalysis: "/spend-analysis",
  recordDetail: "/record",
};

export const DEFAULT_ROUTE = ROUTES.dashboard;

/** `key` values are the route keys the session's `navigation` list refers to. */
export const NAV_SECTIONS = [
  {
    title: "Core",
    items: [{ key: "dashboard", label: "Dashboard", icon: LayoutGrid, path: ROUTES.dashboard }],
  },
  {
    title: "Suppliers",
    items: [
      { key: "supplierMaster", label: "Supplier Master", icon: Database, path: ROUTES.supplierMaster },
      { key: "supplierLedger", label: "Supplier Ledger", icon: Database, path: ROUTES.supplierLedger },
      {
        key: "supplierPerformance",
        label: "Supplier Performance",
        icon: ChartNoAxesColumnIncreasing,
        path: ROUTES.supplierPerformance,
      },
    ],
  },
  {
    title: "Purchase",
    items: [
      {
        key: "purchaseRequisitions",
        label: "Purchase Requisition",
        icon: GitPullRequestArrow,
        path: ROUTES.purchaseRequisitions,
      },
      { key: "purchaseOrders", label: "Purchase Orders", icon: CircleX, path: ROUTES.purchaseOrders },
      { key: "purchaseInvoices", label: "Purchase Invoices", icon: ReceiptText, path: ROUTES.purchaseInvoices },
      { key: "purchaseReturns", label: "Purchase Returns", icon: ArrowLeft, path: ROUTES.purchaseReturns },
      {
        key: "purchaseReports",
        label: "Purchase Reports",
        icon: GitPullRequestArrow,
        path: ROUTES.purchaseReports,
      },
    ],
  },
  {
    title: "Subcontracting",
    items: [
      { key: "subcontractors", label: "Subcontractors", icon: Subscript, path: ROUTES.subcontractors },
      {
        key: "subcontractAgreements",
        label: "Subcontract Agreements",
        icon: Handshake,
        path: ROUTES.subcontractAgreements,
      },
      // Subcontract Orders nav item disabled for now.
      // {
      //   key: "subcontractOrders",
      //   label: "Subcontract Orders",
      //   icon: ClipboardList,
      //   path: ROUTES.subcontractOrders,
      // },
      {
        key: "subcontractBills",
        label: "Subcontract Bills",
        icon: ReceiptIndianRupee,
        path: ROUTES.subcontractBills,
      },
    ],
  },
  {
    title: "Workflow",
    items: [
      { key: "pendingApprovals", label: "Pending Approvals", icon: Route, path: ROUTES.pendingApprovals },
      { key: "approvalHistory", label: "Approval History", icon: History, path: ROUTES.approvalHistory },
    ],
  },
  {
    title: "Reports & Analytics",
    items: [{ key: "spendAnalysis", label: "Spend Analysis", icon: ChartPie, path: ROUTES.spendAnalysis }],
  },
];

/**
 * Record-detail `type` query values and the sidebar item they belong to.
 * One shared `/record` route serves every document, so the highlight follows the type.
 */
export const RECORD_TYPE_NAV_KEYS = {
  purchaseRequisition: "purchaseRequisitions",
  purchaseOrder: "purchaseOrders",
  purchaseInvoice: "purchaseInvoices",
  purchaseReturn: "purchaseReturns",
  subcontractAgreement: "subcontractAgreements",
  subcontractOrder: "subcontractOrders",
  subcontractBill: "subcontractBills",
};

/**
 * Sidebar item for the current hash route.
 * Registered pages use their own `navKey` (including nested pages such as the supplier ledger detail).
 * `/record?type=&id=` inherits the parent menu item for that record type.
 * Any other path nested under a menu path inherits that menu item.
 */
export function resolveActiveNavKey(pageNavKey, route) {
  if (pageNavKey) return pageNavKey;
  if (!route) return null;

  if (route.path === ROUTES.recordDetail) {
    const type = route.query.get("type");
    return (type && RECORD_TYPE_NAV_KEYS[type]) || null;
  }

  const path = route.requestedPath || route.path;
  if (!path) return null;

  let match = null;
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const nested = path === item.path || path.startsWith(`${item.path}/`);
      if (nested && (!match || item.path.length > match.path.length)) match = item;
    }
  }
  return match?.key ?? null;
}
