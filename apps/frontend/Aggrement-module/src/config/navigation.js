import {
  LayoutGrid,
  FileText,
  FilePlus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FolderOpen,
  History,
  BarChart3,
} from "lucide-react";

export const NAV_SECTIONS = [
  {
    title: "OVERVIEW",
    items: [
      { key: "dashboard", label: "Dashboard", path: "dashboard", icon: LayoutGrid },
    ],
  },
  {
    title: "AGREEMENTS",
    items: [
      { key: "agreements", label: "All Agreements", path: "agreements", icon: FileText },
      { key: "create-agreement", label: "Create Agreement", path: "create-agreement", icon: FilePlus },
      { key: "pending-approval", label: "Pending Approval", path: "pending-approval", icon: Clock },
      { key: "active-agreements", label: "Active Agreements", path: "active-agreements", icon: CheckCircle2 },
      { key: "expiring-soon", label: "Expiring Soon", path: "expiring-soon", icon: AlertTriangle },
      { key: "renewals", label: "Renewals", path: "renewals", icon: RotateCcw },
    ],
  },
  {
    title: "DOCUMENTS",
    items: [
      { key: "documents", label: "Document Store", path: "documents", icon: FolderOpen },
      { key: "version-history", label: "Version History", path: "version-history", icon: History },
    ],
  },
  {
    title: "REPORTS",
    items: [
      { key: "reports", label: "Agreement Reports", path: "reports", icon: BarChart3 },
    ],
  },
];

