import { Bell, Menu, Search } from "lucide-react";
import { UserProfile } from "./UserProfile.jsx";
import { MockTenantSelector } from "./MockTenantSelector.jsx";
import { isMockMode } from "../../lib/env.js";

export function TopBar({
  title,
  breadcrumb = "Agreements / All Agreements",
  searchValue,
  onSearchChange,
  isMobileOpen,
  onOpenMobile,
}) {
  const isMock = isMockMode();

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-4 border-b border-line bg-surface px-4 sm:px-6">
      {/* Left: Mobile Toggle & Breadcrumb / Title */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation"
          aria-expanded={isMobileOpen}
          className="-ml-1.5 rounded-lg p-1.5 text-ink hover:bg-slate-100 lg:hidden"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-muted">
            {breadcrumb}
          </p>
          <h1 className="truncate text-[16px] font-bold leading-tight text-ink sm:text-[18px]">
            {title}
          </h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {/* Mock Tenant Selector (Rendered ONLY in mock mode) */}
        {isMock && <MockTenantSelector />}

        {/* Global Search Field */}
        <div className="relative hidden w-48 md:block lg:w-60">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchValue || ""}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search agreements..."
            className="h-8.5 w-full rounded-lg border border-line bg-surface-muted/60 pl-8.5 pr-3 text-[12px] text-ink transition-colors placeholder:text-muted focus:border-navy focus:bg-white focus:outline-none"
          />
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid size-8.5 place-items-center rounded-full text-ink hover:bg-slate-100"
        >
          <Bell size={18} strokeWidth={2} aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand"
          />
        </button>

        {/* Separator */}
        <span aria-hidden="true" className="h-6 w-px bg-line" />

        {/* User Profile */}
        <UserProfile />
      </div>
    </header>
  );
}
