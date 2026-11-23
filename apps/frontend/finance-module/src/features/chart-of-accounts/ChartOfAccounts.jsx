
import { useRef, useState } from 'react'
import {
  Download,
  FileUp,
  FolderTree,
  Plus,
  Search,
  X,
  CheckCircle2,
} from 'lucide-react'

const summaryCards = [
  { title: 'Total Accounts', color: 'border-l-[#205c7d]' },
  { title: 'Active Accounts', color: 'border-l-[#22ae65]' },
  { title: 'Pending Approval', color: 'border-l-[#e45b00]' },
  { title: 'Inactive Accounts', color: 'border-l-[#dc3030]' },
]

const initialForm = {
  code: '',
  name: '',
  type: '',
  subType: '',
  currency: 'INR',
  status: 'active',
}

function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([])
  const [accountType, setAccountType] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  
  const filteredAccounts = accounts.filter((account) => {
    const matchesType =
      accountType === 'all' || account.type === accountType

    const matchesStatus =
      status === 'all' || account.status === status

    const searchText = search.trim().toLowerCase()

    const searchableFields = [
      account.code,
      account.name,
      account.type,
      account.subType,
      account.currency,
      account.status,
    ]

    const matchesSearch = searchableFields.some((field) =>
      String(field ?? '').toLowerCase().includes(searchText),
    )

    return matchesType && matchesStatus && matchesSearch
  })


  const summaryValues = [
    accounts.length,
    accounts.filter((account) => account.status === 'active').length,
    accounts.filter((account) => account.status === 'pending').length,
    accounts.filter((account) => account.status === 'inactive').length,
  ]

  const showNotification = (text) => {
    setMessage(text)
    setError('')
  }

  const updateForm = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleAddAccount = (event) => {
    event.preventDefault()

    const code = form.code.trim()
    const name = form.name.trim()

    if (!code || !name || !form.type || !form.subType) {
      setError('Please complete all required fields.')
      return
    }

    const duplicate = accounts.some(
      (account) => account.code.toLowerCase() === code.toLowerCase(),
    )

    if (duplicate) {
      setError('This account code already exists.')
      return
    }

    const newAccount = {
      ...form,
      code,
      name,
      balance: null,
    }

    setAccounts((current) => [...current, newAccount])
    setForm(initialForm)
    setShowModal(false)
    showNotification('Account added successfully in this frontend session.')
  }

  const handleExport = () => {
    const headers = [
      'Account Code',
      'Account Name',
      'Type',
      'Sub-Type',
      'Currency',
      'Status',
    ]

    const rows = filteredAccounts.map((account) => [
      account.code,
      account.name,
      account.type,
      account.subType,
      account.currency,
      account.status,
    ])

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','),
      )
      .join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'chart-of-accounts.csv'
    link.click()

    URL.revokeObjectURL(url)
    showNotification('Chart of Accounts CSV exported successfully.')
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file.')
      event.target.value = ''
      return
    }

    try {
      const content = await file.text()
      const lines = content.trim().split(/\r?\n/)

      if (lines.length < 2) {
        setError('The selected CSV does not contain account records.')
        return
      }

      const parseRow = (line) =>
        line.split(',').map((value) =>
          value.trim().replace(/^"|"$/g, '').replace(/""/g, '"'),
        )

      const importedRows = lines.slice(1).map(parseRow)

      const importedAccounts = importedRows
        .filter((row) => row[0] && row[1])
        .map((row) => ({
          code: row[0],
          name: row[1],
          type: (row[2] || '').toLowerCase(),
          subType: row[3] || '',
          currency: row[4] || 'INR',
          status: (row[5] || 'active').toLowerCase(),
          balance: null,
        }))
        .filter((account) =>
          ['asset', 'liability', 'equity', 'income', 'expense'].includes(
            account.type,
          ),
        )

      if (importedAccounts.length === 0) {
        setError('No valid account rows were found in the CSV.')
        return
      }

      setAccounts((current) => {
        const existingCodes = new Set(
          current.map((account) => account.code.toLowerCase()),
        )

        const uniqueAccounts = importedAccounts.filter((account) => {
          const key = account.code.toLowerCase()

          if (existingCodes.has(key)) return false

          existingCodes.add(key)
          return true
        })

        return [...current, ...uniqueAccounts]
      })

      showNotification(
        `${importedAccounts.length} valid account row(s) processed. Duplicate account codes are skipped.`,
      )
    } catch {
      setError('Unable to read this file. Please check the CSV format.')
    } finally {
      event.target.value = ''
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setForm(initialForm)
    setError('')
  }

  return (
    <div className="space-y-5">
      {/* Notifications */}
      {(message || error) && (
        <div
          className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
          role="status"
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

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => (
          <div
            key={card.title}
            className={`min-h-[145px] rounded-lg border border-slate-200 border-l-4 ${card.color} bg-white p-5 shadow-sm`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {card.title}
            </p>
            <p className="mt-4 text-3xl font-bold text-slate-800">
              {summaryValues[index]}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Accounts currently in this workspace
            </p>
          </div>
        ))}
      </section>

      {/* Filters and actions */}
      <section className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex flex-wrap gap-3">
          <select
            value={accountType}
            onChange={(event) => setAccountType(event.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-600"
            aria-label="Filter account type"
          >
            <option value="all">All Account Types</option>
            <option value="asset">Assets</option>
            <option value="liability">Liabilities</option>
            <option value="equity">Equity</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-600"
            aria-label="Filter account status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending Approval</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImport}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FileUp size={16} />
            Import COA
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={16} />
            Export
          </button>

          <button
            type="button"
            onClick={() => {
              setError('')
              setMessage('')
              setShowModal(true)
            }}
            className="flex h-10 items-center gap-2 rounded-md bg-[#dce4ef] px-4 text-sm font-semibold text-[#233c60] transition hover:bg-[#cbd8e9]"
          >
            <Plus size={16} />
            Add Account
          </button>
        </div>
      </section>

      {/* Accounts table */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Chart of Accounts
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Manage and view the organisation&apos;s account structure.
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
              placeholder="Search accounts..."
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Account Code</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Sub-Type</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>

            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <FolderTree
                      size={32}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      {accounts.length === 0
                        ? 'No accounts available'
                        : 'No matching accounts found'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Account records will appear here when added or connected to the backend.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr
                    key={account.code}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 font-medium text-sky-800">
                      {account.code}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-800">
                      {account.name}
                    </td>
                    <td className="px-4 py-4 capitalize text-slate-600">
                      {account.type}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {account.subType}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {account.currency}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700">
                        {account.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-slate-500">
                      —
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Account Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <div
            className="w-full max-w-xl rounded-xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-account-title"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2
                  id="add-account-title"
                  className="text-lg font-bold text-slate-800"
                >
                  Add Account
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter the account details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Account Code *
                  </label>
                  <input
                    name="code"
                    value={form.code}
                    onChange={updateForm}
                    placeholder="Enter account code"
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-sky-600"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Account Name *
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateForm}
                    placeholder="Enter account name"
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-sky-600"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Account Type *
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={updateForm}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-600"
                    required
                  >
                    <option value="">Select type</option>
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Sub-Type *
                  </label>
                  <input
                    name="subType"
                    value={form.subType}
                    onChange={updateForm}
                    placeholder="Enter sub-type"
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-sky-600"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={updateForm}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-600"
                  >
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={updateForm}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-600"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending Approval</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
                  className="flex items-center gap-2 rounded-md bg-[#dce4ef] px-5 py-2 text-sm font-semibold text-[#233c60] hover:bg-[#cbd8e9]"
                >
                  <Plus size={16} />
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChartOfAccounts
