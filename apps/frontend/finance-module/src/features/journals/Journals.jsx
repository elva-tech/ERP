
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

const summaryCards = [
  { title: 'Total Journals (YTD)', color: 'border-l-[#205c7d]' },
  { title: 'Posted Journals', color: 'border-l-[#22ae65]' },
  { title: 'Pending Approval', color: 'border-l-[#e45b00]' },
  { title: 'Reversals', color: 'border-l-[#dc3030]' },
]

const journalTabs = ['All', 'Draft', 'Pending', 'Posted', 'Reversed']

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  type: 'General',
  description: '',
  project: '',
  debit: '',
  credit: '',
}

function Journals() {
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [journals, setJournals] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [typeFilter, setTypeFilter] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  
  const filteredJournals = useMemo(() => {
    return journals.filter((journal) => {
      const matchesTab =
        activeTab === 'All' || journal.status === activeTab

      const query = search.trim().toLowerCase()

      const searchableFields = [
        journal.number,
        journal.date,
        journal.type,
        journal.description,
        journal.project,
        journal.status,
        journal.debit,
        journal.credit,
      ]

      const matchesSearch =
        !query ||
        searchableFields.some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        )

      const matchesType =
        typeFilter === 'All' || journal.type === typeFilter

      const matchesFromDate = !fromDate || journal.date >= fromDate
      const matchesToDate = !toDate || journal.date <= toDate

      return (
        matchesTab &&
        matchesSearch &&
        matchesType &&
        matchesFromDate &&
        matchesToDate
      )
    })
  }, [journals, activeTab, search, typeFilter, fromDate, toDate])


  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const closeCreate = () => {
    setShowCreate(false)
    setForm(initialForm)
    setError('')
  }

  const createJournal = (event) => {
    event.preventDefault()

    const debit = Number(form.debit)
    const credit = Number(form.credit)

    if (!form.date || !form.description.trim()) {
      setError('Please enter the journal date and description.')
      return
    }

    if (!form.debit || !form.credit || debit <= 0 || credit <= 0) {
      setError('Enter valid debit and credit amounts greater than zero.')
      return
    }

    if (Math.abs(debit - credit) > 0.001) {
      setError('Debit and credit amounts must be equal.')
      return
    }

    const newJournal = {
      id: `${Date.now()}`,
      number: `DRAFT-${Date.now()}`,
      date: form.date,
      type: form.type,
      description: form.description.trim(),
      project: form.project.trim() || '—',
      debit,
      credit,
      status: 'Draft',
    }

    setJournals((current) => [newJournal, ...current])
    setActiveTab('All')
    setSearch('')
    closeCreate()
  }

  const deleteDraft = (id) => {
    setJournals((current) =>
      current.filter((journal) => journal.id !== id),
    )
  }

  const resetFilters = () => {
    setTypeFilter('All')
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
    journals.filter((journal) => journal.status === status).length

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const value =
            card.title === 'Total Journals (YTD)'
              ? journals.length
              : card.title === 'Posted Journals'
                ? countByStatus('Posted')
                : card.title === 'Pending Approval'
                  ? countByStatus('Pending')
                  : countByStatus('Reversed')

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

      <section className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex flex-wrap gap-2">
          {journalTabs.map((tab) => (
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
            Create Journal
          </button>
        </div>
      </section>

      {showFilters && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Filter Journals
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
              Journal Type
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-sky-600"
              >
                <option value="All">All Types</option>
                <option value="General">General</option>
                <option value="Adjustment">Adjustment</option>
                <option value="Accrual">Accrual</option>
                <option value="Reversal">Reversal</option>
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

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Journal Register
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              View and track journal entries and their posting status.
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
              placeholder="Search journals..."
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Journal No.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredJournals.length > 0 ? (
                filteredJournals.map((journal) => (
                  <tr key={journal.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {journal.number}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {journal.date}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {journal.type}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {journal.description}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatAmount(journal.debit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatAmount(journal.credit)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {journal.project}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {journal.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteDraft(journal.id)}
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
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <FileText size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      No journal entries available
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Create a journal or connect the backend to view existing records.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-400">
            Showing {filteredJournals.length} of {journals.length} journal records
          </p>
        </div>
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Create Journal
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  New journal entries are saved as drafts in this session.
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

            <form onSubmit={createJournal} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Journal Date *
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => updateForm('date', event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                    required
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Journal Type *
                  <select
                    value={form.type}
                    onChange={(event) => updateForm('type', event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-sky-600"
                  >
                    <option>General</option>
                    <option>Adjustment</option>
                    <option>Accrual</option>
                    <option>Reversal</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                  Description *
                  <input
                    value={form.description}
                    onChange={(event) =>
                      updateForm('description', event.target.value)
                    }
                    placeholder="Enter journal description"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                    required
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                  Project (Optional)
                  <input
                    value={form.project}
                    onChange={(event) => updateForm('project', event.target.value)}
                    placeholder="Enter project name or reference"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Debit Amount (₹) *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.debit}
                    onChange={(event) => updateForm('debit', event.target.value)}
                    placeholder="0.00"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                    required
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Credit Amount (₹) *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.credit}
                    onChange={(event) => updateForm('credit', event.target.value)}
                    placeholder="0.00"
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-sky-600"
                    required
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

export default Journals
