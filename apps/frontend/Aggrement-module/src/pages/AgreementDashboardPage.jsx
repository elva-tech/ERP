import { StatCard } from "../components/ui/StatCard.jsx";
import { StatusBadge } from "../components/ui/Badge.jsx";
import { formatInr } from "../lib/formatters.js";
import { useSession } from "../features/auth/sessionContext.js";

export function AgreementDashboardPage({ onNavigateToAgreements }) {
  const { session } = useSession();
  const companyName = session?.tenant?.name || "SB Patil Group";
  const fyLabel = session?.tenant?.financialYear || "FY 2026-27";

  const expiringAgreements = [
    { id: "AG-1102", title: "MSEDCL Substation Lease", party: "MSEDCL Maharashtra", type: "Lease", expiry: "24 Apr 2027", daysLeft: "12 days", status: "expiring_soon", urgency: "Critical" },
    { id: "AG-1498", title: "Tata Power EPC Framework", party: "Tata Power Co. Ltd.", type: "Contract", expiry: "02 May 2027", daysLeft: "20 days", status: "active", urgency: "Reviewing" },
    { id: "AG-2091", title: "MIDC Water pipeline access", party: "MIDC Pune Division", type: "Access", expiry: "15 May 2027", daysLeft: "33 days", status: "active", urgency: "Renewal due" },
    { id: "AG-3204", title: "HDFC Office HQ Rental", party: "HDFC Bank Asset Mgmt", type: "Rental", expiry: "22 May 2027", daysLeft: "40 days", status: "active", urgency: "In process" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Dashboard Page Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[20px] font-bold text-ink sm:text-[22px]">
            Agreement &amp; Document Store
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Portfolio overview and upcoming obligations across {companyName}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-soft">
          <span>All entities • {fyLabel}</span>
        </div>
      </div>

      {/* KPI Cards Row (Matching Agreement Dashboard Figma) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Agreements" value="892" subtext="All repositories" tone="default" />
        <StatCard label="Active Agreements" value="234" subtext="+14 this month" tone="info" />
        <StatCard label="Expiring Soon" value="17" subtext="Requires action" tone="warning" />
        <StatCard label="Expired" value="12" subtext="Review required" tone="danger" />
        <StatCard label="Pending Renewal" value="9" subtext="In approval queue" tone="info" />
      </div>

      {/* Charts & Status Overview Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Status Overview (2 cols) */}
        <div className="rounded-xl border border-line bg-surface p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="text-[14px] font-bold text-ink">Agreement Status Overview</h3>
            <span className="text-[11px] text-muted">Active Portfolio Ratio</span>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-[12px] font-medium">
                <span className="text-ink">Client Agreements</span>
                <span className="text-muted">82% active</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-[#1b2a4a]" style={{ width: "82%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[12px] font-medium">
                <span className="text-ink">Vendor Contracts</span>
                <span className="text-muted">74% active</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-600" style={{ width: "74%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[12px] font-medium">
                <span className="text-ink">Lease &amp; Rental</span>
                <span className="text-muted">66% active</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-amber-500" style={{ width: "66%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[12px] font-medium">
                <span className="text-ink">Service Agreements &amp; AMC</span>
                <span className="text-muted">78% active</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: "78%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Renewals Timeline */}
        <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="text-[14px] font-bold text-ink">Upcoming Renewals</h3>
            <span className="text-[11px] font-semibold text-brand">THIS WEEK</span>
          </div>
          <div className="mt-4 space-y-3.5">
            <div className="flex items-start justify-between border-l-2 border-rose-500 pl-3">
              <div>
                <p className="text-[12px] font-bold text-ink">KEB Power Supply</p>
                <p className="text-[11px] text-muted">12 Sep • 3 days left</p>
              </div>
              <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Critical</span>
            </div>

            <div className="flex items-start justify-between border-l-2 border-amber-500 pl-3">
              <div>
                <p className="text-[12px] font-bold text-ink">Siemens Switchgear</p>
                <p className="text-[11px] text-muted">14 Sep • 5 days left</p>
              </div>
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Urgent</span>
            </div>

            <div className="flex items-start justify-between border-l-2 border-blue-500 pl-3">
              <div>
                <p className="text-[12px] font-bold text-ink">MSEDCL Lease Review</p>
                <p className="text-[11px] text-muted">25 Sep • 14 days left</p>
              </div>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Normal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agreements Expiring Soon Table */}
      <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h3 className="text-[14px] font-bold text-ink">Agreements Expiring Soon</h3>
            <p className="text-[11px] text-muted">Action required within 60 days</p>
          </div>
          <button
            type="button"
            onClick={onNavigateToAgreements}
            className="text-[12px] font-semibold text-navy hover:underline"
          >
            View all agreements →
          </button>
        </div>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-[12px]">
            <thead className="text-[11px] uppercase text-muted border-b border-line">
              <tr>
                <th className="py-2.5 px-3">Doc ID</th>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Counterparty</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Expiry Date</th>
                <th className="py-2.5 px-3">Days Left</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {expiringAgreements.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-navy">{item.id}</td>
                  <td className="py-2.5 px-3 font-medium text-ink">{item.title}</td>
                  <td className="py-2.5 px-3 text-muted">{item.party}</td>
                  <td className="py-2.5 px-3 text-muted">{item.type}</td>
                  <td className="py-2.5 px-3 text-muted">{item.expiry}</td>
                  <td className="py-2.5 px-3 font-semibold text-amber-700">{item.daysLeft}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

