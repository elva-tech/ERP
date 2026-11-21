import React, { useState, useEffect, useMemo } from "react";
import Modal from "../../../components/ui/Modal.jsx";
import { Scale, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { warehouseService } from "../../warehouses/services/warehouseService.js";

const ASSIGNED_TEAMS = [
  "Team Alpha (Store Keepers)",
  "Team Beta (Audit Crew)",
  "Internal Audit Dept",
  "Mr. Suresh Patil (Chief Store Keeper)",
];

export default function StartReconciliationModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  warehouses = [],
  items = [],
  existingRecords = [],
}) {
  const defaultWarehouseId = warehouses[0]?.id || "";
  const defaultItemId = items[0]?.id || "";

  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [itemId, setItemId] = useState(defaultItemId);
  const [actualQtyStr, setActualQtyStr] = useState("");
  const [reconciliationDate, setReconciliationDate] = useState(
    new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  );
  const [assignedTo, setAssignedTo] = useState(ASSIGNED_TEAMS[0]);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState(null);
  const [warehouseStockMap, setWarehouseStockMap] = useState({});

  // When warehouses/items become available, ensure defaults
  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
    if (!itemId && items.length > 0) {
      setItemId(items[0].id);
    }
  }, [warehouses, items, warehouseId, itemId]);

  // Selected item object
  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === itemId) || items[0] || null;
  }, [items, itemId]);

  // Fetch real-time warehouse stock balance for the selected warehouse
  useEffect(() => {
    let isCancelled = false;
    async function loadWarehouseStock() {
      if (!warehouseId) {
        setWarehouseStockMap({});
        return;
      }
      try {
        const res = await warehouseService.getWarehouseById(warehouseId);
        if (!isCancelled) {
          const stored = res?.data?.itemsStored || res?.itemsStored || [];
          const map = {};
          stored.forEach((entry) => {
            map[entry.id] = entry.quantity;
          });
          setWarehouseStockMap(map);
        }
      } catch {
        if (!isCancelled) setWarehouseStockMap({});
      }
    }
    loadWarehouseStock();
    return () => {
      isCancelled = true;
    };
  }, [warehouseId]);

  // Authoritative System Quantity: from selected warehouse balance if available, fallback to item stock
  const systemQuantity = useMemo(() => {
    if (!selectedItem) return 0;
    if (warehouseStockMap[selectedItem.id] !== undefined) {
      return Number(warehouseStockMap[selectedItem.id] ?? 0);
    }
    return Number(selectedItem.currentStock ?? 0);
  }, [selectedItem, warehouseStockMap]);

  // Duplicate prevention check: check if an unadjusted reconciliation exists for item in warehouse
  const existingPendingRec = useMemo(() => {
    if (!warehouseId || !selectedItem) return null;
    return existingRecords.find(
      (r) =>
        r.warehouseId === warehouseId &&
        (r.itemId === selectedItem.id || r.itemCode === selectedItem.itemCode) &&
        r.status !== "Adjusted"
    );
  }, [existingRecords, warehouseId, selectedItem]);

  // Numeric Actual Present Quantity
  const actualPresentQuantity = useMemo(() => {
    if (actualQtyStr === "") return null;
    const num = Number(actualQtyStr);
    return isNaN(num) ? null : num;
  }, [actualQtyStr]);

  // Difference = Actual Present Quantity - System Quantity
  // Positive = surplus, Negative = shortage, 0 = matched / no discrepancy
  const difference = useMemo(() => {
    if (actualPresentQuantity === null) return null;
    return actualPresentQuantity - systemQuantity;
  }, [actualPresentQuantity, systemQuantity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (existingPendingRec) {
      setError(`A pending reconciliation already exists for ${selectedItem?.itemName || "this item"} at the selected warehouse.`);
      return;
    }
    setError(null);

    if (!warehouseId) {
      setError("Please select a warehouse location.");
      return;
    }
    if (!itemId) {
      setError("Please select an inventory item.");
      return;
    }
    if (actualPresentQuantity === null || isNaN(actualPresentQuantity) || actualPresentQuantity < 0) {
      setError("Actual Present Quantity must be a valid non-negative number (0 or greater).");
      return;
    }

    try {
      await onSubmit({
        warehouseId,
        itemId,
        systemQuantity,
        actualPresentQuantity,
        difference,
        reconciliationDate,
        assignedTo,
        remarks,
      });
    } catch (err) {
      setError(err.message || "Failed to start reconciliation. Please retry.");
    }
  };

  if (!isOpen) return null;

  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);

  return (
    <Modal
      onClose={onClose}
      title="Start Stock Reconciliation"
      description="Compare physical stock with system balances and calculate discrepancy before adjustment"
      width="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 text-xs text-danger rounded-lg flex items-center gap-2 font-medium"
          >
            <AlertCircle size={15} className="shrink-0 text-danger" />
            <span>{error}</span>
          </div>
        )}

        {existingPendingRec && (
          <div
            role="alert"
            className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 rounded-lg flex items-center gap-2 font-medium"
          >
            <AlertCircle size={15} className="shrink-0 text-amber-600" />
            <span>
              A pending reconciliation record ({existingPendingRec.id} • {existingPendingRec.status}) is already active
              for {selectedItem?.itemName} at {selectedWarehouse?.name || "this warehouse"}. Please adjust or resolve it first.
            </span>
          </div>
        )}

        {/* Row 1: Warehouse & Item Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reconcileWarehouseId" className="block text-xs font-semibold text-ink mb-1.5">
              Warehouse Location <span className="text-brand">*</span>
            </label>
            <select
              id="reconcileWarehouseId"
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reconcileItemId" className="block text-xs font-semibold text-ink mb-1.5">
              Select Item <span className="text-brand">*</span>
            </label>
            <select
              id="reconcileItemId"
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.itemCode} • {i.itemName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Read-Only System Qty & Editable Actual Present Qty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="systemQuantity" className="block text-xs font-semibold text-ink mb-1.5">
              System Quantity <span className="text-muted font-normal">(Authoritative in WH)</span>
            </label>
            <div className="relative">
              <input
                id="systemQuantity"
                type="text"
                readOnly
                disabled
                value={`${systemQuantity.toLocaleString()} ${selectedItem?.unit || "units"}`}
                className="w-full px-3.5 py-2 text-sm bg-workspace border border-field-line rounded-lg font-semibold text-ink cursor-not-allowed"
                title="Authoritative recorded balance from system database"
              />
            </div>
            <p className="text-[11px] text-muted mt-1">
              Refreshed automatically for {selectedWarehouse?.name || "selected warehouse"}
            </p>
          </div>

          <div>
            <label htmlFor="actualPresentQuantity" className="block text-xs font-semibold text-ink mb-1.5">
              Actual Present Quantity <span className="text-brand">*</span>
            </label>
            <input
              id="actualPresentQuantity"
              type="number"
              min="0"
              step="any"
              placeholder={`e.g. ${systemQuantity}`}
              value={actualQtyStr}
              onChange={(e) => {
                setActualQtyStr(e.target.value);
                setError(null);
              }}
              required
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy font-semibold text-ink"
            />
            <p className="text-[11px] text-muted mt-1">Physically counted quantity on hand</p>
          </div>
        </div>

        {/* Calculated Difference Display Before Submission */}
        {difference !== null && (
          <div
            className={`p-3.5 rounded-lg border flex items-center justify-between transition-colors ${
              difference > 0
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : difference < 0
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {difference > 0 ? (
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <TrendingUp size={16} />
                </div>
              ) : difference < 0 ? (
                <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <TrendingDown size={16} />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <CheckCircle size={16} />
                </div>
              )}
              <div>
                <span className="text-xs font-medium uppercase tracking-wider block opacity-75">
                  Calculated Discrepancy (Actual - System)
                </span>
                <span className="text-sm font-bold">
                  {difference > 0
                    ? `+${difference.toLocaleString()} ${selectedItem?.unit || "units"} (Surplus)`
                    : difference < 0
                    ? `${difference.toLocaleString()} ${selectedItem?.unit || "units"} (Shortage)`
                    : `0 ${selectedItem?.unit || "units"} (Matched / No Discrepancy)`}
                </span>
              </div>
            </div>

            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                difference > 0
                  ? "bg-emerald-200/70 text-emerald-900"
                  : difference < 0
                  ? "bg-rose-200/70 text-rose-900"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {difference > 0 ? "SURPLUS" : difference < 0 ? "SHORTAGE" : "MATCHED"}
            </span>
          </div>
        )}

        {/* Row 3: Date & Assigned Auditor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reconcileDate" className="block text-xs font-semibold text-ink mb-1.5">
              Reconciliation Date <span className="text-brand">*</span>
            </label>
            <input
              id="reconcileDate"
              type="text"
              value={reconciliationDate}
              onChange={(e) => setReconciliationDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            />
          </div>

          <div>
            <label htmlFor="reconcileAssignedTo" className="block text-xs font-semibold text-ink mb-1.5">
              Assigned Auditor / Team <span className="text-brand">*</span>
            </label>
            <select
              id="reconcileAssignedTo"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            >
              {ASSIGNED_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label htmlFor="reconcileRemarks" className="block text-xs font-semibold text-ink mb-1.5">
            Audit Remarks / Discrepancy Reason
          </label>
          <textarea
            id="reconcileRemarks"
            rows={2}
            placeholder="Add counting notes, cycle audit observations, or damage reason"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-field-line">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-ink bg-surface border border-line rounded-lg hover:bg-workspace transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || Boolean(existingPendingRec)}
            title={existingPendingRec ? "Pending reconciliation already exists" : "Record Reconciliation"}
            className="px-6 py-2 text-sm font-semibold text-white bg-[#1b3858] hover:bg-[#142c46] rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Recording..." : "Record Reconciliation"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
