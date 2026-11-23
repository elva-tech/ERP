
import {
  Bell,
  HelpCircle,
  ChevronDown,
  Menu,
} from 'lucide-react'

function TopBar({ pageTitle, onMenuClick }) {
  return (
    <header className="flex h-[70px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-[17px] font-semibold text-slate-800">
            {pageTitle}
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Finance & Accounting
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
        >
          <Bell size={19} />
        </button>

        <button
          type="button"
          aria-label="Help"
          title="Help"
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
        >
          <HelpCircle size={19} />
        </button>

        <div className="mx-1 h-8 w-px bg-slate-200" />

        <button
          type="button"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
          aria-label="Finance user profile"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
            EL
          </div>

          <div className="text-left">
            <p className="text-xs font-semibold text-slate-700">
              Finance User
            </p>
            <p className="text-[10px] text-slate-400">
              Finance
            </p>
          </div>

          <ChevronDown size={15} className="text-slate-400" />
        </button>
      </div>
    </header>
  )
}

export default TopBar
