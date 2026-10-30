import { useCallback, useEffect, useState } from "react";
import AppShell from "./components/layout/AppShell.jsx";
import Toast from "./components/ui/Toast.jsx";
import { DEFAULT_ROUTE, NAV_SECTIONS, ROUTES } from "./config/navigation.js";
import { useHashRoute } from "./hooks/useHashRoute.js";
import DashboardPage from "./pages/DashboardPage.jsx";
import DeliveryNotesPage from "./pages/DeliveryNotesPage.jsx";
import InwardPage from "./pages/InwardPage.jsx";
import ItemMasterPage from "./pages/ItemMasterPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import OutwardPage from "./pages/OutwardPage.jsx";
import SalesInvoicesPage from "./pages/SalesInvoicesPage.jsx";
import StockAgingPage from "./pages/StockAgingPage.jsx";
import StockLedgerPage from "./pages/StockLedgerPage.jsx";
import StockReconciliationPage from "./pages/StockReconciliationPage.jsx";
import StockTransferPage from "./pages/StockTransferPage.jsx";
import WarehouseDashboardPage from "./pages/WarehouseDashboardPage.jsx";
import WarehouseDetailPage from "./pages/WarehouseDetailPage.jsx";

const TOAST_DURATION_MS = 3200;
const DEFAULT_SEARCH_PLACEHOLDER = "Search items, warehouses, transactions...";

const PAGES = {
  [ROUTES.dashboard]: { title: "Inventory Dashboard", navKey: "dashboard", component: DashboardPage },
  [ROUTES.itemMaster]: { title: "Item Master", navKey: "itemMaster", component: ItemMasterPage },
  [ROUTES.warehouses]: { title: "Warehouse Overview", navKey: "warehouses", component: WarehouseDashboardPage },
  [ROUTES.warehouseDetail]: {
    title: "Warehouse Detail",
    navKey: "warehouses",
    headerVariant: "ledger-detail",
    searchPlaceholder: "Search bins, SKUs...",
    component: WarehouseDetailPage,
  },
  [ROUTES.stockLedger]: { title: "Stock Ledger", navKey: "stockLedger", component: StockLedgerPage },
  [ROUTES.inward]: { title: "Inward Management", navKey: "inward", component: InwardPage },
  [ROUTES.outward]: { title: "Outward Management", navKey: "outward", component: OutwardPage },
  [ROUTES.stockTransfer]: { title: "Stock Transfer", navKey: "stockTransfer", component: StockTransferPage },
  [ROUTES.stockAging]: { title: "Stock Aging Analysis", navKey: "stockAging", component: StockAgingPage },
  [ROUTES.stockReconciliation]: {
    title: "Stock Reconciliation",
    navKey: "stockReconciliation",
    component: StockReconciliationPage,
  },
  [ROUTES.salesInvoice]: { title: "Sales Invoices", navKey: "salesInvoice", component: SalesInvoicesPage },
  [ROUTES.deliveryNote]: { title: "Delivery Notes", navKey: "deliveryNote", component: DeliveryNotesPage },
};

const ROUTE_PATHS = [ROUTES.login, ...Object.keys(PAGES)];

function InventoryApp({ route }) {
  const [toast, setToast] = useState(null);
  const page = route.path ? PAGES[route.path] : PAGES[DEFAULT_ROUTE];
  const title = page?.title ?? "Inventory";
  const PageComponent = page.component;

  useEffect(() => {
    document.title = `${title} · ELVA Inventory`;
  }, [title]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const handleShowToast = useCallback((message, type = "success") => {
    const tone = type === "error" ? "error" : "success";
    setToast({ message, tone, shownAt: Date.now() });
  }, []);

  const navigate = route.navigate;

  const pageProps = {
    route,
    onNavigate: navigate,
    onShowToast: handleShowToast,
  };

  if (route.path === ROUTES.warehouseDetail) {
    pageProps.warehouseId = route.query.get("warehouseId") ?? "";
  }

  return (
    <>
      <AppShell
        activeNavKey={page.navKey}
        navSections={NAV_SECTIONS}
        page={{
          title,
          searchPlaceholder: page.searchPlaceholder ?? DEFAULT_SEARCH_PLACEHOLDER,
          headerVariant: page.headerVariant,
          mainClassName: page.mainClassName,
        }}
      >
        <PageComponent key={route.path ?? DEFAULT_ROUTE} {...pageProps} />
      </AppShell>
      <Toast toast={toast} />
    </>
  );
}

export default function App() {
  const route = useHashRoute(ROUTE_PATHS, DEFAULT_ROUTE);
  const isLoginRoute = route.path === ROUTES.login || route.requestedPath === ROUTES.login;

  useEffect(() => {
    if (isLoginRoute) document.title = "Sign in · ELVA Inventory";
  }, [isLoginRoute]);

  useEffect(() => {
    if (!isLoginRoute && !route.path) {
      route.navigate(DEFAULT_ROUTE);
    }
  }, [isLoginRoute, route.path, route.navigate]);

  if (isLoginRoute) {
    return (
      <>
        <LoginPage onLogin={() => route.navigate(DEFAULT_ROUTE)} onShowToast={() => {}} />
        <Toast toast={null} />
      </>
    );
  }

  if (!route.path) return null;

  return <InventoryApp route={route} />;
}
