import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { DEMO_TENANTS } from "../../mock-api/mockTenants.js";
import { useSession } from "../../features/auth/sessionContext.js";

export function MockTenantSelector() {
  const { isMock, activeTenantId, switchMockTenant } = useSession();
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

  // Strict check: NEVER render in production mode!
  if (!isMock) {
    return null;
  }

  const tenantsList = Object.values(DEMO_TENANTS);
  const currentTenant = DEMO_TENANTS[activeTenantId] || tenantsList[0];

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Switch demo tenant in mock testing environment"
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-amber-300/80 bg-amber-50/90 px-2.5 text-[11px] font-bold text-amber-900 transition-colors hover:bg-amber-100/80"
      >
        <Building2 size={13} className="text-amber-700 shrink-0" aria-hidden="true" />
        <span className="truncate max-w-[130px] sm:max-w-[180px]">
          Demo: {currentTenant.name}
        </span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-amber-700 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-40 mt-1.5 w-64 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-[0_10px_25px_rgba(15,23,42,0.15)]"
        >
          <div className="border-b border-line bg-surface-muted/60 px-3.5 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Select Demo Tenant (Mock Only)
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              Switches company, user identity, master data &amp; contracts
            </p>
          </div>

          <div className="py-1">
            {tenantsList.map((tenant) => {
              const isSelected = tenant.id === activeTenantId;
              return (
                <button
                  key={tenant.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    switchMockTenant(tenant.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[12px] transition-colors ${
                    isSelected
                      ? "bg-amber-50/70 font-bold text-amber-950"
                      : "text-ink hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{tenant.name}</p>
                    <p className="truncate text-[10px] text-muted">
                      {tenant.user.displayName} • {tenant.financialYear}
                    </p>
                  </div>
                  {isSelected && (
                    <Check size={14} className="shrink-0 text-amber-700 font-bold" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

