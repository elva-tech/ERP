import DataTable from "../../../components/ui/DataTable.jsx";
import { displayText, formatDate, formatInrCompact } from "../../../lib/formatters.js";

const ZERO_AMOUNT = /^-?0*(\.0*)?$/;
const crore = (amount) =>
  ZERO_AMOUNT.test(String(amount ?? "").trim()) && amount !== "" && amount != null
    ? "₹0.00"
    : formatInrCompact(amount, { unit: "cr", fractionDigits: 2 });

const COLUMNS = [
  { key: "date", header: "Date", width: "116px", headerClass: "pl-4", cellClass: "pl-4 text-[#4b5563]", render: (e) => formatDate(e.documentDate) },
  { key: "voucher", header: "Voucher No", width: "120px", cellClass: "font-bold text-[#1b2631]", render: (e) => displayText(e.voucherNumber) },
  { key: "type", header: "Type", width: "100px", cellClass: "text-[#4b5563]", render: (e) => displayText(e.voucherTypeLabel ?? e.voucherType) },
  { key: "narration", header: "Reference / Narration", cellClass: "text-[#4b5563]", render: (e) => displayText(e.description) },
  { key: "debit", header: "Debit (Payment)", width: "130px", align: "right", cellClass: "text-[#27ae60]", render: (e) => crore(e.debitAmount ?? "0") },
  { key: "credit", header: "Credit (Purchase)", width: "120px", align: "right", cellClass: "text-[#dc2626]", render: (e) => crore(e.creditAmount ?? "0") },
  {
    key: "balance",
    header: "Running Balance",
    width: "157px",
    align: "right",
    headerClass: "pr-4",
    cellClass: "pr-4 font-bold text-[#1b2631]",
    render: (e) => crore(e.runningBalance),
  },
];

/** Frame "Supplier Ledger — Detail View" statement table (older visual palette, kept as designed). */
function LedgerStatementTable({ entries, statementPeriodLabel, resource }) {
  return (
    <section className="rounded-lg border border-[#e0e0e0] bg-surface px-5 pb-5 pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold leading-[26px] text-[#1b2631]">Transaction Ledger Statement</h2>
        {statementPeriodLabel && (
          <span className="rounded bg-[#f2f4f4] px-3.5 py-[5px] text-[12px] font-semibold leading-4 text-[#4b5563]">
            Statement Period: {statementPeriodLabel}
          </span>
        )}
      </div>
      <DataTable
        caption="Transaction ledger statement"
        columns={COLUMNS}
        rows={entries}
        getRowKey={(entry) => entry.id}
        resource={resource}
        minWidth={1000}
        headerRowClass="border-b-0 bg-[#f2f4f4]"
        headerCellClass="h-[39px] text-[12px] font-semibold leading-4 text-[#4b5563]"
        bodyCellClass="h-10 text-[13px] leading-4"
        rowClass="border-b border-[#e0e0e0]"
        emptyTitle="No statement entries"
      />
    </section>
  );
}

export default LedgerStatementTable;
