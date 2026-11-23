
import { useMemo, useState } from 'react'
import { FileText, Search, Download } from 'lucide-react'

const columns = [
  'GROUP ENTITIES',
  'REVENUE (CR)',
  'EXPENSES (CR)',
  'PAT (CR)',
  'ASSETS (CR)',
  'LIABILITIES (CR)',
]

const financialYears = [
  { value: 'current', label: 'Current Financial Year' },
  { value: 'previous', label: 'Previous Financial Year' },
]

function ConsolidatedGroupStatements() {
  const [activeEntity, setActiveEntity] = useState('all')
  const [financialYear, setFinancialYear] = useState('current')
  const [search, setSearch] = useState('')

  // Actual group entities and financial records will come from the backend.
  const [records] = useState([])
  const [entities] = useState([])

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return records.filter((record) => {
      const matchesSearch = !query || [
        record.entityName,
        record.revenue,
        record.expenses,
        record.pat,
      ].some((value) => String(value ?? '').toLowerCase().includes(query))

      const matchesEntity =
        activeEntity === 'all' || record.entityId === activeEntity

      return matchesSearch && matchesEntity
    })
  }, [records, search, activeEntity])

  const exportCSV = () => {
    const escapeCSV = (value) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const rows = [
      columns,
      ...filteredRecords.map((record) => [
        record.entityName,
        record.revenue,
        record.expenses,
        record.pat,
        record.assets,
        record.liabilities,
      ]),
    ]

    const csv = [
      ['Report', 'Consolidated Group Statements'],
      [
        'Financial Year',
        financialYears.find((item) => item.value === financialYear)?.label,
      ],
      [''],
      ...rows,
    ]
      .map((row) => row.map(escapeCSV).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'consolidated-group-statements.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      window.alert('Please allow pop-ups to print the report.')
      return
    }

    const escapeHTML = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

    const tableRows = filteredRecords.map((record) => `
      <tr>
        <td>${escapeHTML(record.entityName)}</td>
        <td>${escapeHTML(record.revenue)}</td>
        <td>${escapeHTML(record.expenses)}</td>
        <td>${escapeHTML(record.pat)}</td>
        <td>${escapeHTML(record.assets)}</td>
        <td>${escapeHTML(record.liabilities)}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Consolidated Group Statements</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #172033; }
            h1 { font-size: 22px; }
            p { color: #64748b; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f1f5f9; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Consolidated Group Statements</h1>
          <p>Financial Year: ${financialYears.find((item) => item.value === financialYear)?.label}</p>
          <p>Financial records will appear when connected to the backend.</p>
          <table>
            <thead>
              <tr>${columns.map((column) => `<th>${escapeHTML(column)}</th>`).join('')}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className="space-y-6">
      {/* Entity Selection */}
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveEntity('all')}
            className={`rounded-lg border px-5 py-3 text-sm font-semibold transition-colors ${
              activeEntity === 'all'
                ? 'border-[#2E2D55] bg-[#2E2D55] text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Entities (Consolidated)
          </button>

          <select
            value={activeEntity}
            onChange={(event) => setActiveEntity(event.target.value)}
            aria-label="Select group entity"
            className="h-11 min-w-48 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#205c7d]"
          >
            <option value="all">Select Group Entity</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>

        <select
          value={financialYear}
          onChange={(event) => setFinancialYear(event.target.value)}
          aria-label="Select financial year"
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#205c7d]"
        >
          {financialYears.map((year) => (
            <option key={year.value} value={year.value}>
              {year.label}
            </option>
          ))}
        </select>
      </section>

      {/* Search and Export */}
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search group statements..."
            aria-label="Search consolidated statements"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#205c7d] sm:w-72"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportPDF}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FileText size={16} />
            Export PDF
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>
      </section>

      {/* Consolidated Financial Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-xs font-bold text-slate-600">
                {columns.map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap px-5 py-4"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <div className="flex min-h-[255px] flex-col items-center justify-center px-5 text-center">
                      <FileText
                        size={38}
                        strokeWidth={1.8}
                        className="mb-4 text-slate-300"
                      />
                      <p className="text-sm font-semibold text-slate-500">
                        {search
                          ? 'No matching consolidated records'
                          : 'No consolidated financial records available'}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        {search
                          ? 'Try another search term.'
                          : 'Group entity statements will appear here when connected to the backend.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="border-t border-slate-100 text-slate-600"
                  >
                    <td className="px-5 py-4">{record.entityName}</td>
                    <td className="px-5 py-4">{record.revenue}</td>
                    <td className="px-5 py-4">{record.expenses}</td>
                    <td className="px-5 py-4">{record.pat}</td>
                    <td className="px-5 py-4">{record.assets}</td>
                    <td className="px-5 py-4">{record.liabilities}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Revenue Contribution */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-bold text-slate-800">
          Entity Revenue Contribution (Before Inter-Company Elimination)
        </h2>

        <div className="flex min-h-[54px] items-center justify-center rounded-lg bg-slate-50 px-4 text-center">
          <p className="text-sm text-slate-400">
            Revenue contribution chart will appear when group financial data
            is connected.
          </p>
        </div>
      </section>
    </div>
  )
}

export default ConsolidatedGroupStatements
