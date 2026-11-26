import {
  LayoutDashboard,
  Layers,
  Building2,
  BarChart2,
  ArrowDownLeft,
  RefreshCw,
  Repeat,
  TrendingDown,
  CheckSquare,
  Truck,
} from "lucide-react";

export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  itemMaster: "/item-master",
  warehouses: "/warehouses",
  warehouseDetail: "/warehouse-detail",
  stockLedger: "/stock-ledger",
  inward: "/inward",
  outward: "/outward",
  stockTransfer: "/stock-transfer",
  stockAging: "/stock-aging",
  stockReconciliation: "/stock-reconciliation",
  deliveryNote: "/delivery-note",
};

export const DEFAULT_ROUTE = ROUTES.dashboard;

export const NAV_SECTIONS = [
  {
    title: "Core",
    items: [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: ROUTES.dashboard }],
  },
  {
    title: "Items",
    items: [{ key: "itemMaster", label: "Item Master", icon: Layers, path: ROUTES.itemMaster }],
  },
  {
    title: "Warehouse",
    items: [
      { key: "warehouses", label: "Warehouses", icon: Building2, path: ROUTES.warehouses },
      { key: "stockLedger", label: "Stock", icon: BarChart2, path: ROUTES.stockLedger },
      { key: "inward", label: "Inward", icon: ArrowDownLeft, path: ROUTES.inward },
      { key: "outward", label: "Outward", icon: RefreshCw, path: ROUTES.outward },
      { key: "stockTransfer", label: "Stock Transfer", icon: Repeat, path: ROUTES.stockTransfer },
    ],
  },
  {
    title: "Stock control",
    items: [
      { key: "stockAging", label: "Stock Aging", icon: TrendingDown, path: ROUTES.stockAging },
      {
        key: "stockReconciliation",
        label: "Stock Reconciliation",
        icon: CheckSquare,
        path: ROUTES.stockReconciliation,
      },
    ],
  },
  {
    title: "Dispatches",
    items: [
      { key: "deliveryNote", label: "Delivery Note", icon: Truck, path: ROUTES.deliveryNote },
    ],
  },
];
