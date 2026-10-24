import { displayText, formatInrCompact } from "../../../lib/formatters.js";

function initialsFor(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function MetaItem({ label, value }) {
  return (
    <span className="whitespace-nowrap">
      {label}: <span className="font-semibold text-[#1b2631]">{displayText(value)}</span>
    </span>
  );
}

const TOTALS = [
  { key: "totalPurchases", label: "Total Purchases", className: "text-[#1b2631]" },
  { key: "totalPayments", label: "Total Payments", className: "text-[#27ae60]" },
  { key: "outstanding", label: "Outstanding", className: "text-[#dc2626]" },
];

/** Frame "Supplier Ledger — Detail View": supplier identity and backend-calculated totals. */
function LedgerSummaryCard({ supplier, totals }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-[#e0e0e0] bg-surface px-5 py-[17px] md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-[54px] shrink-0 place-items-center rounded-lg bg-[#fdedec] text-[21px] font-bold text-[#dc2626]"
        >
          {supplier.initials ?? initialsFor(supplier.name)}
        </span>
        <div className="min-w-0">
          <h2 className="text-[18px] font-bold leading-6 text-[#1b2631]">
            {supplier.name}{" "}
            {supplier.code && <span className="text-[13px] font-normal text-[#9ca3af]">({supplier.code})</span>}
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4 text-[#4b5563]">
            <MetaItem label="GSTIN" value={supplier.gstin} />
            <span aria-hidden="true" className="hidden h-3 w-px bg-[#e0e0e0] sm:block" />
            <MetaItem label="PAN" value={supplier.pan} />
            <span aria-hidden="true" className="hidden h-3 w-px bg-[#e0e0e0] sm:block" />
            <MetaItem label="Terms" value={supplier.paymentTermsLabel} />
          </p>
        </div>
      </div>

      <dl className="grid shrink-0 grid-cols-3 gap-6 border-t border-[#e0e0e0] pt-3 md:flex md:border-0 md:pt-0">
        {TOTALS.map((total) => (
          <div key={total.key}>
            <dt className="text-[11px] uppercase leading-[14px] text-[#9ca3af]">{total.label}</dt>
            <dd className={`mt-[5px] text-[18px] font-bold leading-6 sm:text-[18px] ${total.className}`}>
              {formatInrCompact(totals?.[total.key], { unit: "cr", fractionDigits: 2 })}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default LedgerSummaryCard;
