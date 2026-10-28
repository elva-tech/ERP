import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "./components/layout/AppShell.jsx";
import Toast from "./components/ui/Toast.jsx";
import { DEFAULT_ROUTE, NAV_SECTIONS, ROUTES } from "./config/navigation.js";
import SessionProvider from "./features/auth/SessionProvider.jsx";
import { canAccessRoute, useSession } from "./features/auth/sessionContext.js";
import { buildHref, useHashRoute } from "./hooks/useHashRoute.js";
import ApprovalHistoryPage from "./pages/ApprovalHistoryPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import PendingApprovalsPage from "./pages/PendingApprovalsPage.jsx";
import PurchaseInvoicesPage from "./pages/PurchaseInvoicesPage.jsx";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage.jsx";
import PurchaseReportsPage from "./pages/PurchaseReportsPage.jsx";
import PurchaseRequisitionsPage from "./pages/PurchaseRequisitionsPage.jsx";
import PurchaseReturnsPage from "./pages/PurchaseReturnsPage.jsx";
import RecordDetailPage from "./pages/RecordDetailPage.jsx";
import SpendAnalysisPage from "./pages/SpendAnalysisPage.jsx";
import SubcontractAgreementsPage from "./pages/SubcontractAgreementsPage.jsx";
import SubcontractBillsPage from "./pages/SubcontractBillsPage.jsx";
// Subcontract Orders screen is disabled for now.
// import SubcontractOrdersPage from "./pages/SubcontractOrdersPage.jsx";
import SubcontractorsPage from "./pages/SubcontractorsPage.jsx";
import SupplierLedgerDetailPage from "./pages/SupplierLedgerDetailPage.jsx";
import SupplierLedgerPage from "./pages/SupplierLedgerPage.jsx";
import SupplierMasterPage from "./pages/SupplierMasterPage.jsx";
import SupplierPerformancePage from "./pages/SupplierPerformancePage.jsx";
// Supplier Reports screen removed.

const TOAST_DURATION_MS = 3200;
const DEFAULT_SEARCH_PLACEHOLDER = "Search transactions, suppliers...";
const SHORT_SEARCH_PLACEHOLDER = "Search transactions...";

/**
 * `navKey` is the sidebar item highlighted for the route; `adornment` names the header element a page
 * may fill in once its data has loaded.
 */
const PAGES = {
  [ROUTES.dashboard]: { title: "Procurement Dashboard", navKey: "dashboard", component: DashboardPage },
  [ROUTES.supplierMaster]: { title: "Supplier Master", navKey: "supplierMaster", component: SupplierMasterPage },
  [ROUTES.supplierLedger]: { title: "Supplier Ledger", navKey: "supplierLedger", component: SupplierLedgerPage },
  [ROUTES.supplierLedgerDetail]: {
    title: "Supplier Ledger — Detail View",
    navKey: "supplierLedger",
    headerVariant: "ledger-detail",
    searchPlaceholder: "Search accounts, bills...",
    adornment: "financialYear",
    mainClassName: "bg-[#f2f4f4]",
    component: SupplierLedgerDetailPage,
  },
  [ROUTES.supplierPerformance]: {
    title: "Supplier Performance Scorecard",
    navKey: "supplierPerformance",
    component: SupplierPerformancePage,
  },
  [ROUTES.purchaseRequisitions]: {
    title: "Purchase Requisitions",
    navKey: "purchaseRequisitions",
    component: PurchaseRequisitionsPage,
  },
  [ROUTES.purchaseOrders]: { title: "Purchase Orders", navKey: "purchaseOrders", component: PurchaseOrdersPage },
  [ROUTES.purchaseInvoices]: { title: "Purchase Invoices", navKey: "purchaseInvoices", component: PurchaseInvoicesPage },
  [ROUTES.purchaseReturns]: { title: "Purchase Returns", navKey: "purchaseReturns", component: PurchaseReturnsPage },
  [ROUTES.purchaseReports]: {
    title: "Purchase Reports",
    navKey: "purchaseReports",
    searchPlaceholder: SHORT_SEARCH_PLACEHOLDER,
    component: PurchaseReportsPage,
  },
  [ROUTES.subcontractors]: { title: "Subcontractors", navKey: "subcontractors", component: SubcontractorsPage },
  [ROUTES.subcontractAgreements]: {
    title: "Subcontract Agreements",
    navKey: "subcontractAgreements",
    component: SubcontractAgreementsPage,
  },
  // [ROUTES.subcontractOrders]: { title: "Subcontract Orders", navKey: "subcontractOrders", component: SubcontractOrdersPage },
  [ROUTES.subcontractBills]: { title: "Subcontract Bills", navKey: "subcontractBills", component: SubcontractBillsPage },
  [ROUTES.pendingApprovals]: {
    title: "Pending Approvals",
    navKey: "pendingApprovals",
    searchPlaceholder: SHORT_SEARCH_PLACEHOLDER,
    adornment: "count",
    component: PendingApprovalsPage,
  },
  [ROUTES.approvalHistory]: {
    title: "Approval History",
    navKey: "approvalHistory",
    searchPlaceholder: SHORT_SEARCH_PLACEHOLDER,
    component: ApprovalHistoryPage,
  },
  [ROUTES.spendAnalysis]: {
    title: "Spend Analysis",
    navKey: "spendAnalysis",
    searchPlaceholder: SHORT_SEARCH_PLACEHOLDER,
    component: SpendAnalysisPage,
  },
  [ROUTES.recordDetail]: { title: "Record Details", navKey: null, component: RecordDetailPage },
};

