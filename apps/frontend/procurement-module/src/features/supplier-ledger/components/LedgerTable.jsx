import DataTable from "../../../components/ui/DataTable.jsx";
import { viewColumn } from "../../../components/ui/viewColumn.js";
import { displayText, formatDate, formatInr } from "../../../lib/formatters.js";

function balanceText(entry) {
  const amount = formatInr(entry.runningBalance);
  return entry.runningBalanceSide ? `${amount} ${entry.runningBalanceSide === "cr" ? "Cr" : "Dr"}` : amount;
}

const COLUMNS = [
  { key: "date", header: "Date", width: "100px", render: (e) => formatDate(e.documentDate) },
  { key: "voucher", header: "Voucher No", width: "130px", cellClass: "font-bold text-navy", render: (e) => displayText(e.voucherNumber) },
  { key: "description", header: "Description", cellClass: "text-ink", render: (e) => displayText(e.description) },
  {
    key: "debit",
    header: "Debit (₹)",
    width: "130px",
    align: "right",
    render: (e) =>
      e.debitAmount ? <span className="text-success">{formatInr(e.debitAmount)}</span> : <span className="text-muted">—</span>,
  },
  {
    key: "credit",
    header: "Credit (₹)",
    width: "130px",
    align: "right",
    render: (e) =>
      e.creditAmount ? <span className="text-brand">{formatInr(e.creditAmount)}</span> : <span className="text-muted">—</span>,
  },
  { key: "balance", header: "Running Balance (₹)", width: "150px", align: "right", cellClass: "font-bold text-ink", render: balanceText },
  viewColumn((e) => e.sourceDocument?.type, (e) => e.sourceDocument?.id, (e) => e.voucherNumber),
];

function LedgerTable({ entries, resource }) {
  return (
    <DataTable
      caption="Supplier ledger transactions"
      columns={COLUMNS}
      rows={entries}
      getRowKey={(entry) => entry.id}
      resource={resource}
      headerCellClass="h-[29px] text-[11.5px] font-semibold leading-4 text-muted"
      bodyCellClass="h-[31px] text-[12px] leading-4"
      emptyTitle="No transactions in this period"
    />
  );
}

export default LedgerTable;
