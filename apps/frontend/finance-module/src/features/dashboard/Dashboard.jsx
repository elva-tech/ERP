
import {
  ArrowUpRight,
  Wallet,
  TrendingUp,
  CircleDollarSign,
  Receipt,
  Landmark,
  ChartNoAxesCombined,
  HandCoins,
  BadgeAlert,
} from 'lucide-react'

const kpiCards = [
  { title: 'Revenue (YTD)', icon: TrendingUp, color: 'blue' },
  { title: 'Expenses (YTD)', icon: Wallet, color: 'orange' },
  { title: 'EBITDA Margin', icon: ChartNoAxesCombined, color: 'green' },
  { title: 'Net Profit (PAT)', icon: CircleDollarSign, color: 'red' },
  { title: 'Total Receivables', icon: Receipt, color: 'red' },
  { title: 'Outstanding Payables', icon: HandCoins, color: 'red' },
  { title: 'Bank & Cash Balance', icon: Landmark, color: 'green' },
  { title: 'Budget Utilization', icon: ChartNoAxesCombined, color: 'blue' },
  { title: 'Outstanding Collections', icon: BadgeAlert, color: 'orange' },
]

const accentColors = {
  blue: 'border-l-[#205c7d]',
  orange: 'border-l-[#e45b00]',
  green: 'border-l-[#22ae65]',
  red: 'border-l-[#dc3030]',
}

function EmptyChart() {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60">
      <ChartNoAxesCombined size={30} className="text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-500">
        No financial data available
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Chart will appear when data is connected.
      </p>
    </div>
  )
}

function Dashboard() {
  return (
    <div className="space-y-5">
      {/* Financial KPI cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((card) => {
          const Icon = card.icon

          return (
            <div
              key={card.title}
              className={`min-h-[132px] rounded-lg border border-slate-200 border-l-4 ${accentColors[card.color]} bg-white p-5 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {card.title}
                </p>
                <Icon size={17} className="text-slate-400" />
              </div>

              <div className="mt-5 h-8 w-3/4 rounded bg-slate-100" />
              <div className="mt-3 h-3 w-1/2 rounded bg-slate-50" />
            </div>
          )
        })}
      </section>

      {/* Charts and attention panel */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-800">
              YTD Income vs Expenses Trends
            </h2>
            <span className="rounded bg-sky-50 px-3 py-1.5 text-[10px] font-semibold text-sky-800">
              QUARTERLY REVIEW
            </span>
          </div>

          <EmptyChart />

          <div className="mt-4 flex justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#205c7d]" />
              Revenue
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#dc3030]" />
              Expenses
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-800">
              Attention Required
            </h2>
            <span className="rounded bg-red-50 px-3 py-1.5 text-[10px] font-semibold text-red-600">
              SYSTEM ALERTS
            </span>
          </div>

          <div className="flex min-h-[230px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center">
            <BadgeAlert size={30} className="text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              No alerts to display
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Alerts will appear when financial records are available.
            </p>
          </div>
        </div>
      </section>

      {/* Project profitability */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">
            Active Infrastructure Project Profitability
          </h2>
          <ArrowUpRight size={18} className="text-slate-400" />
        </div>

        <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60">
          <p className="text-sm text-slate-400">
            Project profitability details will appear here.
          </p>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
