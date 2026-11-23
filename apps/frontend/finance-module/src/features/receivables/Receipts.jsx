
import { useMemo, useState } from 'react'
import {
  FileText,
  Filter,
  Plus,
  Search,
  X,
  Save,
  Trash2,
} from 'lucide-react'

const receiptTabs = ['All', 'Draft', 'Pending', 'Cleared', 'Bounced']

const summaryCards = [
  { title: 'Total Receipts (YTD)', color: 'border-l-[#205c7d]' },
  { title: 'Cleared Receipts', color: 'border-l-[#22ae65]' },
  { title: 'Pending Clearance', color: 'border-l-[#e45b00]' },
  { title: 'Bounced / Returned', color: 'border-l-[#dc3030]' },
]

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  receivedFrom: '',
  description: '',
  amount: '',
  mode: 'Bank Transfer',
  reference: '',
  bankAccount: '',
}

function Receipts() {
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [receipts, setReceipts] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [modeFilter, setModeFilter] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  
  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const query = search.trim().toLowerCase()

      const searchableFields = [
        receipt.number,
        receipt.date,
        receipt.receivedFrom,
        receipt.description,
        receipt.amount,
        receipt.mode,
        receipt.reference,
        receipt.bankAccount,
        receipt.status,
      ]

      const matchesSearch =
        !query ||
        searchableFields.some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        )

      const matchesTab =
        activeTab === 'All' || receipt.status === activeTab

      const matchesStatus =
        statusFilter === 'All' || receipt.status === statusFilter

      const matchesMode =
        modeFilter === 'All' || receipt.mode === modeFilter

      const matchesFromDate =
        !fromDate || receipt.date >= fromDate

      const matchesToDate =
        !toDate || receipt.date <= toDate

      return (
        matchesSearch &&
        matchesTab &&
        matchesStatus &&
        matchesMode &&
        matchesFromDate &&
        matchesToDate
      )
    })
  }, [
    receipts,
    search,
    activeTab,
    statusFilter,
    modeFilter,
    fromDate,
    toDate,
  ])


  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const closeCreate = () => {
    setShowCreate(false)
    setForm(initialForm)
    setError('')
  }

  const createReceipt = (event) => {
    event.preventDefault()

    const amount = Number(form.amount)

    if (
      !form.date ||
      !form.receivedFrom.trim() ||
      !form.description.trim() ||
      !form.mode
    ) {
      setError('Please complete all required fields.')
      return
    }

    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid receipt amount greater than zero.')
      return
    }

    const newReceipt = {
      id: `${Date.now()}`,
      number: `DRAFT-${Date.now()}`,
      date: form.date,
      receivedFrom: form.receivedFrom.trim(),
      description: form.description.trim(),
      amount,
      mode: form.mode,
      reference: form.reference.trim() || '—',
      bankAccount: form.bankAccount.trim() || '—',
      status: 'Draft',
    }

    setReceipts((current) => [newReceipt, ...current])
    setActiveTab('All')
    setSearch('')
    closeCreate()
  }

  const deleteDraft = (id) => {
    setReceipts((current) =>
      current.filter((receipt) => receipt.id !== id),
    )
  }

  const resetFilters = () => {
    setStatusFilter('All')
    setModeFilter('All')
    setFromDate('')
    setToDate('')
  }

  const formatAmount = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount)

  const countByStatus = (status) =>
    receipts.filter((receipt) => receipt.status === status).length

  const totalReceipts = receipts.reduce(
    (sum, receipt) => sum + receipt.amount,
    0,
  )

  return (
    <div className="space-y-5">
      {/* Receipt summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const value =
            card.title === 'Total Receipts (YTD)'
              ? formatAmount(totalReceipts)
              : card.title === 'Cleared Receipts'
                ? String(countByStatus('Cleared'))
                : card.title === 'Pending Clearance'
                  ? String(countByStatus('Pending'))
                  : String(countByStatus('Bounced'))

          return (
            <div
              key={card.title}
              className={`min-h-[145px] rounded-lg border border-slate-200 border-l-4 ${card.color} bg-white p-5 shadow-sm`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {card.title}
              </p>
              <p className="mt-4 text-2xl font-bold text-slate-800">
                {value}
              </p>
              <p className="mt-3 text-xs text-slate-400">
                Current session records
              </p>
            </div>
          )
        })}
      </section>

      {/* Status tabs and actions */}
      <section className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex flex-wrap gap-2">
          {receiptTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'border-[#205c7d] bg-[#205c7d] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            className={`flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold ${
              showFilters
                ? 'border-[#205c7d] bg-sky-50 text-[#205c7d]'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={16} />
            Filters
          </button>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex h-10 items-center gap-2 rounded-md bg-[#205c7d] px-4 text-sm font-semibold text-white hover:bg-[#174765]"
          >
            <Plus size={16} />
            Create Receipt
          </button>
        </div>
      </section>

      {/* Filters */}
      {showFilters && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Filter Receipts
            </h3>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-[#205c7d] hover:underline"
            >
              Clear filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600">
              Receipt Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-sky-600"
              >
                <option value="All">All Statuses</option>
                {receiptTabs.slice(1).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Payment Mode
              <select
                value={modeFilter}
                onChange={(event) => setModeFilter(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-sky-600"
              >
                <option value="All">All Modes</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600">
              From Date
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              To Date
              <input
                type="date"
                min={fromDate || undefined}
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
              />
            </label>
          </div>
        </section>
      )}

      {/* Receipt register */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Receipt Register
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              View and track incoming receipts and their clearance status.
            </p>
          </div>

          <div className="relative w-full md:max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search receipts..."
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Receipt No.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Received From</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Bank A/C</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredReceipts.length > 0 ? (
                filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {receipt.number}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {receipt.date}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {receipt.receivedFrom}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {receipt.description}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatAmount(receipt.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {receipt.mode}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {receipt.reference}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {receipt.bankAccount}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {receipt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteDraft(receipt.id)}
                        title="Delete draft"
                        className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <FileText
                      size={32}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      No receipts available
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Create a receipt or connect the backend to view existing records.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-400">
            Showing {filteredReceipts.length} of {receipts.length} receipt records
          </p>
        </div>
      </section>

      {/* Create receipt modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Create Receipt
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  New receipts are saved as drafts in this session.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createReceipt} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Receipt Date *
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => updateForm('date', event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                    required
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Received From *
                  <input
                    value={form.receivedFrom}
                    onChange={(event) =>
                      updateForm('receivedFrom', event.target.value)
                    }
                    placeholder="Enter payer name"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                    required
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                  Description *
                  <input
                    value={form.description}
                    onChange={(event) =>
                      updateForm('description', event.target.value)
                    }
                    placeholder="Enter receipt description"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                    required
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Amount (₹) *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => updateForm('amount', event.target.value)}
                    placeholder="0.00"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                    required
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Receipt Mode *
                  <select
                    value={form.mode}
                    onChange={(event) => updateForm('mode', event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-sky-600"
                  >
                    <option>Bank Transfer</option>
                    <option>Cheque</option>
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Reference Number
                  <input
                    value={form.reference}
                    onChange={(event) =>
                      updateForm('reference', event.target.value)
                    }
                    placeholder="Enter transaction reference"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Bank Account
                  <input
                    value={form.bankAccount}
                    onChange={(event) =>
                      updateForm('bankAccount', event.target.value)
                    }
                    placeholder="Enter bank account"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                  />
                </label>
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeCreate}
                  className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex h-10 items-center gap-2 rounded-md bg-[#205c7d] px-4 text-sm font-semibold text-white hover:bg-[#174765]"
                >
                  <Save size={16} />
                  Save as Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Receipts
