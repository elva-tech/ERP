
import {
  LayoutDashboard,
  ListTree,
  BookOpen,
  Wallet,
  Receipt,
  FileText,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ArrowDownToLine,
  ChartBar,
  ArrowUpFromLine,
  Landmark,
  ArrowLeftRight,
  ShieldCheck,
  CreditCard,
  Calculator,
  ChartColumn,
  FileCheck,
  Scale,
  ChartLine,
  Waves,
  Building2,
  Files,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

import { useState } from 'react'
import { financeNavigation } from '../../config/navigation'

const iconMap = {
  LayoutDashboard,
  ListTree,
  BookOpen,
  Wallet,
  Receipt,
  FileText,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ArrowDownToLine,
  ChartBar,
  ArrowUpFromLine,
  Landmark,
  ArrowLeftRight,
  ShieldCheck,
  CreditCard,
  Calculator,
  ChartColumn,
  FileCheck,
  Scale,
  ChartLine,
  Waves,
  Building2,
  Files,
}

function Sidebar({ activePage, onNavigate }) {
  const [collapsedGroups, setCollapsedGroups] = useState([])

  const toggleGroup = (title) => {
    setCollapsedGroups((current) =>
      current.includes(title)
        ? current.filter((item) => item !== title)
        : [...current, title],
    )
  }

  return (
    <aside className="flex h-screen w-[260px] min-w-[260px] shrink-0 flex-col bg-[#17243a] text-white">

      {/* Brand Header */}
      <div className="flex h-[88px] shrink-0 items-center gap-2 border-b border-white/10 px-4">

        <img
          src="/elva-logo.png"
          alt="ELVA logo"
          className="h-[62px] w-[76px] shrink-0 object-contain"
        />

        <div className="min-w-0">
          <h1 className="whitespace-nowrap text-[18px] font-bold tracking-wide text-white">
            TECH
          </h1>

          <p className="mt-1 whitespace-nowrap text-[9px] font-medium tracking-[1.2px] text-slate-400">
            FINANCE & ACCOUNTING
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {financeNavigation.map((group) => {
          const isCollapsed = collapsedGroups.includes(group.title)

          return (
            <section key={group.title} className="mb-5">

              {/* Navigation Group */}
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                aria-expanded={!isCollapsed}
                className="mb-2 flex w-full items-center justify-between px-2 py-1 text-[10px] font-semibold tracking-[1.5px] text-slate-400 transition-colors hover:text-white"
              >
                <span>{group.title}</span>

                {isCollapsed ? (
                  <ChevronRight size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>

              {/* Navigation Items */}
              {!isCollapsed && (
                <div className="space-y-1">

                  {group.items.map((item) => {
                    const Icon = iconMap[item.icon]
                    const isActive = activePage === item.id

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex min-h-[42px] w-full items-center gap-3 rounded-md border-l-[3px] px-3 py-2.5 text-left text-[12px] transition-colors ${
                          isActive
                            ? 'border-[#e45b62] bg-white/10 font-semibold text-white'
                            : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {Icon && (
                          <Icon
                            size={17}
                            strokeWidth={1.8}
                            className="shrink-0"
                          />
                        )}

                        <span>{item.label}</span>
                      </button>
                    )
                  })}

                </div>
              )}
            </section>
          )
        })}

      </nav>

      {/* Sidebar Footer */}
      <div className="shrink-0 border-t border-white/10 px-5 py-4">
        <p className="text-[10px] font-medium text-slate-400">
          ELVA TECH
        </p>

        <p className="mt-1 text-[10px] text-slate-500">
          Finance workspace
        </p>
      </div>

    </aside>
  )
}

export default Sidebar
