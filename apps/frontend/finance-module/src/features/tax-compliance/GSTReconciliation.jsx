
import { useMemo, useState } from 'react'
import { FileText, Search, Download, AlertCircle } from 'lucide-react'

const summaryCards = [
  {
    title: 'Fully Matched Invoices',
    description: 'Matched invoice value',
    color: 'border-l-[#205c7d]',
  },
  {
    title: 'Partially Matched / Mismatched',
    description: 'Needs ledger audit adjustments',
    color: 'border-l-orange-600',
  },
  {
    title: 'Missing in GSTR-2B Portal',
    description: 'Vendor has not uploaded invoice',
    color: 'border-l-red-600',
  },
  {
    title: 'Missing in Local Books',
    description: 'Local purchase voucher un-entered',
    color: 'border-l-[#205c7d]',
  },
]

const columns = [
  'Vendor GSTIN',
  'Vendor Company Name',
  'Amount GSTR-2B',
  'Amount in Books',
  'Difference',
  'Status',
]

function GSTReconciliation() {
  const [statusFilter, setStatusFilter] = useState('discrepancies')
  const [threshold, setThreshold] = useState('50000')
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')

  // Actual reconciliation records will come from the backend.
  const [records] = useState([])

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()
    const minimumDifference = Number(threshold)

    return records.filter((record) => {
      const matchesSearch = !query || [
        record.vendorGSTIN,
        record.vendorName,
        record.status,
      ].some((value) => String(value ?? '').toLowerCase().includes(query))

      const status = String(record.status ?? '').toLowerCase()
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'matched' && status === 'matched') ||
        (statusFilter === 'mismatched' &&
          ['mismatched', 'partially matched', 'partial'].includes(status)) ||
        (statusFilter === 'discrepancies' && status !== 'matched')

      const difference = Math.abs(Number(record.difference ?? 0))
      const matchesThreshold =
        statusFilter === 'matched' || difference > minimumDifference

      return matchesSearch && matchesStatus && matchesThreshold
    })
  }, [records, search, statusFilter, threshold])

  const exportCSV = () => {
    const escapeCSV = (value) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const rows = [
      columns,
      ...filteredRecords.map((record) => [
        record.vendorGSTIN,
        record.vendorName,
        record.amountGSTR2B,
        record.amountInBooks,
        record.difference,
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
    link.download = 'gst-reconciliation-report.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const triggerEscalation = () => {
    if (filteredRecords.length === 0) {
      setNotice('No vendor discrepancies are available for escalation.')
      return
    }

    setNotice(
      'Vendor escalation requires the backend workflow. No escalation has been sent.',
    )
  }

  return (
    <div className="space-y-7">
      {/* Summary Cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className={`min-h-[130px] rounded-xl border border-slate-200 border-l-4 ${card.color} bg-white p-5 shadow-sm`}
          >
            <p className="text-xs font-semibold uppercase text-slate-400">
              {card.title}
            </p>

            <p className="mt-3 text-2xl font-bold text-slate-400">—</p>

            <p className="mt-2 text-xs text-slate-400">
              {card.description}
            </p>
          </div>
        ))}
      </section>

      {/* Filters and Actions */}
      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setNotice('')
              }}
              aria-label="Filter reconciliation status"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="discrepancies">
                Status filter: Discrepancies Only
              </option>
              <option value="all">All Statuses</option>
              <option value="matched">Fully Matched</option>
              <option value="mismatched">
                Partially Matched / Mismatched
              </option>
            </select>

            <select
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              aria-label="Filter by variance threshold"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="50000">
                Threshold variance greater than ₹50,000
              </option>
              <option value="10000">
                Threshold variance greater than ₹10,000
              </option>
              <option value="100000">
                Threshold variance greater than ₹1,00,000
              </option>
            </select>

            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setNotice('')
                }}
                placeholder="Search vendor GSTIN or name..."
                aria-label="Search vendors"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 sm:w-64"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={exportCSV}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Download size={16} />
              Export CSV
            </button>

            <button
              type="button"
              onClick={triggerEscalation}
              className="rounded-lg bg-[#2E2D55] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#242344]"
            >
              Trigger Vendor Escalation
            </button>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            {notice}
          </div>
        )}
      </section>

      {/* Vendor Reconciliation Register */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">
          Vendor-wise Reconciliation Register
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
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
                  <td colSpan={columns.length} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <FileText size={34} className="text-slate-300" />

                      <p className="mt-3 text-sm font-semibold text-slate-500">
                        {search
                          ? 'No matching reconciliation records'
                          : 'No reconciliation records available'}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {search
                          ? 'Try another vendor name, GSTIN or status.'
                          : 'Vendor reconciliation details will appear here when connected to the backend.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr
                    key={record.id ?? index}
                    className="border-t border-slate-100"
                  >
                    <td className="px-3 py-3">{record.vendorGSTIN}</td>
                    <td className="px-3 py-3">{record.vendorName}</td>
                    <td className="px-3 py-3">{record.amountGSTR2B}</td>
                    <td className="px-3 py-3">{record.amountInBooks}</td>
                    <td className="px-3 py-3">{record.difference}</td>
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

export default GSTReconciliation
