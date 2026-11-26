import { Menu } from "lucide-react";
import PageSearchField from "./PageSearchField.jsx";
import NotificationBell from "./NotificationBell.jsx";
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
          <PageSearchField placeholder={searchPlaceholder} variant="ledger-detail" />
          <NotificationBell size="compact" />
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
        <PageSearchField placeholder={searchPlaceholder} />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}

export default TopBar;