import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { ROUTES } from "../../config/navigation.js";
import { MOCK_INVENTORY_USER } from "../../features/auth/mockUser.js";
import { buildHref } from "../../hooks/useHashRoute.js";
import UserIdentity from "./UserIdentity.jsx";

function UserMenu({ size = "default" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const menuId = useId();
  const user = MOCK_INVENTORY_USER;

  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSignOut() {
    window.location.replace(buildHref(ROUTES.login));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={`Account menu for ${user.displayName}`}
        className="flex items-center gap-1.5 rounded-md p-1 text-left hover:bg-workspace focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <UserIdentity size={size} />
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-lg border border-line bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-[13px] font-semibold leading-[18px] text-ink">{user.displayName}</p>
            <p className="truncate text-[11px] leading-4 text-muted">{user.roleLabel}</p>
            {user.tenantName && <p className="mt-1 truncate text-[11px] leading-4 text-muted">{user.tenantName}</p>}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-workspace"
          >
            <LogOut size={15} className="text-muted" aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
