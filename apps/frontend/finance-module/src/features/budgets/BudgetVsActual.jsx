
import { useMemo, useState } from 'react'
import { BarChart3, Download, FileText, Search } from 'lucide-react'

const columns = [
  'Category Description',
  'Budget Target',
  'Actual Cost',
  'Variance ₹',
  'Variance %',
  'Status',
]

const periods = [
  { value: 'ytd', label: 'Year-to-Date (YTD)' },
  { value: 'quarter', label: 'Current Quarter' },
  { value: 'month', label: 'Current Month' },
]

function EmptyState({ message, description }) {
  return (
    <div className="flex min-h-[170px] flex-col items-center justify-center text-center">
      <FileText size={34} className="text-slate-300" />
      <p className="mt-3 text-sm font-semibold text-slate-500">
        {message}
      </p>
      <p className="mt-1 text-sm text-slate-400">
        {description}
      </p>
    </div>
  )
}

function BudgetVsActual() {
  const [period, setPeriod] = useState('ytd')
  const [project, setProject] = useState('all')
  const [search, setSearch] = useState('')

  // Real records will be supplied by the backend later.
  const [records] = useState([])

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return records.filter((record) => {
      const matchesSearch = !query || [
        record.category,
        record.project,
        record.status,
      ].some((value) => String(value ?? '').toLowerCase().includes(query))

      const matchesProject =
        project === 'all' || record.projectId === project

      return matchesSearch && matchesProject
    })
  }, [records, search, project])

  const exportCSV = () => {
    const escapeCSV = (value) => {
      const text = String(value ?? '')
      return `"${text.replace(/"/g, '""')}"`
    }

    const rows = [
      columns,
      ...filteredRecords.map((record) => [
        record.category,
        record.budgetTarget,
        record.actualCost,
        record.variance,
        record.variancePercent,
        record.status,
      ]),
    ]

    const csv = rows.map((row) => row.map(escapeCSV).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'budget-vs-actual.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const summaryCards = [
    {
      title: 'Total Budget Approved',
      color: 'border-l-[#205c7d]',
      note: 'Budget approval information will appear here.',
    },
    {
      title: 'Actual Spent YTD',
      color: 'border-l-orange-600',
      note: 'Actual expenditure will appear here.',
    },
    {
      title: 'Remaining Capital',
      color: 'border-l-emerald-500',
      note: 'Remaining capital will appear here.',
    },
    {
      title: 'Overall Utilization',
      color: 'border-l-red-600',
      note: 'Budget utilization will appear here.',
    },
  ]

  return (
    <div className="space-y-7">
      {/* Summary Cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className={`min-h-[178px] rounded-xl border border-slate-200 border-l-4 ${card.color} bg-white p-5 shadow-sm`}
          >
            <p className="text-xs font-semibold uppercase text-slate-400">
              {card.title}
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-400">—</p>
            <p className="mt-3 text-xs text-slate-400">
              {card.note}
            </p>
          </div>
        ))}
      </section>

      {/* Filters, Search and Export */}
      <section className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex flex-wrap gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Select reporting period"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 outline-none focus:border-[#205c7d]"
          >
            {periods.map((item) => (
              <option key={item.value} value={item.value}>
                Period: {item.label}
              </option>
            ))}
          </select>

          <select
            value={project}
            onChange={(event) => setProject(event.target.value)}
            aria-label="Filter by project"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 outline-none focus:border-[#205c7d]"
          >
            <option value="all">Project: All Projects</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search variance records..."
              aria-label="Search variance records"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#205c7d] sm:w-64"
            />
          </div>

          <button
            type="button"
            onClick={exportCSV}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Download size={16} />
            Export CSV Report
          </button>
        </div>
      </section>

      {/* Chart and Directives */}
      <section className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-800">
            Grouped Expenditure Comparison (In Cr.)
          </h2>

          <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
            <BarChart3 size={38} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              No budget comparison data available
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Budget and actual expenditure charts will appear here when
              connected to the backend.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="h-3 w-3 rounded-sm bg-[#205c7d]" />
              Target Budget
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="h-3 w-3 rounded-sm bg-orange-600" />
              Actual Spent
            </div>
          </div>
        </div>

        {/* Budget Directives */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">
            Budget Directives
          </h2>

          <EmptyState
            message="No budget directives available"
            description="Budget instructions will appear here when connected to the backend."
          />
        </div>
      </section>

      {/* Detailed Variance Register */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">
          Detailed Variance Register
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-3 py-3">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10">
                    <EmptyState
                      message={
                        search
                          ? 'No matching budget variance records'
                          : 'No budget variance records available'
                      }
                      description={
                        search
                          ? 'Try a different search term.'
                          : 'Detailed budget and actual cost records will appear here when connected to the backend.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr
                    key={record.id ?? index}
                    className="border-t border-slate-100"
                  >
                    <td className="px-3 py-3">{record.category}</td>
                    <td className="px-3 py-3">{record.budgetTarget}</td>
                    <td className="px-3 py-3">{record.actualCost}</td>
                    <td className="px-3 py-3">{record.variance}</td>
                    <td className="px-3 py-3">{record.variancePercent}</td>
                    <td className="px-3 py-3">{record.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default BudgetVsActual
