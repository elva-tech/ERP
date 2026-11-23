
import { FileText } from 'lucide-react'

const facilities = [
  { name: 'Bank OD Facility', color: 'bg-[#205c7d]' },
  { name: 'Bank CC Facility', color: 'bg-[#dc3030]' },
]

function EmptyState({ message, description }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center text-center">
      <FileText size={34} className="text-slate-300" />
      <p className="mt-3 text-sm font-semibold text-slate-500">
        {message}
      </p>
      <p className="mt-1 text-sm text-slate-400">
        {description}
      </p>
    </div>
  )
}

function CreditFacilities() {
  return (
    <div className="space-y-7">

      {/* Facility Cards */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {facilities.map((facility) => (
          <div
            key={facility.name}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className={`h-6 w-3 rounded-sm ${facility.color}`} />
                <h2 className="text-base font-bold text-slate-800">
                  {facility.name}
                </h2>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                Facility Status
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {['Sanctioned Limit', 'Utilized Amount', 'Available Headroom'].map(
                (label) => (
                  <div key={label}>
                    <p className="text-sm text-slate-400">{label}</p>
                    <div className="mt-2 h-8 w-32 animate-pulse rounded bg-slate-100" />
                  </div>
                ),
              )}
            </div>

            <div className="mt-5">
              <div className="flex justify-between">
                <p className="text-sm text-slate-500">Utilization Rate</p>
                <div className="h-4 w-12 rounded bg-slate-100" />
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" />
            </div>

            <div className="mt-5 border-t border-slate-200" />
          </div>
        ))}
      </div>

      {/* Aggregate Summary and Transactions */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800">
            Aggregate Facility Summary
          </h2>

          <div className="mt-4 space-y-3">
            {[
              'Aggregate Sanctioned Limits',
              'Aggregate Utilization',
              'Aggregate Headroom / Available',
            ].map((label) => (
              <div
                key={label}
                className="flex min-h-[58px] items-center justify-between rounded-lg bg-slate-100 px-4 py-3"
              >
                <span className="text-sm text-slate-600">{label}</span>
                <div className="h-6 w-24 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800">
            Recent Facility Transactions
          </h2>

          <EmptyState
            message="No facility transactions available"
            description="Facility transactions will appear here when connected to the backend."
          />
        </section>
      </div>
    </div>
  )
}

export default CreditFacilities
