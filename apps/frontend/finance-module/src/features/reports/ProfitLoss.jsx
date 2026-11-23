
import { useMemo, useState } from 'react'
import {
  FileText,
  FileSpreadsheet,
  Search,
} from 'lucide-react'

const summaryCards = [
  {
    title: 'Total Revenue',
    description: 'Revenue from operations',
    color: 'border-l-[#205c7d]',
  },
  {
    title: 'Total Expenses',
    description: 'Operating expenses',
    color: 'border-l-orange-600',
  },
  {
    title: 'EBITDA',
    description: 'Operating profit',
    color: 'border-l-green-600',
  },
  {
    title: 'Net Profit (PAT)',
    description: 'Profit after tax',
    color: 'border-l-red-600',
  },
]

const profitLossRows = [
  { label: 'Revenue from Operations', type: 'heading' },
  { label: 'Cost of Materials & Construction', indent: true },
  { label: 'Employee Benefits Expense', indent: true },
  { label: 'Subcontractor & Site Charges', indent: true },
  { label: 'Other Operating & Site Expenses', indent: true },
  { label: 'Total Operating Expenses', type: 'total' },
  { label: 'EBITDA (Operating Profit)', type: 'highlight' },
  { label: 'Depreciation & Amortization', indent: true },
  { label: 'Finance Costs / Borrowing Interest', indent: true },
  { label: 'Profit Before Tax (PBT)', type: 'total' },
  { label: 'Tax Expenses (Current & Deferred)', indent: true },
  { label: 'Profit After Tax (PAT)', type: 'final' },
]

const periodLabels = {
  current: 'Current Period',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

const basisLabels = {
  accrual: 'Accrual Basis',
  cash: 'Cash Basis',
}

function ProfitLoss() {
  const [period, setPeriod] = useState('current')
  const [basis, setBasis] = useState('accrual')
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return profitLossRows

    return profitLossRows.filter((row) =>
      row.label.toLowerCase().includes(query),
    )
  }, [search])

  const exportCSV = () => {
    const headers = ['Particulars', 'YTD', 'PY', 'Variance (YoY)']

    const rows = [
      headers,
      ...filteredRows.map((row) => [row.label, '', '', '']),
    ]

    const escapeCSV = (value) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const csv = [
      `Report,Profit & Loss Statement`,
      `Period,${periodLabels[period]}`,
      `Accounting Basis,${basisLabels[basis]}`,
      '',
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'profit-loss-statement.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const reportRows = filteredRows
      .map(
        (row) => `
          <tr>
            <td style="padding:10px;border:1px solid #ddd;">
              ${row.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </td>
            <td style="padding:10px;border:1px solid #ddd;"></td>
            <td style="padding:10px;border:1px solid #ddd;"></td>
            <td style="padding:10px;border:1px solid #ddd;"></td>
          </tr>
        `,
      )
      .join('')

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      window.alert('Please allow pop-ups to print the report.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Profit & Loss Statement</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 28px;
              color: #172033;
            }
            h1 { font-size: 22px; }
            p { color: #555; font-size: 13px; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
              font-size: 12px;
            }
            th {
              background: #f1f5f9;
              text-align: left;
              padding: 10px;
              border: 1px solid #ddd;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Profit &amp; Loss Statement</h1>
          <p>Period: ${periodLabels[period]}</p>
          <p>Accounting Basis: ${basisLabels[basis]}</p>
          <p>Financial values will appear when connected to the backend.</p>
          <table>
            <thead>
              <tr>
                <th>Particulars</th>
                <th>YTD</th>
                <th>PY</th>
                <th>Variance (YoY)</th>
              </tr>
            </thead>
            <tbody>${reportRows}</tbody>
          </table>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div className="space-y-5">
      {/* Filters, Search and Export Actions */}
      <section className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Select reporting period"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#205c7d]"
          >
            <option value="current">Select Period</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>

          <select
            value={basis}
            onChange={(event) => setBasis(event.target.value)}
            aria-label="Select accounting basis"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#205c7d]"
          >
            <option value="accrual">Accrual Basis</option>
            <option value="cash">Cash Basis</option>
          </select>

          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search statement..."
              aria-label="Search profit and loss statement"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#205c7d] sm:w-60"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportPDF}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FileText size={16} />
            Export PDF
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className={`min-h-[124px] rounded-xl border border-slate-200 border-l-4 ${card.color} bg-white p-5 shadow-sm`}
          >
            <p className="text-xs font-semibold uppercase text-slate-600">
              {card.title}
            </p>

            <p className="mt-3 text-2xl font-bold text-slate-400">—</p>

            <p className="mt-2 text-xs text-slate-400">
              {card.description}
            </p>
          </div>
        ))}
      </section>

      {/* Profit and Loss Statement */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-slate-800">
            Profit & Loss Statement
          </h2>
          <p className="text-xs text-slate-400">
            {periodLabels[period]} · {basisLabels[basis]}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-5 py-3 text-left">Particulars</th>
                <th className="px-5 py-3 text-right">YTD</th>
                <th className="px-5 py-3 text-right">PY</th>
                <th className="px-5 py-3 text-right">Variance (YoY)</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <FileText
                      size={32}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      No matching statement items
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Try another search term.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const rowStyle =
                    row.type === 'heading' || row.type === 'total'
                      ? 'bg-slate-50 font-bold text-slate-800'
                      : row.type === 'highlight'
                        ? 'bg-sky-50 font-bold text-[#205c7d]'
                        : row.type === 'final'
                          ? 'bg-emerald-50 font-bold text-green-600'
                          : 'text-slate-600'

                  return (
                    <tr
                      key={row.label}
                      className={`border-b border-slate-200 ${rowStyle}`}
                    >
                      <td
                        className={`px-5 py-3 ${row.indent ? 'pl-10' : ''}`}
                      >
                        {row.label}
                      </td>

                      <td className="px-5 py-3 text-right text-slate-400">
                        —
                      </td>
                      <td className="px-5 py-3 text-right text-slate-400">
                        —
                      </td>
                      <td className="px-5 py-3 text-right text-slate-400">
                        —
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default ProfitLoss
