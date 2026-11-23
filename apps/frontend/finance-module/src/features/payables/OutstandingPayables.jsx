
import { FileText, CalendarDays } from 'lucide-react'

const summaryCards = [
  { title: 'Total Payables', color: 'border-l-[#205c7d]' },
  { title: 'Current Payables', color: 'border-l-[#22ae65]' },
  { title: 'Overdue Payables', color: 'border-l-[#e45b00]' },
]

function OutstandingPayables() {
  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className={`min-h-[170px] rounded-lg border border-slate-200 border-l-4 ${card.color} bg-white p-5 shadow-sm`}
          >
            <p className="text-[11px] font-semibold uppercase text-slate-400">
              {card.title}
            </p>
            <div className="mt-4 h-9 w-32 rounded bg-slate-100" />
            <div className="mt-3 h-3 w-48 max-w-full rounded bg-slate-50" />
          </div>
        ))}
      </section>

      {/* Supplier accounts and payment schedule */}
      <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.45fr_1fr]">
        {/* Supplier accounts */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-slate-800">
            Supplier Accounts Outstanding
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-100 text-[11px] uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-3">Vendor / Supplier</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Overdue</th>
                  <th className="px-3 py-3">Payable Amount</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td colSpan={4} className="px-4 py-20 text-center">
                    <FileText
                      size={32}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      No supplier payables available
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Supplier records will appear here when connected to the backend.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Expected payment schedule */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-slate-800">
            Expected Payment Schedule
          </h2>

          <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
            <CalendarDays
              size={32}
              className="text-slate-300"
            />
            <p className="mt-3 text-sm font-medium text-slate-500">
              No scheduled payments available
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Upcoming supplier payments will appear here when connected to the backend.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default OutstandingPayables
