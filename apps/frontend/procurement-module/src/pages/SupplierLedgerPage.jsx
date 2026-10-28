import { useCallback, useState } from "react";
import { EmptyState, ErrorState } from "../components/ui/AsyncState.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { ROUTES } from "../config/navigation.js";
import { useAsyncResource } from "../hooks/useAsyncResource.js";
import { useLookupOptions } from "../hooks/useLookupOptions.js";
import { downloadFile } from "../lib/downloadFile.js";
import { formatInr } from "../lib/formatters.js";
import LedgerTable from "../features/supplier-ledger/components/LedgerTable.jsx";
import LedgerToolbar from "../features/supplier-ledger/components/LedgerToolbar.jsx";
import { exportSupplierLedger, getSupplierLedger } from "../features/supplier-ledger/supplierLedgerService.js";
import { normalizePage } from "../lib/apiTypes.js";

const LEDGER_PAGE_SIZE = 20;

const SUMMARY_CARDS = [
  { key: "openingBalance", label: "Opening Balance", tone: "ink" },
  { key: "totalDebits", label: "Total Debits (Payments)", tone: "success" },
  { key: "totalCredits", label: "Total Credits (Invoices)", tone: "brand" },
  { key: "closingBalance", label: "Closing Balance (Outstanding)", tone: "brand" },
];

function SupplierLedgerPage({ route, onNotify }) {
  const supplierId = route.query.get("supplierId") ?? "";
  const suppliers = useLookupOptions("suppliers");
  const [range, setRange] = useState({ fromDate: "", toDate: "" });
  const [page, setPage] = useState(1);
  const [exportingFormat, setExportingFormat] = useState(null);

  const queryKey = JSON.stringify({ supplierId, ...range, page });
  const load = useCallback(
    (signal) => getSupplierLedger({ ...JSON.parse(queryKey), pageSize: LEDGER_PAGE_SIZE }, signal),
    [queryKey],
  );
  const ledger = useAsyncResource(load, queryKey, { enabled: Boolean(supplierId) });
  const data = ledger.status === "success" ? ledger.data : null;
  const entriesPage = data ? normalizePage(data) : null;

  function handleSupplierChange(nextSupplierId) {
    setPage(1);
    route.navigate(ROUTES.supplierLedger, { supplierId: nextSupplierId });
  }

  function handleRangeChange(nextRange) {
    setPage(1);
    setRange(nextRange);
  }

  async function handleExport(format) {
    setExportingFormat(format);
    try {
      const file = await exportSupplierLedger({ supplierId, ...range, format });
      downloadFile(file, `supplier-ledger.${format}`);
      onNotify(format === "pdf" ? "Ledger PDF generated." : "Ledger exported to Excel.");
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <LedgerToolbar
        supplierId={supplierId}
        supplierLookup={suppliers}
        range={range}
        onSupplierChange={handleSupplierChange}
        onRangeChange={handleRangeChange}
        onExport={handleExport}
        exportingFormat={exportingFormat}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={data ? formatInr(data.summary?.[card.key]) : null}
            tone={card.tone}
            valueClassName="text-[20px]"
          />
        ))}
      </div>

      <Panel className="flex-1 px-[15px] pb-4 pt-4">
        {!supplierId ? (
          <EmptyState title="Select a supplier" message="Choose a supplier above to load its ledger." />
        ) : ledger.status === "error" ? (
          <ErrorState error={ledger.error} onRetry={ledger.reload} />
        ) : (
          <>
            <LedgerTable entries={entriesPage?.items ?? []} resource={ledger} />
            {entriesPage && entriesPage.pagination.totalPages > 1 && (
              <ListFooter
                pagination={entriesPage.pagination}
                itemCount={entriesPage.items.length}
                noun="transactions"
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

export default SupplierLedgerPage;
