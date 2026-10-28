import { useEffect, useId, useRef, useState } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CircleUserRound,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { withQuery } from "./api";
import { ROLE_LABELS, formatDate, formatMoney, initials, useApi } from "./modules/helpers";

export const LOGO_SRC = "/image/Screenshot%202026-10-15%20183343.png";

export const SIDEBAR_WIDTH = "lg:ml-[256px]";
export const SIDEBAR_COLLAPSED_WIDTH = "lg:ml-[76px]";

/** Closes a popover on outside click or Escape. */
function useDismiss(open, onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (ref.current && !ref.current.contains(event.target)) closeRef.current();
    }
    function onKey(event) {
      if (event.key === "Escape") closeRef.current();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return ref;
}

export function LogoTile({ size = 44 }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-sidebar-active ring-1 ring-surface/10"
    >
      {failed ? (
        <span className="text-sm font-bold text-surface" aria-hidden="true">ET</span>
      ) : (
        <img src={LOGO_SRC} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

function BrandMark({ collapsed }) {
  return (
    <div className={`flex h-[70px] items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
      <LogoTile size={36} />
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold leading-[18px] text-surface">ELVA TECH</p>
          <p className="truncate text-[11px] uppercase leading-[14px] text-sidebar-text">HR &amp; Payroll</p>
        </div>
      )}
      <span className="sr-only">ELVA TECH HR & Payroll Portal</span>
    </div>
  );
}

/**
 * sections: [{ title, items: [{ label, icon }] }] already filtered for the role.
 * Hiding items is a convenience only; the API enforces access.
 */
export function Sidebar({ sections, activePage, onNavigate, collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) {
  const [closed, setClosed] = useState(() => new Set());
  const activeSection = sections.find((s) => s.items.some((i) => i.label === activePage))?.title;

  function toggle(title) {
    setClosed((previous) => {
      const next = new Set(previous);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  // The drawer on small screens always shows labels.
  const compact = collapsed && !mobileOpen;

  const closeRef = useRef(onCloseMobile);
  useEffect(() => {
    closeRef.current = onCloseMobile;
  });
  useEffect(() => {
    if (!mobileOpen) return undefined;
    function onKey(event) {
      if (event.key === "Escape") closeRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={onCloseMobile} className="fixed inset-0 z-30 bg-sidebar/60 lg:hidden" />}
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-sidebar-text transition-[transform,width] duration-200 print:hidden lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        } ${compact ? "w-[256px] lg:w-[76px]" : "w-[256px]"}`}
      >
        <div className={`flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-line ${compact ? "mx-2" : "mx-4"}`}>
          <div className="min-w-0 flex-1"><BrandMark collapsed={compact} /></div>
          <button type="button" onClick={onCloseMobile} aria-label="Close navigation" className="rounded-md p-1.5 text-sidebar-text hover:bg-surface/10 hover:text-surface lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className={`sidebar-scroll flex-1 overflow-y-auto pb-4 pt-4 ${compact ? "px-2" : "px-4"}`}>
          {sections.map((section) => {
            const open = compact || section.title === activeSection || !closed.has(section.title);
            const listId = `nav-${section.title.replace(/\W+/g, "-").toLowerCase()}`;
            return (
              <div key={section.title} className="mb-3.5">
                {compact ? (
                  <div className="mx-auto mb-2 h-px w-8 bg-sidebar-line" aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(section.title)}
                    aria-expanded={open}
                    aria-controls={listId}
                    className="flex w-full items-center justify-between rounded py-1 text-[10px] font-bold uppercase leading-[14px] tracking-wider text-sidebar-text hover:text-surface"
                  >
                    {section.title}
                    <ChevronDown size={13} className={`transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden="true" />
                  </button>
                )}
                {open && (
                  <ul id={listId} className="mt-1 space-y-1">
                    {section.items.map(({ label, icon: Icon }) => {
                      const active = activePage === label;
                      return (
                        <li key={label}>
                          <button
                            type="button"
                            onClick={() => onNavigate(label)}
                            title={compact ? label : undefined}
                            aria-current={active ? "page" : undefined}
                            className={`relative flex h-9 w-full items-center gap-2.5 rounded-md text-left text-[13px] leading-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-surface/70 ${
                              compact ? "justify-center px-0" : "pl-3 pr-3"
                            } ${active ? "bg-sidebar-active font-semibold text-surface" : "text-sidebar-text hover:bg-surface/5 hover:text-surface"}`}
                          >
                            {active && <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-md bg-accent" aria-hidden="true" />}
                            <Icon size={17} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                            {compact ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="hidden shrink-0 border-t border-sidebar-line p-3 lg:block">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-sidebar-text hover:bg-surface/5 hover:text-surface ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
          </button>
        </div>
      </aside>
    </>
  );
}

const popoverClass = "absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-line bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.14)]";

/** Searches the pages this user may open and the employees already loaded for the company. */
function GlobalSearch({ pages, employees, onOpenPage, onOpenEmployee, className = "", autoFocus = false, onDone }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const ref = useDismiss(open, () => setOpen(false));
  const listId = useId();

  const q = query.trim().toLowerCase();
  const pageResults = q ? pages.filter((p) => p.label.toLowerCase().includes(q)).slice(0, 5) : [];
  const employeeResults = q
    ? employees
        .filter((e) => `${e.name} ${e.employeeCode} ${e.email} ${e.department} ${e.designation}`.toLowerCase().includes(q))
        .slice(0, 6)
    : [];
  const results = [
    ...pageResults.map((p) => ({ key: `page-${p.label}`, kind: "page", label: p.label, hint: p.section, icon: p.icon })),
    ...employeeResults.map((e) => ({ key: `emp-${e.id}`, kind: "employee", label: e.name, hint: [e.employeeCode, e.department].filter(Boolean).join(" · "), employee: e })),
  ];

  function choose(result) {
    if (result.kind === "page") onOpenPage(result.label);
    else onOpenEmployee(result.employee);
    setQuery("");
    setOpen(false);
    onDone?.();
  }

  function onKeyDown(event) {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[Math.min(cursor, results.length - 1)]);
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <label className="flex h-9 items-center gap-2 rounded-full border border-line bg-workspace px-3.5 text-muted transition-colors focus-within:border-brand focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-soft">
        <Search size={15} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
        <span className="sr-only">Search pages and employees</span>
        <input
          type="search"
          role="combobox"
          aria-expanded={open && Boolean(q)}
          aria-controls={listId}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search pages or employees…"
          className="w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
        />
      </label>
      {open && q && (
        <div id={listId} role="listbox" className={`${popoverClass} left-0 max-h-96 overflow-y-auto p-1.5`}>
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-[13px] text-muted">No matching pages or employees.</p>
          ) : (
            results.map((result, index) => {
              const Icon = result.icon;
              return (
                <button
                  key={result.key}
                  type="button"
                  role="option"
                  aria-selected={index === cursor}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => choose(result)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] ${index === cursor ? "bg-brand-soft" : ""}`}
                >
                  {result.kind === "page" ? (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-line-soft text-ink-soft">{Icon && <Icon size={15} aria-hidden="true" />}</span>
                  ) : (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand" aria-hidden="true">{initials(result.label)}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{result.label}</span>
                    <span className="block truncate text-xs text-muted">{result.kind === "page" ? `Page · ${result.hint}` : `Employee · ${result.hint || "Profile"}`}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/** Pending requests this member may review (GET /api/approvals/pending). */
function NotificationBell({ companyId, onOpenApprovals }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const pending = useApi(withQuery("/api/approvals/pending", { companyId }));
  const data = pending.data || {};
  const items = [
    ...(data.leaveRequests || []).map((r) => ({ key: `l${r.id}`, title: `${r.employee_name} · ${r.leave_type_name}`, detail: `Leave ${formatDate(r.from_date)} – ${formatDate(r.to_date)} (${r.days} day${r.days === 1 ? "" : "s"})` })),
    ...(data.regularizations || []).map((r) => ({ key: `r${r.id}`, title: `${r.employee_name} · Regularization`, detail: `Attendance on ${formatDate(r.attendance_date)}` })),
    ...(data.advances || []).map((r) => ({ key: `a${r.id}`, title: `${r.employee_name} · Advance`, detail: `${formatMoney(r.amount)}${r.purpose ? ` · ${r.purpose}` : ""}` })),
  ];
  const count = items.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) pending.reload();
          setOpen(!open);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={count ? `Approvals: ${count} pending` : "Approvals: none pending"}
        className="relative grid size-9 place-items-center rounded-full bg-workspace text-ink hover:bg-line"
      >
        <Bell size={18} strokeWidth={2.25} aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-surface ring-2 ring-surface">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Pending approvals" className={`${popoverClass} w-[min(22rem,calc(100vw-2rem))]`}>
          <div className="border-b border-line px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">Pending approvals</p>
            <p className="text-xs text-muted">Requests you are allowed to review</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {pending.loading ? (
              <p className="px-4 py-6 text-center text-[13px] text-muted">Loading…</p>
            ) : pending.error ? (
              <p role="alert" className="px-4 py-6 text-center text-[13px] text-danger">{pending.error}</p>
            ) : count === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-muted">Nothing is waiting for your review.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {items.slice(0, 8).map((item) => (
                  <li key={item.key} className="px-4 py-3">
                    <p className="text-[13px] font-medium text-ink">{item.title}</p>
                    <p className="text-xs text-muted">{item.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-line p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenApprovals();
              }}
              className="w-full rounded-md px-3 py-2 text-[13px] font-semibold text-link hover:bg-info-soft"
            >
              Open My Approvals{count > 8 ? ` (${count - 8} more)` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, role, companyName, memberships, companyId, onSwitchCompany, onLogout, logoutBusy, platformAdmin, onOpenPlatform, onOpenOwnProfile }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const name = user?.fullName || user?.email || "Signed-in user";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${name}`}
        className="flex items-center gap-2.5 rounded-full py-0.5 pl-0.5 pr-2 hover:bg-workspace md:rounded-lg"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-surface" aria-hidden="true">{initials(name)}</span>
        <span className="hidden text-left md:block">
          <span className="block max-w-[160px] truncate text-[13px] font-semibold leading-4 text-ink">{name}</span>
          <span className="block text-[11px] leading-4 text-muted">{ROLE_LABELS[role] || "Member"}</span>
        </span>
        <ChevronDown size={15} className="hidden text-muted md:block" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className={`${popoverClass} w-72`}>
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
            {user?.email && <p className="truncate text-xs text-muted">{user.email}</p>}
            <p className="mt-2 inline-flex items-center rounded bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">{ROLE_LABELS[role] || "Member"}</p>
            {companyName && <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft"><Building2 size={13} aria-hidden="true" />{companyName}</p>}
          </div>
          {memberships.length > 1 && (
            <div className="border-b border-line px-4 py-3 xl:hidden">
              <label className="block text-xs font-semibold text-ink-soft">
                Switch company
                <select
                  value={companyId}
                  onChange={(event) => {
                    setOpen(false);
                    onSwitchCompany(event.target.value);
                  }}
                  className="mt-1.5 w-full rounded-md border border-field-line bg-field px-3 py-2 text-[13px] font-normal"
                >
                  {memberships.map((m) => <option key={String(m.companyId)} value={String(m.companyId)}>{m.companyName}</option>)}
                </select>
              </label>
            </div>
          )}
          <div className="p-1.5">
            {onOpenOwnProfile && (
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onOpenOwnProfile(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-ink-soft hover:bg-workspace">
                <CircleUserRound size={16} aria-hidden="true" /> My profile
              </button>
            )}
            {platformAdmin && (
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onOpenPlatform(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-ink-soft hover:bg-workspace">
                <ShieldCheck size={16} aria-hidden="true" /> Platform administration
              </button>
            )}
            <button type="button" role="menuitem" disabled={logoutBusy} onClick={onLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-danger hover:bg-danger-soft disabled:opacity-60">
              <LogOut size={16} aria-hidden="true" /> {logoutBusy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TopBar({
  section,
  title,
  onOpenMobileNav,
  searchPages,
  employees,
  onOpenPage,
  onOpenEmployee,
  onOpenOwnProfile,
  showApprovals,
  session,
  role,
  companyId,
  companyName,
}) {
  const [mobileSearch, setMobileSearch] = useState(false);
  const { memberships = [] } = session;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface print:hidden">
      <div className="flex h-[70px] items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={onOpenMobileNav} aria-label="Open navigation" className="-ml-1.5 rounded-md p-1.5 text-ink hover:bg-workspace lg:hidden">
          <Menu size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="hidden text-[11px] leading-4 text-muted sm:block">
            <ol className="flex items-center gap-1.5">
              <li>HRMS</li>
              {section && <li aria-hidden="true">/</li>}
              {section && <li>{section}</li>}
            </ol>
          </nav>
          <h1 className="truncate text-[18px] font-bold leading-7 text-ink sm:text-[20px]">{title}</h1>
        </div>

        <GlobalSearch className="hidden w-60 md:block xl:w-72" pages={searchPages} employees={employees} onOpenPage={onOpenPage} onOpenEmployee={onOpenEmployee} />
        <button type="button" onClick={() => setMobileSearch(!mobileSearch)} aria-label="Search" aria-expanded={mobileSearch} className="grid size-9 place-items-center rounded-full bg-workspace text-ink hover:bg-line md:hidden">
          <Search size={17} strokeWidth={2.25} />
        </button>

        {memberships.length > 1 && (
          <label className="hidden h-9 items-center gap-2 rounded-md border border-line px-2.5 xl:flex">
            <Building2 size={15} className="text-muted" aria-hidden="true" />
            <span className="sr-only">Active company</span>
            <select value={companyId} onChange={(event) => session.onSwitchCompany(event.target.value)} className="max-w-[180px] bg-transparent text-[13px] text-ink-soft outline-none">
              {memberships.map((m) => <option key={String(m.companyId)} value={String(m.companyId)}>{m.companyName}</option>)}
            </select>
          </label>
        )}

        {showApprovals && <NotificationBell companyId={companyId} onOpenApprovals={() => onOpenPage("My Approvals")} />}

        <UserMenu
          user={session.user}
          role={role}
          companyName={companyName}
          memberships={memberships}
          companyId={companyId}
          onSwitchCompany={session.onSwitchCompany}
          onLogout={session.onLogout}
          logoutBusy={session.logoutBusy}
          platformAdmin={session.platformAdmin}
          onOpenPlatform={session.onOpenPlatform}
          onOpenOwnProfile={onOpenOwnProfile}
        />
      </div>
      {mobileSearch && (
        <div className="border-t border-line px-4 py-3 md:hidden">
          <GlobalSearch autoFocus pages={searchPages} employees={employees} onOpenPage={onOpenPage} onOpenEmployee={onOpenEmployee} onDone={() => setMobileSearch(false)} />
        </div>
      )}
    </header>
  );
}
