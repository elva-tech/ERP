import { useState, useEffect } from "react";
import { SessionProvider } from "./features/auth/SessionProvider.jsx";
import { AppShell } from "./components/layout/AppShell.jsx";
import { SubcontractAgreementsPage } from "./pages/SubcontractAgreementsPage.jsx";
import { AgreementDashboardPage } from "./pages/AgreementDashboardPage.jsx";
import { CreateAgreementPage } from "./pages/CreateAgreementPage.jsx";

function AppContent() {
  const [currentHash, setCurrentHash] = useState(
    window.location.hash.replace(/^#/, "") || "agreements"
  );
  const [headerSearch, setHeaderSearch] = useState("");

  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace(/^#/, "") || "agreements";
      setCurrentHash(hash);
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function navigateTo(hash) {
    window.location.hash = hash;
    setCurrentHash(hash);
  }

  // Determine active view and metadata
  let activeNavKey = "agreements";
  let title = "Subcontract Agreements";
  let breadcrumb = "Agreements / All Agreements";
  let content = <SubcontractAgreementsPage />;

  if (currentHash === "dashboard") {
    activeNavKey = "dashboard";
    title = "Portfolio Dashboard";
    breadcrumb = "Agreements / Dashboard";
    content = <AgreementDashboardPage onNavigateToAgreements={() => navigateTo("agreements")} />;
  } else if (currentHash === "create-agreement") {
    activeNavKey = "create-agreement";
    title = "Create Agreement";
    breadcrumb = "Agreements / Create Agreement";
    content = <CreateAgreementPage onNavigateToList={() => navigateTo("agreements")} />;
  } else if (currentHash === "pending-approval") {
    activeNavKey = "pending-approval";
    title = "Pending Approval Agreements";
    breadcrumb = "Agreements / Pending Approval";
    content = <SubcontractAgreementsPage initialStatus="pending_approval" />;
  } else if (currentHash === "active-agreements") {
    activeNavKey = "active-agreements";
    title = "Active Subcontract Agreements";
    breadcrumb = "Agreements / Active Agreements";
    content = <SubcontractAgreementsPage initialStatus="active" />;
  } else if (currentHash === "expiring-soon") {
    activeNavKey = "expiring-soon";
    title = "Agreements Expiring Soon";
    breadcrumb = "Agreements / Expiring Soon";
    content = <SubcontractAgreementsPage initialStatus="expiring_soon" />;
  } else if (currentHash === "renewals") {
    activeNavKey = "renewals";
    title = "Agreement Renewal Management";
    breadcrumb = "Agreements / Renewals";
    content = <SubcontractAgreementsPage initialStatus="pending_renewal" />;
  }

  return (
    <AppShell
      activeNavKey={activeNavKey}
      title={title}
      breadcrumb={breadcrumb}
      headerSearch={headerSearch}
      onHeaderSearchChange={setHeaderSearch}
    >
      {content}
    </AppShell>
  );
}

export function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

export default App;
