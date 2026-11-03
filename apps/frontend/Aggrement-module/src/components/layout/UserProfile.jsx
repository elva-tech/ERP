import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, Shield, LogOut } from "lucide-react";
import { useSession } from "../../features/auth/sessionContext.js";
import { signOut } from "../../features/auth/authService.js";

export function UserProfile() {
  const { session, reload } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const user = session?.user || {
    displayName: "Authenticated User",
    roleLabel: "Contracts Officer",
    initials: "AU",
    email: "user@elvatech.com",
  };

  const tenant = session?.tenant || {
    name: "Enterprise Tenant",
  };

  const initials =
    user.initials ||
    user.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    "AU";

  async function handleSignOut() {
    await signOut();
    reload();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2.5 rounded-lg p-1 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[12px] font-bold text-ink">
          {initials}
        </div>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="truncate text-[13px] font-bold leading-tight text-ink">
            {user.displayName}
          </p>
          <p className="truncate text-[10px] font-medium leading-none text-muted">
            {user.roleLabel}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={`hidden text-muted transition-transform sm:block ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1.5 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
        >
          <div className="border-b border-line bg-surface-muted/50 px-4 py-3">
            <p className="text-[13px] font-bold text-ink">{user.displayName}</p>
            <p className="text-[11px] text-muted">{user.email || "contracts@company.com"}</p>
            <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-navy">
              <Shield size={10} />
              <span>{tenant.name}</span>
            </div>
          </div>
          <div className="py-1 text-[12px]">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2 text-ink hover:bg-slate-50"
            >
              <User size={14} className="text-muted" />
              <span>Profile Settings</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
