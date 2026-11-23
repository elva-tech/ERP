
import { useMemo, useState } from 'react'
import {
  FileText,
  Search,
  Download,
} from 'lucide-react'

const summaryCards = [
  {
    title: 'Opening Cash Balance',
    description: 'Opening balance for the financial period',
    color: 'border-l-[#205c7d]',
  },
  {
    title: 'Net Cash Flow YTD',
    description: 'Net additions to reserves',
    color: 'border-l-green-600',
  },
  {
    title: 'Closing Cash Balance',
    description: 'Matches bank reconciliation',
    color: 'border-l-red-600',
  },
]

const stages = [
  { label: 'Opening', color: 'bg-[#205c7d]' },
  { label: 'Operating', color: 'bg-green-600' },
  { label: 'Investing', color: 'bg-red-600' },
  { label: 'Financing', color: 'bg-red-600' },
  { label: 'Closing', color: 'bg-[#205c7d]' },
]

const cashFlowSections = [
  {
    title: 'A. Cash Flow from Operating Activities',
    items: [
      'Receipts from Clients / Customer Invoices',
      'Payments to Suppliers, Materials & Subcontractors',
      'Employee Salaries & Site Wages',
    ],
  },
  {
    title: 'B. Cash Flow from Investing Activities',
    items: [
      'Purchase of Fixed Assets (Machinery & Mixers)',
      'Proceeds from Sale of Old Capital Assets',
    ],
  },
  {
    title: 'C. Cash Flow from Financing Activities',
    items: [],
  },
]

const periods = [
  { value: 'ytd', label: 'Year-to-Date' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

function CashFlow() {
  const [period, setPeriod] = useState('ytd')
  const [basis, setBasis] = useState('indirect')
  const [search, setSearch] = useState('')

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return cashFlowSections

    return cashFlowSections
      .map((section) => {
        const titleMatches = section.title.toLowerCase().includes(query)

        return {
          ...section,
          items: titleMatches
            ? section.items
            : section.items.filter((item) =>
                item.toLowerCase().includes(query),
              ),
          visible: titleMatches ||
            section.items.some((item) => item.toLowerCase().includes(query)),
        }
      })
      .filter((section) => section.visible)
  }, [search])

  const exportCSV = () => {
    const escapeCSV = (value) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const rows = [
      ['Cash Flow Category / Source', 'Amount (Cr)'],
      ...filteredSections.flatMap((section) => [
        [section.title, ''],
        ...section.items.map((item) => [item, '']),
      ]),
    ]

    const csv = [
      ['Report', 'Cash Flow Statement'],
      ['Period', periods.find((item) => item.value === period)?.label],
      ['Basis', basis === 'indirect' ? 'Indirect Method' : 'Direct Method'],
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
    link.download = 'cash-flow-statement.csv'
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

    const tableRows = filteredSections
      .map((section) => `
        <tr class="section">
          <td>${escapeHTML(section.title)}</td>
          <td></td>
        </tr>
        ${section.items.map((item) => `
          <tr>
            <td>${escapeHTML(item)}</td>
            <td></td>
          </tr>
        `).join('')}
      `)
      .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cash Flow Statement</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #172033; }
            h1 { font-size: 22px; }
            p { color: #64748b; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f1f5f9; }
            .section { background: #f8fafc; font-weight: bold; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Cash Flow Statement</h1>
          <p>Period: ${periods.find((item) => item.value === period)?.label}</p>
          <p>Basis: ${basis === 'indirect' ? 'Indirect Method' : 'Direct Method'}</p>
          <p>Cash flow amounts will appear when connected to the backend.</p>
          <table>
            <thead>
              <tr>
                <th>Cash Flow Category / Source</th>
                <th>Amount (Cr)</th>
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
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
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

      {/* Filters, Search and Export */}
      <section className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Select cash flow period"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#205c7d]"
          >
            {periods.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={basis}
            onChange={(event) => setBasis(event.target.value)}
            aria-label="Select cash flow method"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#205c7d]"
          >
            <option value="indirect">Indirect Method</option>
            <option value="direct">Direct Method</option>
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
              placeholder="Search cash flow items..."
              aria-label="Search cash flow items"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#205c7d] sm:w-64"
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

      {/* Cash Flow Stage Chart */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-base font-bold text-slate-800">
          YTD Cash Flow Stage Dynamics (In Cr.)
        </h2>

        <div className="grid grid-cols-5 items-end gap-4">
          {stages.map((stage) => (
            <div
              key={stage.label}
              className="flex min-w-0 flex-col items-center"
            >
              <div className="flex h-36 w-full items-end justify-center">
                <div
                  className={`h-24 w-8 rounded-t ${stage.color} opacity-15`}
                />
              </div>

              <p className="mt-3 text-center text-xs text-slate-500">
                {stage.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Cash flow chart will appear when financial data is connected.
        </p>
      </section>

      {/* Cash Flow Details */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-5 py-3 text-left">
                  Cash Flow Category / Source
                </th>
                <th className="px-5 py-3 text-right">
                  Amount (Cr)
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredSections.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-5 py-12 text-center">
                    <FileText size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      No matching cash flow items
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Try another search term.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSections.map((section) => (
                  <>
                    <tr
                      key={section.title}
                      className="border-b border-slate-200 bg-slate-50 font-bold text-slate-800"
                    >
                      <td className="px-5 py-3">{section.title}</td>
                      <td className="px-5 py-3 text-right text-slate-400">—</td>
                    </tr>

                    {section.items.map((item) => (
                      <tr
                        key={item}
                        className="border-b border-slate-200 text-slate-700"
                      >
                        <td className="px-5 py-3 pl-11">{item}</td>
                        <td className="px-5 py-3 text-right text-slate-400">—</td>
                      </tr>
                    ))}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-5 text-sm text-slate-400">
          <FileText size={18} />
          Cash flow details will appear when connected to the backend.
        </div>
      </section>
    </div>
  )
}

export default CashFlow