const ROUTE_PATHS = [ROUTES.login, ...Object.keys(PAGES)];

/** Only routes inside the shell are accepted as a post-sign-in destination; anything else goes to the dashboard. */
function resolveReturnTo(returnTo) {
  const [path] = (returnTo ?? "").split("?");
  return PAGES[path] ? returnTo : DEFAULT_ROUTE;
}

function HeaderAdornment({ kind, value }) {
  if (value === null || value === undefined || value === "") return null;
  if (kind === "financialYear") {
    return (
      <span className="shrink-0 rounded bg-[#ebf5fb] px-2 py-[3px] text-[11px] font-semibold leading-[14px] text-[#1a5276]">
        {value}
      </span>
    );
  }
  if (kind === "count") {
    return (
      <span className="grid h-[22px] min-w-[22px] shrink-0 place-items-center rounded-full bg-brand px-1.5 text-[12px] font-bold leading-none text-white">
        {value}
      </span>
    );
  }
  return null;
}

/**
 * Signed-out handling relies only on the session endpoint: a 401 from it (or from any later request)
 * sends the user to the sign-in screen, and an authenticated session leaves it again. When the API is
 * unreachable or not configured the shell stays visible so each screen can show its own error state.
 */
function ProcurementRouter() {
  const route = useHashRoute(ROUTE_PATHS, DEFAULT_ROUTE);
  const { status } = useSession();
  const isLoginRoute = route.path === ROUTES.login;
  const search = route.query.toString();
  const currentLocation = search ? `${route.requestedPath}?${search}` : route.requestedPath;
  const returnTo = isLoginRoute ? route.query.get("returnTo") : null;

  useEffect(() => {
    if (status === "unauthenticated" && !isLoginRoute) {
      window.location.replace(buildHref(ROUTES.login, { returnTo: currentLocation }));
    } else if (status === "authenticated" && isLoginRoute) {
      window.location.replace(`#${resolveReturnTo(returnTo)}`);
    }
  }, [status, isLoginRoute, currentLocation, returnTo]);

  useEffect(() => {
    if (isLoginRoute) document.title = "Sign in · ELVA Procurement";
  }, [isLoginRoute]);

  if (isLoginRoute) return <LoginPage />;
  if (status === "unauthenticated") return null;
  return <ProcurementApp route={route} />;
}

function ProcurementApp({ route }) {
  const { session } = useSession();
  const [toast, setToast] = useState(null);
  const [adornment, setAdornment] = useState({ path: null, value: null });

  const page = route.path ? PAGES[route.path] : null;
  const isForbidden = Boolean(page?.navKey) && !canAccessRoute(session, page.navKey);
  const title = page?.title ?? "Page not found";

  const navSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => canAccessRoute(session, item.key)),
      })).filter((section) => section.items.length > 0),
    [session],
  );

  useEffect(() => {
    document.title = `${title} · ELVA Procurement`;
  }, [title]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const handleNotify = useCallback((message, tone = "success") => {
    setToast({ message, tone, shownAt: Date.now() });
  }, []);

  const currentPath = route.path;
  const handleAdornmentChange = useCallback((value) => setAdornment({ path: currentPath, value }), [currentPath]);

  const PageComponent = page?.component;
  let content;
  if (!page) content = <NotFoundPage requestedPath={route.requestedPath} />;
  else if (isForbidden) content = <ForbiddenPage />;
  else
    content = (
      <PageComponent
        key={route.path}
        route={route}
        onNotify={handleNotify}
        onHeaderAdornmentChange={handleAdornmentChange}
      />
    );

  return (
    <>
      <AppShell
        activeNavKey={page?.navKey ?? null}
        navSections={navSections}
        page={{
          title,
          titleAdornment: page?.adornment && adornment.path === route.path && (
            <HeaderAdornment kind={page.adornment} value={adornment.value} />
          ),
          searchPlaceholder: page?.searchPlaceholder ?? DEFAULT_SEARCH_PLACEHOLDER,
          headerVariant: page?.headerVariant,
          mainClassName: page?.mainClassName,
        }}
      >
        {content}
      </AppShell>
      <Toast toast={toast} />
    </>
  );
}

function ForbiddenPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-surface px-6 py-16 text-center">
      <h2 className="text-[15px] font-semibold text-ink">Access denied</h2>
      <p className="max-w-md text-[13px] leading-5 text-muted">Your role does not include access to this screen.</p>
    </div>
  );
}

function App() {
  return (
    <SessionProvider>
      <ProcurementRouter />
    </SessionProvider>
  );
}

export default App;
