import { useCallback, useEffect } from "react";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/AsyncState.jsx";
import { useAsyncResource } from "../hooks/useAsyncResource.js";
import LedgerStatementTable from "../features/supplier-ledger/components/LedgerStatementTable.jsx";
import LedgerSummaryCard from "../features/supplier-ledger/components/LedgerSummaryCard.jsx";
import { getSupplierStatement } from "../features/supplier-ledger/supplierLedgerService.js";

function SupplierLedgerDetailPage({ route, onHeaderAdornmentChange }) {
  const supplierId = route.query.get("supplierId") ?? "";
  const load = useCallback((signal) => getSupplierStatement({ supplierId }, signal), [supplierId]);
  const statement = useAsyncResource(load, supplierId, { enabled: Boolean(supplierId) });
  const financialYearLabel = statement.status === "success" ? statement.data.financialYearLabel : null;

  useEffect(() => {
    onHeaderAdornmentChange(financialYearLabel);
    return () => onHeaderAdornmentChange(null);
  }, [financialYearLabel, onHeaderAdornmentChange]);

  if (!supplierId) {
    return (
      <div className="rounded-lg border border-[#e0e0e0] bg-surface">
        <EmptyState
          title="No supplier selected"
          message="Open this statement with a supplier identifier, for example from the Supplier Ledger."
        />
      </div>
    );
  }

  if (statement.status !== "success") {
    return (
      <div className="rounded-lg border border-[#e0e0e0] bg-surface">
        {statement.status === "error" ? (
          <ErrorState error={statement.error} onRetry={statement.reload} />
        ) : (
          <LoadingState label="Loading statement…" />
        )}
      </div>
    );
  }

  const { supplier, totals, statementPeriodLabel, items = [] } = statement.data;
  return (
    <div className="flex flex-col gap-6">
      <LedgerSummaryCard supplier={supplier} totals={totals} />
      <LedgerStatementTable entries={items} statementPeriodLabel={statementPeriodLabel} resource={statement} />
    </div>
  );
}

export default SupplierLedgerDetailPage;
