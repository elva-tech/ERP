import { Bell, Menu, Search } from "lucide-react";
import UserMenu from "./UserMenu.jsx";

function MenuButton({ isMenuOpen, onOpenMenu }) {
  return (
    <button
      type="button"
      onClick={onOpenMenu}
      aria-label="Open navigation"
      aria-controls="procurement-sidebar"
      aria-expanded={isMenuOpen}
      className="-ml-1.5 rounded-md p-1.5 text-ink hover:bg-workspace lg:hidden"
    >
      <Menu size={20} aria-hidden="true" />
    </button>
  );
}

// The header search is presentational until its behaviour is confirmed (PRD §5.1).
function SearchField({ placeholder, className }) {
  return (
    <label className={className}>
      <Search size={16} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
      <span className="sr-only">Search</span>
      <input
        type="search"
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-[12px] text-ink outline-none placeholder:text-muted"
      />
    </label>
  );
}

function TopBar({ title, titleAdornment, searchPlaceholder, variant = "default", isMenuOpen, onOpenMenu }) {
  if (variant === "ledger-detail") {
    return (
      <header className="sticky top-0 z-20 flex h-[63px] items-center justify-between gap-3 border-b border-[#e0e0e0] bg-surface px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <MenuButton isMenuOpen={isMenuOpen} onOpenMenu={onOpenMenu} />
          <h1 className="truncate text-[17px] font-bold leading-6 text-[#1b2631] sm:text-[18px]">{title}</h1>
          {titleAdornment}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <SearchField
            placeholder={searchPlaceholder}
            className="hidden h-[34px] w-[240px] items-center gap-2 rounded-md bg-[#f1f3f5] px-3 text-[#4b5563] focus-within:ring-2 focus-within:ring-navy/15 md:flex"
          />
          <button
            type="button"
            aria-label="Notifications"
            className="grid size-8 place-items-center rounded-full text-[#1b2631] hover:bg-workspace"
          >
            <Bell size={19} aria-hidden="true" />
          </button>
          <span aria-hidden="true" className="hidden h-5 w-px bg-[#e0e0e0] sm:block" />
          <UserMenu size="compact" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <MenuButton isMenuOpen={isMenuOpen} onOpenMenu={onOpenMenu} />
        <h1 className="truncate text-[18px] font-bold leading-7 text-ink sm:text-[20px]">{title}</h1>
        {titleAdornment}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <SearchField
          placeholder={searchPlaceholder}
          className="hidden h-9 w-[240px] items-center gap-2 rounded-full border border-line bg-workspace px-3 text-muted focus-within:border-muted md:flex"
        />
        <button
          type="button"
          aria-label="Notifications"
          className="grid size-9 place-items-center rounded-full bg-workspace text-ink hover:bg-line"
        >
          <Bell size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

export default TopBar;
