import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar.jsx";
import { TopBar } from "./TopBar.jsx";

export function AppShell({
  activeNavKey = "agreements",
  title = "Subcontract Agreements",
  breadcrumb = "Agreements / All Agreements",
  headerSearch = "",
  onHeaderSearchChange,
  children,
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") setIsMobileOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <div className="min-h-screen bg-workspace text-ink">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-30 bg-[#0b1226]/50 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeNavKey={activeNavKey}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-col lg:ml-[240px]">
        <TopBar
          title={title}
          breadcrumb={breadcrumb}
          searchValue={headerSearch}
          onSearchChange={onHeaderSearchChange}
          isMobileOpen={isMobileOpen}
          onOpenMobile={() => setIsMobileOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-7">{children}</main>
      </div>
    </div>
  );
}

