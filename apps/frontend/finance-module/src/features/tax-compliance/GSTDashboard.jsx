
import { useMemo, useState } from 'react'
import {
  CalendarDays,
  FileText,
  AlertCircle,
  Search,
  Download,
} from 'lucide-react'

const gstColumns = [
  'GSTIN ID',
  'State',
  'Available ITC',
  'Output Tax',
  'Net Due',
  'Status',
]

const filingTypes = [
  { title: 'GSTR-1', description: 'Outward Supplies Sales' },
  { title: 'GSTR-3B', description: 'Monthly Summary Payment' },
  { title: 'GSTR-9', description: 'Annual Return' },
]

const periods = [
  { value: 'current', label: 'Current Period' },
  { value: 'previous', label: 'Previous Period' },
  { value: 'yearly', label: 'Financial Year' },
]

function EmptyState({ message, description }) {
  return (
    <div className="flex min-h-[130px] flex-col items-center justify-center text-center">
      <FileText size={32} className="text-slate-300" />
      <p className="mt-3 text-sm font-semibold text-slate-500">
        {message}
      </p>
      <p className="mt-1 text-sm text-slate-400">
        {description}
      </p>
    </div>
  )
}

function GSTDashboard() {
  const [search, setSearch] = useState('')
  const [filingFilter, setFilingFilter] = useState('all')
  const [period, setPeriod] = useState('current')

  // Real GST records will be loaded from the backend later.
  const [gstRecords] = useState([])

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return gstRecords.filter((record) => {
      const matchesSearch = !query || [
        record.gstin,
        record.state,
        record.status,
      ].some((value) => String(value ?? '').toLowerCase().includes(query))

      const matchesFiling =
        filingFilter === 'all' || record.filingType === filingFilter

      return matchesSearch && matchesFiling
    })
  }, [gstRecords, search, filingFilter])

  const exportCSV = () => {
    const escapeCSV = (value) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const rows = [
      gstColumns,
      ...filteredRecords.map((record) => [
        record.gstin,
        record.state,
        record.availableITC,
        record.outputTax,
        record.netDue,
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
    link.download = 'gst-dashboard-report.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const summaryCards = [
    {
      title: 'ITC Available (GSTR-2B)',
      description: 'Claimable Input Tax Credit',
      color: 'border-l-emerald-500',
    },
    {
      title: 'Total Output Tax Liability',
      description: 'Calculated on Outward Supplies',
      color: 'border-l-red-600',
    },
    {
      title: 'Net Cash Liability',
      description: 'To be paid via Ledger Cash',
      color: 'border-l-orange-600',
    },
    {
      title: 'Filing Status GSTR-1',
      description: 'Filing progress will appear here',
      color: 'border-l-[#205c7d]',
    },
  ]

  const visibleFilings = filingTypes.filter(
    (filing) => filingFilter === 'all' || filing.title === filingFilter,
  )

  return (
    <div className="space-y-7">
      {/* GST Summary Cards */}
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
              {card.description}
            </p>
          </div>
        ))}
      </section>

      {/* GST Register Filters */}
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
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
              placeholder="Search GSTIN, state or status..."
              aria-label="Search GST records"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#205c7d] sm:w-72"
            />
          </div>

          <select
            value={filingFilter}
            onChange={(event) => setFilingFilter(event.target.value)}
            aria-label="Filter by filing type"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#205c7d]"
          >
            <option value="all">All Filing Types</option>
            {filingTypes.map((filing) => (
              <option key={filing.title} value={filing.title}>
                {filing.title}
              </option>
            ))}
          </select>

          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Select GST reporting period"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#205c7d]"
          >
            {periods.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <Download size={16} />
          Export CSV
        </button>
      </section>

      {/* GSTIN Register and Filing Schedule */}
      <section className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[1.8fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">
            GSTIN-wise Outward &amp; Inward Register
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  {gstColumns.map((column) => (
                    <th key={column} className="px-3 py-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={gstColumns.length} className="px-4 py-10">
                      <EmptyState
                        message={
                          search
                            ? 'No matching GST records'
                            : 'No GST records available'
                        }
                        description={
                          search
                            ? 'Try a different search term.'
                            : 'GSTIN-wise tax records will appear here when connected to the backend.'
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
                      <td className="px-3 py-3">{record.gstin}</td>
                      <td className="px-3 py-3">{record.state}</td>
                      <td className="px-3 py-3">{record.availableITC}</td>
                      <td className="px-3 py-3">{record.outputTax}</td>
                      <td className="px-3 py-3">{record.netDue}</td>
                      <td className="px-3 py-3">{record.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Filing Schedule */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">
            Filing Schedule Calendar
          </h2>

          <div className="space-y-3">
            {visibleFilings.map((filing) => (
              <div
                key={filing.title}
                className="rounded-lg bg-slate-100 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-800">
                    {filing.title}
                  </h3>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500">
                    Status unavailable
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  {filing.description}
                </p>

                <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <CalendarDays size={14} />
                  Due date will appear when connected to the backend.
                </p>
              </div>
            ))}

            {visibleFilings.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                No filing types found.
              </p>
            )}
          </div>
        </section>
      </section>

      {/* Compliance Guidelines and Pending Actions */}
      <section className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-800">
            Compliance Guidelines
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            GST compliance guidelines will appear here when the
            applicable company and tax configuration is connected
            to the backend.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">
            Pending Actions
          </h2>

          <div className="flex min-h-[100px] flex-col items-center justify-center text-center">
            <AlertCircle size={28} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              No pending actions available
            </p>
            <p className="mt-1 text-xs text-slate-400">
              GST compliance actions will appear here when connected to the backend.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default GSTDashboard
