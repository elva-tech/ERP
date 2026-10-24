import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { signOut } from "../../features/auth/authService.js";
import { useSession } from "../../features/auth/sessionContext.js";
import UserIdentity from "./UserIdentity.jsx";

/** Header identity with a menu for the signed-in user. Without a loaded session it shows the identity only. */
function UserMenu({ size = "default" }) {
  const { session, markSignedOut } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const menuId = useId();

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

  if (!session?.user) return <UserIdentity size={size} />;

  async function handleSignOut() {
    setIsSigningOut(true);
    setError(null);
    try {
      await signOut();
      markSignedOut();
    } catch (signOutError) {
      if (signOutError?.kind === "unauthorized") {
        markSignedOut();
        return;
      }
      setError(signOutError?.message ?? "Could not sign out. Try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={`Account menu for ${session.user.displayName}`}
        className="flex items-center gap-1.5 rounded-md p-1 text-left hover:bg-workspace focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <UserIdentity size={size} />
        <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-lg border border-line bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-[13px] font-semibold leading-[18px] text-ink">{session.user.displayName}</p>
            <p className="truncate text-[11px] leading-4 text-muted">{session.user.roleLabel}</p>
            {session.tenant?.name && <p className="mt-1 truncate text-[11px] leading-4 text-muted">{session.tenant.name}</p>}
          </div>
          {error && (
            <p role="alert" className="border-b border-line bg-danger-soft px-4 py-2 text-[11px] leading-4 text-ink">
              {error}
            </p>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-workspace disabled:cursor-wait disabled:opacity-70"
          >
            <LogOut size={15} className="text-muted" aria-hidden="true" />
            {isSigningOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
