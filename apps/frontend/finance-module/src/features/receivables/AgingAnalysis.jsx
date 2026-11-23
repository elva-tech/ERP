
import { FileText } from 'lucide-react'

const agingColumns = [
  'Customer Account',
  'Current',
  '1–30 Days',
  '31–60 Days',
  '61–90 Days',
  '90+ Days',
  'Balance',
]

function AgingAnalysis() {
  return (
    <div className="space-y-5">
      {/* Aging bucket distribution */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800">
            Outstanding Aging Bucket Distribution
          </h2>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            Total Evaluated:
            <div className="h-5 w-24 rounded bg-slate-100" />
          </div>
        </div>

        {/* Distribution placeholder */}
        <div className="h-9 w-full overflow-hidden rounded-md bg-slate-100" />

        {/* Legend */}
        <div className="mt-5 flex flex-wrap justify-center gap-x-7 gap-y-3">
          {[
            { label: 'Current', color: 'bg-green-500' },
            { label: '1–30 Days', color: 'bg-yellow-400' },
            { label: '31–60 Days', color: 'bg-orange-400' },
            { label: '61–90 Days', color: 'bg-orange-600' },
            { label: '90+ Days', color: 'bg-red-600' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-sm ${item.color}`} />
              <span className="text-xs font-medium text-slate-500">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Aging details table */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 text-base font-bold text-slate-800">
          Aging Details by Customer Account
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase text-slate-600">
              <tr>
                {agingColumns.map((column) => (
                  <th key={column} className="px-4 py-3">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                <td
                  colSpan={agingColumns.length}
                  className="px-4 py-20 text-center"
                >
                  <FileText
                    size={32}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-500">
                    No aging records available
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Customer aging details will appear here when connected to the backend.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default AgingAnalysis
