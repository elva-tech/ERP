
import { useState } from 'react'
import { Plus, X, CheckCircle2 } from 'lucide-react'

const columns = [
  'Department',
  'Prev. Actual',
  'Curr. Budget',
  'Proposed',
  'Variance %',
  'Status',
]

const workflowSteps = [
  {
    number: 1,
    title: 'Initiation',
    description: 'Department heads proposed drafts',
    color: 'bg-emerald-500',
  },
  {
    number: 2,
    title: 'CFO Consolidation',
    description: 'CFO audit and variance alignment',
    color: 'bg-orange-500',
  },
  {
    number: 3,
    title: 'Director Panel Board',
    description: 'Final review and board voting',
    color: 'bg-slate-400',
  },
]

const allocationGroups = [
  { label: 'Station Equipment', color: 'bg-red-600' },
  { label: 'Line Material', color: 'bg-[#205c7d]' },
  { label: 'Civil & Erection', color: 'bg-orange-600' },
]

const initialForm = {
  department: '',
  previousActual: '',
  currentBudget: '',
  proposed: '',
}

function SummaryCard({ title, value, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase text-slate-600">
        {title}
      </p>
      <p className="mt-3 text-2xl font-bold text-slate-800">
        {value}
      </p>
      <p className={`mt-2 h-1.5 w-32 rounded ${color}`} />
    </div>
  )
}

function BudgetPlanning() {
  const [planningModel, setPlanningModel] = useState('conservative')
  const [allocations, setAllocations] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const totalProposed = allocations.reduce(
    (total, item) => total + Number(item.proposed),
    0,
  )

  const totalBudget = allocations.reduce(
    (total, item) => total + Number(item.currentBudget),
    0,
  )

  const updateForm = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const proposed = Number(form.proposed)
    const previousActual = Number(form.previousActual)
    const currentBudget = Number(form.currentBudget)

    if (
      !form.department.trim() ||
      form.previousActual === '' ||
      form.currentBudget === '' ||
      form.proposed === ''
    ) {
      setError('Please complete all required fields.')
      return
    }

    if (
      !Number.isFinite(proposed) ||
      !Number.isFinite(previousActual) ||
      !Number.isFinite(currentBudget) ||
      proposed < 0 ||
      previousActual < 0 ||
      currentBudget < 0
    ) {
      setError('Please enter valid non-negative budget amounts.')
      return
    }

    const variance =
      currentBudget === 0
        ? null
        : ((proposed - currentBudget) / currentBudget) * 100

    const newAllocation = {
      id: Date.now(),
      department: form.department.trim(),
      previousActual,
      currentBudget,
      proposed,
      variance,
      status: 'Draft',
    }

    setAllocations((current) => [...current, newAllocation])
    setForm(initialForm)
    setShowModal(false)
    setError('')
    setMessage('Budget adjustment added as a draft in this session.')
  }

  const closeModal = () => {
    setShowModal(false)
    setForm(initialForm)
    setError('')
  }

  return (
    <div className="space-y-7">

      {/* Notifications */}
      {(message || error) && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          <span className="flex items-center gap-2">
            {error ? <X size={17} /> : <CheckCircle2 size={17} />}
            {error || message}
          </span>
          <button
            type="button"
            onClick={() => {
              setMessage('')
              setError('')
            }}
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <SummaryCard
          title="Total Proposed Capital"
          value={totalProposed.toLocaleString('en-IN')}
          color="bg-emerald-50"
        />

        <SummaryCard
          title="Max Allocation Pool"
          value={totalBudget.toLocaleString('en-IN')}
          color="bg-slate-100"
        />

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-slate-600">
            Active Workflow Status
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {allocations.length > 0 ? 'Draft' : '—'}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {allocations.length > 0
              ? `${allocations.length} draft allocation(s)`
              : 'Workflow information will appear here.'}
          </p>
        </div>
      </section>

      {/* Planning Controls */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <select
          value={planningModel}
          onChange={(event) => setPlanningModel(event.target.value)}
          aria-label="Planning model"
          className="h-10 w-fit rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-sky-600"
        >
          <option value="conservative">Planning Model: Conservative</option>
          <option value="moderate">Planning Model: Moderate</option>
          <option value="aggressive">Planning Model: Aggressive</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setError('')
            setMessage('')
            setShowModal(true)
          }}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2E2D55] px-5 text-sm font-semibold text-white transition hover:bg-[#242344]"
        >
          <Plus size={16} />
          Propose Adjustment
        </button>
      </section>

      {/* Allocation Table and Workflow */}
      <section className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[1.65fr_1fr]">

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">
            Proposed Allocation Table
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-3 py-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {allocations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-20 text-center"
                    >
                      <p className="text-sm font-semibold text-slate-500">
                        No budget allocations available
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Proposed department allocations will appear here when
                        entered.
                      </p>
                    </td>
                  </tr>
                ) : (
                  allocations.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-3 font-medium text-slate-800">
                        {item.department}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {item.previousActual.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {item.currentBudget.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800">
                        {item.proposed.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {item.variance === null
                          ? '—'
                          : `${item.variance.toFixed(2)}%`}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">

          {/* Approval Workflow */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-800">
              Approval Steps Workflow
            </h2>

            <div className="space-y-3">
              {workflowSteps.map((step) => (
                <div
                  key={step.number}
                  className="flex items-center gap-3 rounded-lg bg-slate-100 p-3"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${step.color}`}
                  >
                    {step.number}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Strategic Allocation Ratio */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-base font-bold text-slate-800">
              Strategic Target Allocation Ratio
            </h2>

            <div className="space-y-5">
              {allocationGroups.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      {group.label}
                    </span>
                    <span className="text-xs text-slate-400">—</span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full w-0 ${group.color}`} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      {/* Propose Adjustment Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-modal-title"
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2
                  id="budget-modal-title"
                  className="text-lg font-bold text-slate-800"
                >
                  Propose Budget Adjustment
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter the department budget details.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close dialog"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Department *
                </label>
                <input
                  name="department"
                  value={form.department}
                  onChange={updateForm}
                  placeholder="Enter department name"
                  required
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-sky-600"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Previous Actual *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="previousActual"
                    value={form.previousActual}
                    onChange={updateForm}
                    required
                    placeholder="Enter amount"
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Current Budget *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="currentBudget"
                    value={form.currentBudget}
                    onChange={updateForm}
                    required
                    placeholder="Enter amount"
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-sky-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Proposed Budget *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="proposed"
                    value={form.proposed}
                    onChange={updateForm}
                    required
                    placeholder="Enter proposed amount"
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-md bg-[#2E2D55] px-5 py-2 text-sm font-semibold text-white hover:bg-[#242344]"
                >
                  <Plus size={16} />
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BudgetPlanning
