import { X } from "lucide-react";
import BrandMark from "../brand/BrandMark.jsx";
import { NAV_SECTIONS } from "../../config/navigation.js";

function NavItem({ item, isActive, onNavigate }) {
  const Icon = item.icon;
  return (
    <a
      href={`#${item.path}`}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
      className={`relative flex h-8 w-full items-center gap-2 rounded-md pl-[11px] pr-3 text-[12px] leading-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/70 ${
        isActive
          ? "bg-sidebar-active font-semibold text-white"
          : "text-sidebar-text hover:bg-white/5 hover:text-white"
      }`}
    >
      {isActive && (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] rounded-l-md bg-brand" />
      )}
      <Icon size={18} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </a>
  );
}

function Sidebar({ activeNavKey, sections = NAV_SECTIONS, isMobileOpen, onCloseMobile }) {
  return (
    <aside
      id="inventory-sidebar"
      aria-label="Inventory navigation"
      className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col bg-sidebar transition-[transform,visibility] duration-200 lg:visible lg:translate-x-0 ${
        isMobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
      }`}
    >
      <div className="mx-4 flex h-[70px] shrink-0 items-center justify-between gap-2 border-b border-sidebar-line pb-1">
        <BrandMark />
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="rounded-md p-1.5 text-sidebar-text hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto px-4 pb-4 pt-5">
        {sections.map((section) => (
          <div key={section.title} className="mb-[14px]">
            <p className="pb-[3px] text-[10px] font-bold leading-[14px] uppercase text-sidebar-text">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.key}>
                  <NavItem item={item} isActive={item.key === activeNavKey} onNavigate={onCloseMobile} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <p className="shrink-0 pb-4 pt-2 text-center text-[11px] leading-[14px] text-muted">Powered by ELVA</p>
    </aside>
  );
}

export default Sidebar;
