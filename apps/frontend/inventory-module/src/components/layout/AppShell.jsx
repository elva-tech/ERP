import { useEffect, useState } from "react";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";

function AppShell({ activeNavKey, navSections, page, children }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isMobileNavOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsMobileNavOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileNavOpen]);

  function handleCloseMobileNav() {
    setIsMobileNavOpen(false);
  }

  return (
    <div className="min-h-screen bg-workspace font-sans text-ink antialiased">
      {isMobileNavOpen && (
        <div
          aria-hidden="true"
          onClick={handleCloseMobileNav}
          className="fixed inset-0 z-30 bg-[#0b1226]/50 lg:hidden"
        />
      )}

      <Sidebar
        activeNavKey={activeNavKey}
        sections={navSections}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={handleCloseMobileNav}
      />

      <div className="flex min-h-screen flex-col lg:ml-[240px]">
        <TopBar
          title={page.title}
          titleAdornment={page.titleAdornment}
          searchPlaceholder={page.searchPlaceholder}
          variant={page.headerVariant}
          isMenuOpen={isMobileNavOpen}
          onOpenMenu={() => setIsMobileNavOpen(true)}
        />
        <main className={`flex min-w-0 flex-1 flex-col p-4 sm:p-6 ${page.mainClassName ?? ""}`}>{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
