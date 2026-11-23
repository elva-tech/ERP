
import {
  FileText,
  AlertTriangle,
} from 'lucide-react'

const summaryCards = [
  {
    title: 'Total BG Exposure',
    color: 'border-l-[#205c7d]',
  },
  {
    title: 'Active Guarantees',
    color: 'border-l-[#22ae65]',
  },
  {
    title: 'Expiring (90 Days)',
    color: 'border-l-[#e45b00]',
  },
  {
    title: 'BGs Released YTD',
    color: 'border-l-[#dc3030]',
  },
]
const columns = [
  'BG Number',
  'Issuing Bank',
  'Beneficiary',
  'Project',
  'Amount',
  'Issue Date',
  'Expiry Date',
  'Status',
]

function BankGuaranteesRegister() {
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

            <div className="mt-4 h-9 w-36 rounded bg-slate-100" />

            <div className="mt-3 h-3 w-44 rounded bg-slate-50" />
          </div>
        ))}
      </section>

      {/* Upcoming renewal alert */}
      <section className="flex items-start gap-4 rounded-lg border border-red-300 bg-red-50 p-5">
        <AlertTriangle
          size={24}
          className="mt-0.5 shrink-0 text-red-600"
        />

        <div className="min-w-0">
          <h2 className="text-base font-bold text-red-700">
            Upcoming Bank Guarantee Renewal
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Bank guarantee renewal information will appear here
            when guarantee records are connected to the backend.
          </p>
        </div>
      </section>

      {/* Guarantees register */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Bank Guarantees Register
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              View and track bank guarantee details and validity.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-4 py-3">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                <td colSpan={columns.length} className="px-4 py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <FileText
                      size={34}
                      strokeWidth={1.8}
                      className="text-slate-300"
                    />

                    <p className="mt-4 text-sm font-semibold text-slate-500">
                      No bank guarantee records available
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Guarantee records will appear here when connected to the backend.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default BankGuaranteesRegister
