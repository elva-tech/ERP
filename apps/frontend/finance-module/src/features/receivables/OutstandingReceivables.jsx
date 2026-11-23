
import {
  ArrowDownToLine,
  ChartColumn,
  FileText,
} from 'lucide-react'

const summaryCards = [
  { title: 'Total Receivables', color: 'border-l-[#205c7d]' },
  { title: 'Current (Non-Delayed)', color: 'border-l-[#22ae65]' },
  { title: 'Overdue Receivables', color: 'border-l-[#e45b00]' },
  { title: 'Collected This Month', color: 'border-l-[#dc3030]' },
]

const agingColumns = [
  'Customer Name',
  'Current',
  '1–30 Days',
  '30+ Days',
  'Total Outstanding',
]

const emptyTrend = ['July', 'August', 'September', 'October']

function OutstandingReceivables() {
  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className={`min-h-[145px] rounded-lg border border-slate-200 border-l-4 ${card.color} bg-white p-5 shadow-sm`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {card.title}
            </p>
            <div className="mt-4 h-9 w-32 rounded bg-slate-100" />
            <div className="mt-3 h-3 w-40 rounded bg-slate-50" />
          </div>
        ))}
      </section>

      {/* Main dashboard columns */}
      <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.45fr_1fr]">
        {/* Customer-wise aging */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">
            Customer-wise Aging &amp; Outstandings
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-100 text-[11px] uppercase text-slate-600">
                <tr>
                  {agingColumns.map((column) => (
                    <th key={column} className="px-3 py-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td colSpan={agingColumns.length} className="px-4 py-16 text-center">
                    <FileText
                      size={30}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      No receivables available
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Customer aging records will appear here when connected to the backend.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right-side charts */}
        <div className="space-y-5">
          {/* Collection trend */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              Collection Trend - Past 4 Months
            </h2>

            <div className="flex min-h-[205px] flex-col items-center justify-center rounded-md">
              <ChartColumn
                size={32}
                className="text-slate-300"
              />
              <p className="mt-3 text-sm font-medium text-slate-500">
                No collection trend available
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Chart will appear when collection data is connected.
              </p>
            </div>

            <div className="flex justify-around border-t border-slate-100 pt-3">
              {emptyTrend.map((month) => (
                <span
                  key={month}
                  className="text-[11px] text-slate-400"
                >
                  {month}
                </span>
              ))}
            </div>
          </section>

          {/* Major contribution */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-800">
              Major Contribution of Receivables
            </h2>

            <div className="flex min-h-[110px] flex-col items-center justify-center text-center">
              <ArrowDownToLine
                size={28}
                className="text-slate-300"
              />
              <p className="mt-2 text-sm font-medium text-slate-500">
                No contribution data available
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Contribution details will appear when receivables are connected.
              </p>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

export default OutstandingReceivables
