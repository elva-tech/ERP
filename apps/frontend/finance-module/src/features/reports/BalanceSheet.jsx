
import { useMemo, useState } from 'react'
import { Search, Download, FileText } from 'lucide-react'

const summaryCards = [
  {
    title: 'Total Assets',
    description: 'Assets and resources',
    color: 'border-l-[#205c7d]',
  },
  {
    title: 'Total Liabilities',
    description: 'Borrowings & Trade Payables',
    color: 'border-l-red-600',
  },
  {
    title: 'Shareholders Equity',
    description: 'Paid up Capital & Reserves',
    color: 'border-l-[#205c7d]',
  },
  {
    title: 'Current Ratio',
    description: 'Liquid assets cover current debt',
    color: 'border-l-[#205c7d]',
  },
]

const assetRows = [
  'Property, Plant & Equipment (PPE)',
  'Trade Receivables (Contractors/Govt)',
  'Cash & Bank Balances',
  'Other Current Assets / Inventory',
]

const liabilityRows = [
  'Share Capital',
  'Reserves & Surplus',
  'Long-term Borrowings / Loans',
  'Trade Payables (Subcontractors)',
  'Other Liabilities & Provisions',
]

const allRows = [
  ...assetRows.map((label) => ({ label, section: 'Assets' })),
  ...liabilityRows.map((label) => ({
    label,
    section: 'Equity & Liabilities',
  })),
]

const financialYears = [
  { value: 'current', label: 'Current Financial Year' },
  { value: 'previous', label: 'Previous Financial Year' },
]

function BalanceTable({ title, rows, totalLabel, year }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">{title}</th>
              <th className="px-4 py-3 text-right">
                {year === 'current' ? 'Current Yr (Cr)' : 'Previous Yr (Cr)'}
              </th>
              <th className="px-4 py-3 text-right">
                {year === 'current' ? 'Previous Yr (Cr)' : 'Current Yr (Cr)'}
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  No matching items found.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row} className="border-b border-slate-200">
                  <td
                    className={`px-4 py-3 text-slate-600 ${
                      index === 0 ? 'font-semibold text-slate-800' : ''
                    }`}
                  >
                    {row}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">—</td>
                  <td className="px-4 py-3 text-right text-slate-400">—</td>
                </tr>
              ))
            )}

            <tr className="bg-slate-100 font-bold text-slate-800">
              <td className="px-4 py-4">{totalLabel}</td>
              <td className="px-4 py-4 text-right text-slate-400">—</td>
              <td className="px-4 py-4 text-right text-slate-400">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function BalanceSheet() {
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('current')

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return allRows.filter((row) =>
      row.label.toLowerCase().includes(query),
    )
  }, [search])

  const filteredAssets = filteredRows
    .filter((row) => row.section === 'Assets')
    .map((row) => row.label)

  const filteredLiabilities = filteredRows
    .filter((row) => row.section === 'Equity & Liabilities')
    .map((row) => row.label)

  const exportCSV = () => {
    const escapeCSV = (value) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const rows = [
      ['Section', 'Particulars', 'Current Year (Cr)', 'Previous Year (Cr)'],
      ...filteredRows.map((row) => [
        row.section,
        row.label,
        '',
        '',
      ]),
    ]

    const csv = [
      ['Balance Sheet', ''],
      ['Financial Year', year === 'current' ? 'Current Financial Year' : 'Previous Financial Year'],
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
    link.download = 'balance-sheet.csv'
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
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

    const tableRows = filteredRows.map((row) => `
      <tr>
        <td>${escapeHTML(row.section)}</td>
        <td>${escapeHTML(row.label)}</td>
        <td></td>
        <td></td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Balance Sheet</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #172033; }
            h1 { font-size: 22px; }
            p { color: #64748b; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f1f5f9; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Balance Sheet</h1>
          <p>${year === 'current' ? 'Current Financial Year' : 'Previous Financial Year'}</p>
          <p>Financial balances will appear when connected to the backend.</p>
          <table>
            <thead>
              <tr>
                <th>Section</th>
                <th>Particulars</th>
                <th>Current Year (Cr)</th>
                <th>Previous Year (Cr)</th>
              </tr>
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
      {/* Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className={`min-h-[128px] rounded-xl border border-slate-200 border-l-4 ${card.color} bg-white p-5 shadow-sm`}
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

      {/* Search, Financial Year and Export */}
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            aria-label="Select financial year"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#205c7d]"
          >
            {financialYears.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
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
              placeholder="Search balance sheet items..."
              aria-label="Search balance sheet items"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#205c7d] sm:w-72"
            />
          </div>
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

      {/* Assets and Equity / Liabilities */}
      <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <BalanceTable
          title="Assets Side"
          rows={filteredAssets}
          totalLabel="TOTAL ASSETS"
          year={year}
        />

        <BalanceTable
          title="Equity & Liabilities"
          rows={filteredLiabilities}
          totalLabel="TOTAL EQUITY & LIABILITIES"
          year={year}
        />
      </section>
    </div>
  )
}

export default BalanceSheet
