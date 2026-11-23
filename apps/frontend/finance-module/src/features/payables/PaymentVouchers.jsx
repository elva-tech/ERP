
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

const voucherTabs = [
  'All',
  'Draft',
  'Pending',
  'Approved',
  'Paid',
  'Rejected',
]

const summaryCards = [
  { title: 'Total Payments (YTD)', color: 'border-l-[#205c7d]' },
  { title: 'Approved Vouchers', color: 'border-l-[#22ae65]' },
  { title: 'Pending Approval', color: 'border-l-[#e45b00]' },
  { title: 'Rejected / On Hold', color: 'border-l-[#dc3030]' },
]

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  payee: '',
  description: '',
  amount: '',
  gst: '',
  dueDate: '',
}

function PaymentVouchers() {
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [vouchers, setVouchers] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) => {
      const query = search.trim().toLowerCase()

      const searchableFields = [
        voucher.number,
        voucher.date,
        voucher.payee,
        voucher.description,
        voucher.amount,
        voucher.gst,
        voucher.total,
        voucher.dueDate,
        voucher.status,
      ]

      const matchesSearch =
        !query ||
        searchableFields.some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        )

      const matchesTab =
        activeTab === 'All' || voucher.status === activeTab

      const matchesStatus =
        statusFilter === 'All' || voucher.status === statusFilter

      const matchesFromDate = !fromDate || voucher.date >= fromDate
      const matchesToDate = !toDate || voucher.date <= toDate

      return (
        matchesSearch &&
        matchesTab &&
        matchesStatus &&
        matchesFromDate &&
        matchesToDate
      )
    })
  }, [vouchers, search, activeTab, statusFilter, fromDate, toDate])


  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const closeCreate = () => {
    setShowCreate(false)
    setForm(initialForm)
    setError('')
  }

  const createVoucher = (event) => {
    event.preventDefault()

    const amount = Number(form.amount)
    const gst = Number(form.gst || 0)

    if (!form.payee.trim() || !form.description.trim() || !form.date) {
      setError('Please complete all required fields.')
      return
    }

    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid payment amount greater than zero.')
      return
    }

    if (!Number.isFinite(gst) || gst < 0) {
      setError('Enter a valid GST amount.')
      return
    }

    if (form.dueDate && form.dueDate < form.date) {
      setError('Due date cannot be earlier than the voucher date.')
      return
    }

    const newVoucher = {
      id: `${Date.now()}`,
      number: `DRAFT-${Date.now()}`,
      date: form.date,
      payee: form.payee.trim(),
      description: form.description.trim(),
      amount,
      gst,
      total: amount + gst,
      dueDate: form.dueDate,
      status: 'Draft',
    }

    setVouchers((current) => [newVoucher, ...current])
    setActiveTab('All')
    setSearch('')
    closeCreate()
  }

  const deleteDraft = (id) => {
    setVouchers((current) =>
      current.filter((voucher) => voucher.id !== id),
    )
  }

  const resetFilters = () => {
    setStatusFilter('All')
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
    vouchers.filter((voucher) => voucher.status === status).length

  const totalPayments = vouchers.reduce(
    (sum, voucher) => sum + voucher.total,
    0,
  )

  const formatSummary = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const value =
            card.title === 'Total Payments (YTD)'
              ? formatSummary(totalPayments)
              : card.title === 'Approved Vouchers'
                ? String(countByStatus('Approved'))
                : card.title === 'Pending Approval'
                  ? String(countByStatus('Pending'))
                  : String(countByStatus('Rejected'))

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
          {voucherTabs.map((tab) => (
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
            Create Voucher
          </button>
        </div>
      </section>

      {/* Filters */}
      {showFilters && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Filter Payment Vouchers
            </h3>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-[#205c7d] hover:underline"
            >
              Clear filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-slate-600">
              Voucher Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-sky-600"
              >
                <option value="All">All Statuses</option>
                {voucherTabs.slice(1).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
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

      {/* Voucher register */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Payment Voucher Register
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              View and track payment vouchers and their approval status.
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
              placeholder="Search vouchers..."
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Voucher No.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payee / Supplier</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredVouchers.length > 0 ? (
                filteredVouchers.map((voucher) => (
                  <tr key={voucher.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {voucher.number}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {voucher.date}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {voucher.payee}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {voucher.description}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatAmount(voucher.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatAmount(voucher.gst)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatAmount(voucher.total)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {voucher.dueDate || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {voucher.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteDraft(voucher.id)}
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
                    <FileText size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      No payment vouchers available
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Create a voucher or connect the backend to view existing records.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-400">
            Showing {filteredVouchers.length} of {vouchers.length} payment voucher records
          </p>
        </div>
      </section>

      {/* Create voucher modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Create Payment Voucher
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  New vouchers are saved as drafts in this session.
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

            <form onSubmit={createVoucher} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Voucher Date *
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => updateForm('date', event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                    required
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Due Date
                  <input
                    type="date"
                    min={form.date}
                    value={form.dueDate}
                    onChange={(event) => updateForm('dueDate', event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                  Payee / Supplier *
                  <input
                    value={form.payee}
                    onChange={(event) => updateForm('payee', event.target.value)}
                    placeholder="Enter payee or supplier name"
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
                    placeholder="Enter payment description"
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
                  GST Amount (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.gst}
                    onChange={(event) => updateForm('gst', event.target.value)}
                    placeholder="0.00"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                  />
                </label>
              </div>

              <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                <span className="font-semibold">Voucher total: </span>
                {formatAmount(
                  (Number(form.amount) || 0) + (Number(form.gst) || 0),
                )}
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

export default PaymentVouchers
