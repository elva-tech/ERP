import {
  ArrowLeft,
  ChartNoAxesColumnIncreasing,
  ChartPie,
  CircleX,
  ClipboardList,
  Database,
  GitPullRequestArrow,
  Handshake,
  History,
  LayoutGrid,
  ReceiptIndianRupee,
  ReceiptText,
  Route,
  Subscript,
  Users,
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
      {
        key: "subcontractOrders",
        label: "Subcontract Orders",
        icon: ClipboardList,
        path: ROUTES.subcontractOrders,
      },
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
    items: [
      { key: "supplierReports", label: "Supplier Reports", icon: Users, path: ROUTES.supplierReports },
      { key: "spendAnalysis", label: "Spend Analysis", icon: ChartPie, path: ROUTES.spendAnalysis },
    ],
  },
];
