
import {
  BriefcaseBusiness,
  FileText,
  Receipt,
  Wallet,
} from 'lucide-react'

const projectMetrics = [
  { title: 'BOQ Value', color: 'border-l-[#205c7d]' },
  { title: 'Billed to Date', color: 'border-l-[#22ae65]' },
  { title: 'Cost Incurred', color: 'border-l-[#dc3030]' },
  { title: 'Work in Progress', color: 'border-l-[#e45b00]' },
  { title: 'Completion', color: 'border-l-[#205c7d]' },
  { title: 'Margin', color: 'border-l-[#22ae65]' },
]

const projectFields = [
  ['Project Code', ''],
  ['Client', ''],
  ['Location', ''],
  ['Start Date', ''],
  ['Expected Completion', ''],
  ['Project Manager', ''],
  ['Contract Type', ''],
  ['Billing Type', ''],
]

const costColumns = ['Category', 'Budget', 'Actual', 'Variance', '% Used']
const transactionColumns = ['Date', 'Transaction', 'Type', 'Amount', 'Status']

function EmptyRows({ columns, message, icon: Icon }) {
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

function ProjectAccounting() {
  return (
    <div className="space-y-3">
      {/* Project heading */}
      <section>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-sky-800">
          <span>Project Accounting</span>
          <span className="text-slate-400">&gt;</span>
          <span className="text-slate-500">Project Details</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-800">
            Project Overview
          </h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            Status unavailable
          </span>
        </div>
      </section>

      {/* Project KPI cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {projectMetrics.map((metric) => (
          <div
            key={metric.title}
            className={`min-h-[82px] rounded-lg border border-slate-200 border-l-4 ${metric.color} bg-white p-3 shadow-sm`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {metric.title}
            </p>
            <div className="mt-3 h-6 w-24 rounded bg-slate-100" />
          </div>
        ))}
      </section>

      {/* Project information */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          Project Information
        </h3>

        <div className="grid grid-cols-1 gap-x-10 gap-y-3 md:grid-cols-2">
          {projectFields.map(([label]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <div className="mt-1 h-4 w-3/4 rounded bg-slate-50" />
            </div>
          ))}
        </div>
      </section>

      {/* Cost breakdown */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">
            Cost Breakdown
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="bg-slate-100 text-[10px] font-semibold uppercase text-slate-600">
              <tr>
                {costColumns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-2.5"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <EmptyRows
                columns={costColumns}
                message="No cost breakdown available"
                icon={Wallet}
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent transactions */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">
            Recent Transactions
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-100 text-[10px] font-semibold uppercase text-slate-600">
              <tr>
                {transactionColumns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <EmptyRows
                columns={transactionColumns}
                message="No recent transactions available"
                icon={FileText}
              />
            </tbody>
          </table>
        </div>
      </section>

      <div className="hidden">
        <BriefcaseBusiness />
        <Receipt />
      </div>
    </div>
  )
}

export default ProjectAccounting
