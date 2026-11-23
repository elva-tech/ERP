
import { useRef, useState } from 'react'
import {
  Upload,
  Zap,
  FileText,
  Search,
  X,
  CheckCircle2,
} from 'lucide-react'

const summaryCards = [
  {
    title: 'HDFC Statement Balance',
    color: 'border-l-[#205c7d]',
  },
  {
    title: 'ERP Book Balance',
    color: 'border-l-[#22ae65]',
  },
  {
    title: 'Difference (Unreconciled)',
    color: 'border-l-[#e45b00]',
  },
]

function parseCSVLine(line) {
  const values = []
  let current = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (character === ',' && !insideQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }

  values.push(current.trim())
  return values
}

function EmptyState({ message, description }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-4 py-10 text-center">
      <FileText size={34} strokeWidth={1.8} className="text-slate-300" />
      <p className="mt-4 text-sm font-semibold text-slate-500">
        {message}
      </p>
      <p className="mt-1 max-w-md text-xs text-slate-400">
        {description}
      </p>
    </div>
  )
}

function BankReconciliation() {
  const fileInputRef = useRef(null)

  const [bankAccount, setBankAccount] = useState('')
  const [period, setPeriod] = useState('')
  const [search, setSearch] = useState('')
  const [bankEntries, setBankEntries] = useState([])
  const [ledgerEntries] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const notify = (text) => {
    setMessage(text)
    setError('')
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV bank statement file.')
      event.target.value = ''
      return
    }

    try {
      const content = await file.text()
      const lines = content
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '')

      if (lines.length < 2) {
        setError('The CSV file does not contain any statement entries.')
        return
      }

      const headers = parseCSVLine(lines[0]).map((header) =>
        header.toLowerCase().trim(),
      )

      const dateIndex = headers.findIndex((header) =>
        ['date', 'transaction date', 'value date'].includes(header),
      )

      const descriptionIndex = headers.findIndex((header) =>
        ['description', 'narration', 'particulars', 'details'].includes(header),
      )

      const amountIndex = headers.findIndex((header) =>
        ['amount', 'transaction amount', 'debit/credit'].includes(header),
      )

      if (
        dateIndex === -1 ||
        descriptionIndex === -1 ||
        amountIndex === -1
      ) {
        setError(
          'CSV headers must include Date, Description and Amount.',
        )
        return
      }

      const importedEntries = lines.slice(1).map((line, index) => {
        const columns = parseCSVLine(line)

        return {
          id: `${Date.now()}-${index}`,
          date: columns[dateIndex] || '',
          description: columns[descriptionIndex] || '',
          amount: columns[amountIndex] || '',
        }
      }).filter(
        (entry) => entry.date && entry.description && entry.amount,
      )

      if (importedEntries.length === 0) {
        setError('No valid bank statement entries were found.')
        return
      }

      setBankEntries((current) => [...current, ...importedEntries])
      notify(`${importedEntries.length} bank statement entries uploaded successfully.`)
    } catch {
      setError('Unable to read the CSV file. Please check its format.')
    } finally {
      event.target.value = ''
    }
  }

  const handleAutoMatch = () => {
    if (!bankAccount.trim()) {
      setError('Please enter a bank account name first.')
      return
    }

    if (!period) {
      setError('Please select a reconciliation period.')
      return
    }

    if (bankEntries.length === 0) {
      setError('Upload a bank statement before starting auto-match.')
      return
    }

    if (ledgerEntries.length === 0) {
      setError(
        'No ERP ledger entries are available. Connect the ledger data before matching.',
      )
      return
    }

    notify('Reconciliation check started.')
  }

  const filteredEntries = bankEntries.filter((entry) => {
    const query = search.toLowerCase()

    return (
      entry.date.toLowerCase().includes(query) ||
      entry.description.toLowerCase().includes(query) ||
      entry.amount.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-5">
      {/* Notifications */}
      {(message || error) && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm ${
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

      {/* Account and period selection */}
      <section className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={bankAccount}
            onChange={(event) => setBankAccount(event.target.value)}
            placeholder="Enter bank account name"
            aria-label="Bank account name"
            className="h-10 min-w-[220px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-600"
          />

          <input
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Select reconciliation period"
            className="h-10 min-w-[170px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-600"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Upload size={16} />
            Upload Statement
          </button>

          <button
            type="button"
            onClick={handleAutoMatch}
            className="flex h-10 items-center gap-2 rounded-md bg-[#205c7d] px-4 text-sm font-semibold text-white transition hover:bg-[#174967]"
          >
            <Zap size={16} />
            Auto-Match Entries
          </button>
        </div>
      </section>

      {/* Balance summary cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className={`min-h-[145px] rounded-lg border border-slate-200 border-l-4 ${card.color} bg-white p-5 shadow-sm`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {card.title}
            </p>

            <p className="mt-4 text-2xl font-bold text-slate-700">
              —
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Balance will appear when financial data is connected.
            </p>
          </div>
        ))}
      </section>

      {/* Bank statement entries */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Bank Statement Entries
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Uploaded bank statement records
            </p>
          </div>

          <div className="relative w-full md:max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bank entries..."
              aria-label="Search bank statement entries"
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-600"
            />
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <EmptyState
            message={
              bankEntries.length === 0
                ? 'No bank statement entries available'
                : 'No matching entries found'
            }
            description="Upload a CSV bank statement to display its transaction records here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-100 text-[11px] uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>

              <tbody>
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-600">
                      {entry.date}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {entry.description}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {entry.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Book ledger entries */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-base font-bold text-slate-800">
            Unmatched Book Ledger Entries
          </h2>
        </div>

        <EmptyState
          message="No ledger entries available"
          description="ERP book ledger entries will appear here when connected to the backend."
        />
      </section>
    </div>
  )
}

export default BankReconciliation
