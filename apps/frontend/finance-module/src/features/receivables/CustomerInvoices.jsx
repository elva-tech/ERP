
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

const invoiceTabs = [
  'All',
  'Draft',
  'Pending',
  'Approved',
  'Sent',
  'Paid',
  'Overdue',
]

const summaryCards = [
  { title: 'Total Invoiced (YTD)', color: 'border-l-[#205c7d]' },
  { title: 'Paid Invoices', color: 'border-l-[#22ae65]' },
  { title: 'Pending Approval', color: 'border-l-[#e45b00]' },
  { title: 'Overdue Invoices', color: 'border-l-[#dc3030]' },
]

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  customer: '',
  project: '',
  description: '',
  amount: '',
  gst: '',
  dueDate: '',
}

function CustomerInvoices() {
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [invoices, setInvoices] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const query = search.trim().toLowerCase()

      const searchableFields = [
        invoice.number,
        invoice.date,
        invoice.customer,
        invoice.project,
        invoice.description,
        invoice.amount,
        invoice.gst,
        invoice.total,
        invoice.dueDate,
        invoice.status,
      ]

      const matchesSearch =
        !query ||
        searchableFields.some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        )

      const matchesTab =
        activeTab === 'All' || invoice.status === activeTab

      const matchesStatus =
        statusFilter === 'All' || invoice.status === statusFilter

      const matchesFromDate =
        !fromDate || invoice.date >= fromDate

      const matchesToDate =
        !toDate || invoice.date <= toDate

      return (
        matchesSearch &&
        matchesTab &&
        matchesStatus &&
        matchesFromDate &&
        matchesToDate
      )
    })
  }, [
    invoices,
    search,
    activeTab,
    statusFilter,
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

  const createInvoice = (event) => {
    event.preventDefault()

    const amount = Number(form.amount)
    const gst = Number(form.gst || 0)

    if (
      !form.date ||
      !form.customer.trim() ||
      !form.description.trim()
    ) {
      setError('Please complete all required fields.')
      return
    }

    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid invoice amount greater than zero.')
      return
    }

    if (!Number.isFinite(gst) || gst < 0) {
      setError('Enter a valid GST amount.')
      return
    }

    if (form.dueDate && form.dueDate < form.date) {
      setError('Due date cannot be earlier than the invoice date.')
      return
    }

    const newInvoice = {
      id: `${Date.now()}`,
      number: `DRAFT-${Date.now()}`,
      date: form.date,
      customer: form.customer.trim(),
      project: form.project.trim() || '—',
      description: form.description.trim(),
      amount,
      gst,
      total: amount + gst,
      dueDate: form.dueDate,
      status: 'Draft',
    }

    setInvoices((current) => [newInvoice, ...current])
    setActiveTab('All')
    setSearch('')
    closeCreate()
  }

  const deleteDraft = (id) => {
    setInvoices((current) =>
      current.filter((invoice) => invoice.id !== id),
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
    invoices.filter((invoice) => invoice.status === status).length

  const totalInvoiced = invoices.reduce(
    (sum, invoice) => sum + invoice.total,
    0,
  )

  const overdueCount = invoices.filter(
    (invoice) =>
      invoice.status === 'Overdue' ||
      (invoice.dueDate &&
        invoice.dueDate < today &&
        !['Paid', 'Draft'].includes(invoice.status)),
  ).length

  return (
    <div className="space-y-5">
      {/* Invoice summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const value =
            card.title === 'Total Invoiced (YTD)'
              ? formatAmount(totalInvoiced)
              : card.title === 'Paid Invoices'
                ? String(countByStatus('Paid'))
                : card.title === 'Pending Approval'
                  ? String(countByStatus('Pending'))
                  : String(overdueCount)

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
          {invoiceTabs.map((tab) => (
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
            Create Invoice
          </button>
        </div>
      </section>

      {/* Invoice filters */}
      {showFilters && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Filter Invoices
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
              Invoice Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-sky-600"
              >
                <option value="All">All Statuses</option>
                {invoiceTabs.slice(1).map((status) => (
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

      {/* Invoice register */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Customer Invoice Register
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              View and track customer invoices and their payment status.
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
              placeholder="Search invoices..."
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Invoice No.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {invoice.number}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {invoice.date}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {invoice.customer}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {invoice.project}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatAmount(invoice.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatAmount(invoice.gst)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatAmount(invoice.total)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {invoice.dueDate || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteDraft(invoice.id)}
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
                      No customer invoices available
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Create an invoice or connect the backend to view existing records.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-400">
            Showing {filteredInvoices.length} of {invoices.length} invoice records
          </p>
        </div>
      </section>

      {/* Create invoice modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Create Customer Invoice
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  New invoices are saved as drafts in this session.
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

            <form onSubmit={createInvoice} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Invoice Date *
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
                    onChange={(event) =>
                      updateForm('dueDate', event.target.value)
                    }
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                  Customer *
                  <input
                    value={form.customer}
                    onChange={(event) =>
                      updateForm('customer', event.target.value)
                    }
                    placeholder="Enter customer name"
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
                    placeholder="Enter invoice description"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                    required
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Project (Optional)
                  <input
                    value={form.project}
                    onChange={(event) =>
                      updateForm('project', event.target.value)
                    }
                    placeholder="Enter project name or reference"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Amount (₹) *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      updateForm('amount', event.target.value)
                    }
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
                <span className="font-semibold">Invoice total: </span>
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

export default CustomerInvoices
