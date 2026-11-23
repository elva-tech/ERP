
import { ChartNoAxesCombined, FileText } from 'lucide-react'

const metrics = [
  { title: 'Revenue', color: 'border-l-[#205c7d]' },
  { title: 'Cost', color: 'border-l-[#dc3030]' },
  { title: 'Profit', color: 'border-l-[#22ae65]' },
  { title: 'Project Margin', color: 'border-l-[#22ae65]' },
  { title: 'PAT Margin', color: 'border-l-[#205c7d]' },
  { title: 'Cost Ratio', color: 'border-l-[#e45b00]' },
]

const profitabilityColumns = [
  'Cost Head',
  'Amount',
  '% of Revenue',
  'Budget %',
  'Variance Status',
]

const trendColumns = [
  'Quarter',
  'Revenue',
  'Cost',
  'Margin %',
]

function EmptyTable({ columns, message, icon: Icon = FileText }) {
  return (
    <tr>
      <td colSpan={columns.length} className="px-4 py-12 text-center">
        <Icon size={30} className="mx-auto text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-500">
          {message}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Records will appear here when connected to the backend.
        </p>
      </td>
    </tr>
  )
}

function ProjectProfitability() {
  return (
    <div className="space-y-3">
      {/* Project breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-sky-700">
          Project Profitability
        </span>
        <span className="text-slate-400">&gt;</span>
        <span className="text-slate-500">
          Project Details
        </span>
      </div>

      {/* Project heading */}
      <section className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Project Profitability Overview
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Selected project details
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          Status unavailable
        </span>
      </section>

      {/* Six profitability KPI cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className={`min-h-[78px] rounded-lg border border-slate-200 border-l-4 ${metric.color} bg-white p-3 shadow-sm`}
          >
            <p className="text-[11px] font-semibold text-slate-400">
              {metric.title}
            </p>

            <div className="mt-2 h-7 w-28 rounded bg-slate-100" />
          </div>
        ))}
      </section>

      {/* Profitability breakdown */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">
            Profitability Breakdown
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-100 text-[10px] font-semibold uppercase text-slate-600">
              <tr>
                {profitabilityColumns.map((column) => (
                  <th key={column} className="px-4 py-3">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <EmptyTable
                columns={profitabilityColumns}
                message="No profitability breakdown available"
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* Margin trend */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">
            Margin Trend
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-100 text-[10px] font-semibold uppercase text-slate-600">
              <tr>
                {trendColumns.map((column) => (
                  <th key={column} className="px-4 py-3">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <EmptyTable
                columns={trendColumns}
                message="No margin trend data available"
                icon={ChartNoAxesCombined}
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* Project observations */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800">
          Project Observations
        </h3>

        <div className="flex min-h-[100px] flex-col items-center justify-center text-center">
          <FileText size={28} className="text-slate-300" />

          <p className="mt-2 text-sm font-medium text-slate-500">
            No project observations available
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Project insights will appear here when financial data is connected.
          </p>
        </div>
      </section>
    </div>
  )
}

export default ProjectProfitability
