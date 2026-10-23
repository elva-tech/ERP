import { useEffect, useId, useRef, useState } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { withQuery } from "./api";
import { ROLE_LABELS, formatDate, formatMoney, initials, useApi } from "./modules/helpers";

const LOGO_SRC = "/image/Screenshot%202026-10-15%20183343.png";

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
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1d3050] ring-1 ring-white/10"
    >
      {failed ? (
        <span className="text-sm font-bold text-white" aria-hidden="true">ET</span>
      ) : (
        <img src={LOGO_SRC} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

function BrandMark({ collapsed }) {
  return (
    <div className={`flex min-h-[72px] items-center gap-3 border-b border-white/10 ${collapsed ? "justify-center px-2" : "px-5"}`}>
      <LogoTile />
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-[15px] font-bold tracking-wide text-white">ELVA TECH</p>
          <p className="text-[11px] text-navy-300">HR & Payroll Portal</p>
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

  return (
    <>
      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={onCloseMobile} className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden" />}
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-navy-900 text-navy-200 shadow-xl transition-[transform,width] duration-200 lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${compact ? "w-[272px] lg:w-[76px]" : "w-[272px]"}`}
      >
        <div className="flex items-center">
          <div className="min-w-0 flex-1"><BrandMark collapsed={compact} /></div>
          <button type="button" onClick={onCloseMobile} aria-label="Close navigation" className="mr-3 rounded-md p-2 text-navy-200 hover:bg-white/10 lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => {
            const open = compact || section.title === activeSection || !closed.has(section.title);
            const listId = `nav-${section.title.replace(/\W+/g, "-").toLowerCase()}`;
            return (
              <div key={section.title} className="mb-3">
                {compact ? (
                  <div className="mx-auto my-2 h-px w-8 bg-white/10" aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(section.title)}
                    aria-expanded={open}
                    aria-controls={listId}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-300 hover:text-white"
                  >
                    {section.title}
                    <ChevronDown size={14} className={`transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden="true" />
                  </button>
                )}
                {open && (
                  <ul id={listId} className="mt-1 space-y-0.5">
                    {section.items.map(({ label, icon: Icon }) => {
                      const active = activePage === label;
                      return (
                        <li key={label}>
                          <button
                            type="button"
                            onClick={() => onNavigate(label)}
                            title={compact ? label : undefined}
                            aria-current={active ? "page" : undefined}
                            className={`group relative flex min-h-10 w-full items-center gap-3 rounded-lg text-left text-[13px] transition ${
                              compact ? "justify-center px-0" : "px-3"
                            } ${active ? "bg-brand-600 font-semibold text-white shadow-sm" : "text-navy-200 hover:bg-white/[0.06] hover:text-white"}`}
                          >
                            {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-accent-400" aria-hidden="true" />}
                            <Icon size={17} strokeWidth={2} aria-hidden="true" className={active ? "text-white" : "text-navy-300 group-hover:text-white"} />
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

        <div className="hidden border-t border-white/10 p-3 lg:block">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-navy-300 hover:bg-white/[0.06] hover:text-white ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
          </button>
        </div>
      </aside>
    </>
  );
}

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
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
        <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
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
          className="w-full min-w-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
      </label>
      {open && q && (
        <div id={listId} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-xl">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-500">No matching pages or employees.</p>
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
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${index === cursor ? "bg-brand-50" : ""}`}
                >
                  {result.kind === "page" ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{Icon && <Icon size={15} aria-hidden="true" />}</span>
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700" aria-hidden="true">{initials(result.label)}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{result.label}</span>
                    <span className="block truncate text-xs text-slate-500">{result.kind === "page" ? `Page · ${result.hint}` : `Employee · ${result.hint || "Profile"}`}</span>
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
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
      >
        <Bell size={19} aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Pending approvals" className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Pending approvals</p>
            <p className="text-xs text-slate-500">Requests you are allowed to review</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {pending.loading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>
            ) : pending.error ? (
              <p role="alert" className="px-4 py-6 text-center text-sm text-red-600">{pending.error}</p>
            ) : count === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing is waiting for your review.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.slice(0, 8).map((item) => (
                  <li key={item.key} className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.detail}</p>
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
              className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
            >
              Open My Approvals{count > 8 ? ` (${count - 8} more)` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, role, companyName, memberships, companyId, onSwitchCompany, onLogout, logoutBusy, platformAdmin, onOpenPlatform }) {
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
        className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white" aria-hidden="true">{initials(name)}</span>
        <span className="hidden text-left md:block">
          <span className="block max-w-[160px] truncate text-sm font-semibold text-slate-900">{name}</span>
          <span className="block text-xs text-slate-500">{ROLE_LABELS[role] || "Member"}</span>
        </span>
        <ChevronDown size={15} className="hidden text-slate-400 md:block" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            {user?.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{ROLE_LABELS[role] || "Member"}</p>
            {companyName && <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600"><Building2 size={13} aria-hidden="true" />{companyName}</p>}
          </div>
          {memberships.length > 1 && (
            <div className="border-b border-line px-4 py-3 xl:hidden">
              <label className="block text-xs font-semibold text-slate-600">
                Switch company
                <select
                  value={companyId}
                  onChange={(event) => {
                    setOpen(false);
                    onSwitchCompany(event.target.value);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                >
                  {memberships.map((m) => <option key={String(m.companyId)} value={String(m.companyId)}>{m.companyName}</option>)}
                </select>
              </label>
            </div>
          )}
          <div className="p-1.5">
            {platformAdmin && (
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onOpenPlatform(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                <ShieldCheck size={16} aria-hidden="true" /> Platform administration
              </button>
            )}
            <button type="button" role="menuitem" disabled={logoutBusy} onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
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
  showApprovals,
  session,
  role,
  companyId,
  companyName,
}) {
  const [mobileSearch, setMobileSearch] = useState(false);
  const { memberships = [] } = session;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={onOpenMobileNav} aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
          <Menu size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="hidden text-xs text-slate-500 sm:block">
            <ol className="flex items-center gap-1.5">
              <li>HRMS</li>
              {section && <li aria-hidden="true">/</li>}
              {section && <li>{section}</li>}
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="truncate font-medium text-slate-700">{title}</li>
            </ol>
          </nav>
          <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
        </div>

        <GlobalSearch className="hidden w-64 md:block xl:w-80" pages={searchPages} employees={employees} onOpenPage={onOpenPage} onOpenEmployee={onOpenEmployee} />
        <button type="button" onClick={() => setMobileSearch(!mobileSearch)} aria-label="Search" aria-expanded={mobileSearch} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden">
          <Search size={19} />
        </button>

        {memberships.length > 1 && (
          <label className="hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 xl:flex">
            <Building2 size={15} className="text-slate-400" aria-hidden="true" />
            <span className="sr-only">Active company</span>
            <select value={companyId} onChange={(event) => session.onSwitchCompany(event.target.value)} className="max-w-[180px] bg-transparent text-sm text-slate-700 outline-none">
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
