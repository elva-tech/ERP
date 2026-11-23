
import { useMemo, useState } from 'react'
import {
  FileText,
  Download,
  CalendarClock,
  Search,
  Plus,
  X,
} from 'lucide-react'

const categories = [
  'All Reports',
  'Statutory Reports',
  'MIS Reports',
  'Project Reports',
  'Taxation',
  'Audit Ready',
]

function ReportsMISCenter() {
  const [activeCategory, setActiveCategory] = useState('All Reports')
  const [search, setSearch] = useState('')
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [schedules, setSchedules] = useState([])
  const [notice, setNotice] = useState('')

  const [scheduleForm, setScheduleForm] = useState({
    reportName: '',
    email: '',
    frequency: 'monthly',
    deliveryDay: '1',
  })

  // Actual report definitions will be supplied by the backend.
  const [reports] = useState([])

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase()

    return reports.filter((report) => {
      const matchesCategory =
        activeCategory === 'All Reports' ||
        report.category === activeCategory

      const matchesSearch =
        !query ||
        [report.name, report.description, report.category].some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        )

      return matchesCategory && matchesSearch
    })
  }, [reports, activeCategory, search])

  const updateScheduleField = (event) => {
    const { name, value } = event.target

    setScheduleForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const createSchedule = (event) => {
    event.preventDefault()

    const newSchedule = {
      id: Date.now(),
      ...scheduleForm,
    }

    setSchedules((previous) => [...previous, newSchedule])

    setScheduleForm({
      reportName: '',
      email: '',
      frequency: 'monthly',
      deliveryDay: '1',
    })

    setShowScheduleForm(false)
    setNotice(
      'Schedule saved in this session. Automated email delivery requires backend integration.',
    )
  }

  const removeSchedule = (id) => {
    setSchedules((previous) =>
      previous.filter((schedule) => schedule.id !== id),
    )
  }

  const handleReportDownload = (report) => {
    if (!report.downloadUrl) {
      setNotice('Report download is not available for this report yet.')
      return
    }

    window.open(report.downloadUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      {/* Report Category Filters */}
      <section className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => {
            const active = activeCategory === category

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-[#2E2D55] bg-[#2E2D55] text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {category}
              </button>
            )
          })}
        </div>

        <div className="relative max-w-md">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reports..."
            aria-label="Search reports"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#205c7d]"
          />
        </div>
      </section>

      {/* Reports Area */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredReports.length === 0 ? (
          <div className="col-span-full flex min-h-[230px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-center shadow-sm">
            <FileText size={38} className="mb-4 text-slate-300" />

            <h3 className="text-sm font-semibold text-slate-700">
              {search
                ? 'No matching reports found'
                : 'No reports available'}
            </h3>

            <p className="mt-2 max-w-lg text-sm text-slate-400">
              {search
                ? 'Try another report name or search term.'
                : 'Available reports will appear here when report definitions are connected to the backend.'}
            </p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report.id}
              className="flex min-h-[200px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-center">
                <FileText size={32} className="text-slate-300" />
              </div>

              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <h3 className="text-sm font-semibold text-slate-700">
                  {report.name}
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  {report.description}
                </p>

                <span className="mt-2 rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                  {report.category}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="text-xs font-medium text-slate-500">
                  {report.format || 'Report'}
                </span>

                <button
                  type="button"
                  onClick={() => handleReportDownload(report)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Download size={15} />
                  Download
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Scheduled MIS Deliveries */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800">
            Scheduled MIS Automated Deliveries
          </h2>

          <button
            type="button"
            onClick={() => {
              setNotice('')
              setShowScheduleForm(true)
            }}
            className="flex items-center gap-2 rounded-lg bg-[#2E2D55] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#242344]"
          >
            <Plus size={16} />
            New Schedule
          </button>
        </div>

        {notice && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            {notice}
          </div>
        )}

        {schedules.length === 0 ? (
          <div className="flex min-h-[130px] flex-col items-center justify-center rounded-lg bg-slate-50 px-4 text-center">
            <CalendarClock size={32} className="mb-3 text-slate-300" />

            <p className="text-sm font-semibold text-slate-500">
              No scheduled MIS deliveries available
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Create a schedule to configure a future report delivery.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {schedule.reportName}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {schedule.email}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {schedule.frequency === 'monthly'
                      ? `Monthly · Day ${schedule.deliveryDay}`
                      : schedule.frequency === 'weekly'
                        ? `Weekly · ${schedule.deliveryDay}`
                        : 'Daily'}
                  </p>
                  <span className="mt-2 inline-block rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                    Session only · Not scheduled for delivery
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeSchedule(schedule.id)}
                  aria-label={`Remove ${schedule.reportName} schedule`}
                  className="self-start rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 sm:self-center"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* New Schedule Form */}
      {showScheduleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                Create MIS Schedule
              </h2>

              <button
                type="button"
                onClick={() => setShowScheduleForm(false)}
                aria-label="Close schedule form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={createSchedule} className="space-y-4">
              <div>
                <label
                  htmlFor="reportName"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Report Name
                </label>
                <input
                  id="reportName"
                  name="reportName"
                  value={scheduleForm.reportName}
                  onChange={updateScheduleField}
                  placeholder="Enter report name"
                  required
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#205c7d]"
                />
              </div>

              <div>
                <label
                  htmlFor="scheduleEmail"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Recipient Email
                </label>
                <input
                  id="scheduleEmail"
                  name="email"
                  type="email"
                  value={scheduleForm.email}
                  onChange={updateScheduleField}
                  placeholder="Enter recipient email"
                  required
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#205c7d]"
                />
              </div>

              <div>
                <label
                  htmlFor="frequency"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Frequency
                </label>
                <select
                  id="frequency"
                  name="frequency"
                  value={scheduleForm.frequency}
                  onChange={updateScheduleField}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#205c7d]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {scheduleForm.frequency === 'monthly' && (
                <div>
                  <label
                    htmlFor="deliveryDay"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Delivery Day
                  </label>
                  <select
                    id="deliveryDay"
                    name="deliveryDay"
                    value={scheduleForm.deliveryDay}
                    onChange={updateScheduleField}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#205c7d]"
                  >
                    {Array.from({ length: 28 }, (_, index) => index + 1).map(
                      (day) => (
                        <option key={day} value={String(day)}>
                          {day}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}

              {scheduleForm.frequency === 'weekly' && (
                <div>
                  <label
                    htmlFor="weeklyDay"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Delivery Day
                  </label>
                  <select
                    id="weeklyDay"
                    name="deliveryDay"
                    value={scheduleForm.deliveryDay}
                    onChange={updateScheduleField}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#205c7d]"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                      (day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-[#2E2D55] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#242344]"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportsMISCenter
