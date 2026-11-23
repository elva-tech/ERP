
import {
  Wallet,
  FileText,
} from 'lucide-react'

const accountCards = [
  { title: 'Bank Account', category: 'Current' },
  { title: 'Bank Account', category: 'Escrow' },
  { title: 'Bank Account', category: 'Salary' },
  { title: 'Bank Account', category: 'Deposits' },
]

function BankAccountsTreasury() {
  return (
    <div className="space-y-5">
      {/* Consolidated cash banner */}
      <section className="flex min-h-[100px] flex-wrap items-center justify-between gap-4 rounded-lg bg-[#205c7d] px-6 py-5 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15">
            <Wallet size={25} />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
              Total Consolidated Liquid Cash
            </p>
            <div className="mt-2 h-8 w-44 rounded bg-white/20" />
          </div>
        </div>

        <div className="h-4 w-64 max-w-full rounded bg-white/15" />
      </section>

      {/* Bank account cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {accountCards.map((account, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="text-sm font-semibold text-slate-700">
                  {account.title}
                </span>
              </div>

              <span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
                {account.category}
              </span>
            </div>

            <div className="mt-5 h-8 w-32 rounded bg-slate-100" />

            <div className="mt-5 flex justify-between gap-3">
              <div className="h-3 w-20 rounded bg-slate-50" />
              <div className="h-3 w-24 rounded bg-slate-50" />
            </div>
          </div>
        ))}
      </section>

      {/* Petty cash and cash flow */}
      <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        {/* Petty cash */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-slate-800">
            Site Petty Cash Reserves
          </h2>

          <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
            <Wallet size={32} className="text-slate-300" />

            <p className="mt-3 text-sm font-medium text-slate-500">
              No petty cash records available
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Site cash reserve details will appear here when connected to the backend.
            </p>
          </div>
        </div>

        {/* Recent cash flow */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-slate-800">
            Recent Cash Flow Statements (Treasury)
          </h2>

          <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
            <FileText size={32} className="text-slate-300" />

            <p className="mt-3 text-sm font-medium text-slate-500">
              No cash flow statements available
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Treasury transactions will appear here when connected to the backend.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default BankAccountsTreasury
