import React, { useState, useEffect, useMemo } from "react";
import Modal from "../../../components/ui/Modal.jsx";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { warehouseService } from "../../warehouses/services/warehouseService.js";

export default function CreateTransferModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  warehouses = [],
  items = [],
}) {
  const defaultFrom = warehouses[0]?.id || "";
  const defaultTo = warehouses.length > 1 ? warehouses[1]?.id : "";

  const [formData, setFormData] = useState({
    fromWarehouseId: defaultFrom,
    toWarehouseId: defaultTo,
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    reason: "Replenishment for project requirement",
    lineItems: [{ itemId: items[0]?.id || "", quantity: 10 }],
  });

  const [sourceStockMap, setSourceStockMap] = useState({});
  const [generalError, setGeneralError] = useState(null);

  // Synchronize initial selections when warehouses or items arrive
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => {
        const fromWh = prev.fromWarehouseId || warehouses[0]?.id || "";
        const toWh =
          prev.toWarehouseId && prev.toWarehouseId !== fromWh
            ? prev.toWarehouseId
            : warehouses.find((w) => w.id !== fromWh)?.id || "";
        const firstItem = items[0]?.id || "";
        const lineItems = prev.lineItems?.length
          ? prev.lineItems.map((line) => ({
              ...line,
              itemId: line.itemId || firstItem,
            }))
          : [{ itemId: firstItem, quantity: 10 }];
        return {
          ...prev,
          fromWarehouseId: fromWh,
          toWarehouseId: toWh,
          lineItems,
        };
      });
      setGeneralError(null);
    }
  }, [isOpen, warehouses, items]);

  // Fetch real-time available stock for the selected source warehouse
  useEffect(() => {
    let isCancelled = false;
    async function loadWarehouseStock() {
      if (!formData.fromWarehouseId) {
        setSourceStockMap({});
        return;
      }
      try {
        const res = await warehouseService.getWarehouseById(formData.fromWarehouseId);
        if (!isCancelled) {
          const stored = res?.data?.itemsStored || res?.itemsStored || [];
          const map = {};
          stored.forEach((entry) => {
            map[entry.id] = entry.quantity;
          });
          setSourceStockMap(map);
        }
      } catch {
        if (!isCancelled) setSourceStockMap({});
      }
    }
    loadWarehouseStock();
    return () => {
      isCancelled = true;
    };
  }, [formData.fromWarehouseId]);

  // Immediate validation: source and destination cannot be identical
  const isSameLocation = useMemo(() => {
    return Boolean(
      formData.fromWarehouseId &&
        formData.toWarehouseId &&
        formData.fromWarehouseId === formData.toWarehouseId
    );
  }, [formData.fromWarehouseId, formData.toWarehouseId]);

  const locationError = isSameLocation
    ? "Source and destination warehouses cannot be the same location."
    : null;

  // Stock availability validation per line item
  const stockErrors = useMemo(() => {
    const errors = {};
    formData.lineItems.forEach((line, idx) => {
      if (line.itemId && sourceStockMap[line.itemId] !== undefined) {
        const available = sourceStockMap[line.itemId];
        const requested = Number(line.quantity);
        if (requested > available) {
          errors[idx] = `Requested quantity exceeds available stock (${available.toLocaleString()} units) in source warehouse.`;
        }
      }
    });
    return errors;
  }, [formData.lineItems, sourceStockMap]);

  const hasStockError = Object.keys(stockErrors).length > 0;

  const handleLineChange = (index, field, value) => {
    const updated = [...formData.lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, lineItems: updated }));
    setGeneralError(null);
  };

  const addLine = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { itemId: items[0]?.id || "", quantity: 10 },
      ],
    }));
  };

  const removeLine = (index) => {
    if (formData.lineItems.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSameLocation) {
      return;
    }
    if (hasStockError) {
      setGeneralError("One or more items exceed available stock at the source warehouse.");
      return;
    }
    setGeneralError(null);
    try {
      await onSubmit({
        ...formData,
        lineItems: formData.lineItems.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
        })),
      });
    } catch (err) {
      setGeneralError(err.message || "Failed to create stock transfer. Please retry.");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      onClose={onClose}
      title="Create Stock Transfer"
      description="Transfer items between warehouses with complete movement traceability and stock validation"
      width="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 text-xs text-danger rounded-lg flex items-center gap-2 font-medium"
          >
            <AlertCircle size={15} className="shrink-0 text-danger" />
            <span>{generalError}</span>
          </div>
        )}

        {locationError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 text-xs text-danger rounded-lg flex items-center gap-2 font-medium"
          >
            <AlertCircle size={15} className="shrink-0 text-danger" />
            <span>{locationError}</span>
          </div>
        )}

        {/* Row 1: From WH & To WH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fromWarehouseId" className="block text-xs font-semibold text-ink mb-1.5">
              From Warehouse <span className="text-brand">*</span>
            </label>
            <select
              id="fromWarehouseId"
              value={formData.fromWarehouseId}
              onChange={(e) => {
                setFormData((p) => ({ ...p, fromWarehouseId: e.target.value }));
                setGeneralError(null);
              }}
              className={`w-full px-3.5 py-2 text-sm bg-field border rounded-lg focus:outline-none focus:ring-1 ${
                isSameLocation ? "border-danger ring-1 ring-danger/30" : "border-field-line focus:border-navy"
              }`}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="toWarehouseId" className="block text-xs font-semibold text-ink mb-1.5">
              To Warehouse <span className="text-brand">*</span>
            </label>
            <select
              id="toWarehouseId"
              value={formData.toWarehouseId}
              onChange={(e) => {
                setFormData((p) => ({ ...p, toWarehouseId: e.target.value }));
                setGeneralError(null);
              }}
              className={`w-full px-3.5 py-2 text-sm bg-field border rounded-lg focus:outline-none focus:ring-1 ${
                isSameLocation ? "border-danger ring-1 ring-danger/30" : "border-field-line focus:border-navy"
              }`}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Date & Reason */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="transferDate" className="block text-xs font-semibold text-ink mb-1.5">
              Date <span className="text-brand">*</span>
            </label>
            <input
              id="transferDate"
              type="text"
              value={formData.date}
              onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            />
          </div>

          <div>
            <label htmlFor="transferReason" className="block text-xs font-semibold text-ink mb-1.5">
              Reason <span className="text-brand">*</span>
            </label>
            <input
              id="transferReason"
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData((p) => ({ ...p, reason: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-field border border-field-line rounded-lg focus:outline-none focus:ring-1 focus:border-navy"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-ink">Line Items</label>
          <div className="border border-line rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-workspace border-b border-line text-muted">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Item & Available Source Stock</th>
                  <th className="py-2.5 px-3 font-semibold w-28">Quantity</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {formData.lineItems.map((line, idx) => {
                  const stock = sourceStockMap[line.itemId];
                  const hasErr = Boolean(stockErrors[idx]);
                  return (
                    <tr key={idx}>
                      <td className="p-2">
                        <select
                          aria-label={`Transfer Item Row ${idx + 1}`}
                          value={line.itemId}
                          onChange={(e) => handleLineChange(idx, "itemId", e.target.value)}
                          className="w-full p-1.5 text-xs bg-field border border-field-line rounded focus:outline-none focus:border-navy"
                        >
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.itemCode} • {it.itemName}
                            </option>
                          ))}
                        </select>
                        {stock !== undefined && (
                          <span className="text-[10px] text-muted block mt-0.5">
                            Available in source WH: <strong className="text-ink">{stock.toLocaleString()} units</strong>
                          </span>
                        )}
                        {hasErr && (
                          <p className="text-[11px] text-danger font-medium mt-0.5">{stockErrors[idx]}</p>
                        )}
                      </td>
                      <td className="p-2 align-top">
                        <input
                          type="number"
                          min="1"
                          aria-label={`Transfer Quantity Row ${idx + 1}`}
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, "quantity", e.target.value)}
                          className={`w-full p-1.5 text-xs bg-field border rounded focus:outline-none ${
                            hasErr ? "border-danger ring-1 ring-danger/30" : "border-field-line focus:border-navy"
                          }`}
                        />
                      </td>
                      <td className="p-2 text-center align-top pt-3">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={formData.lineItems.length <= 1}
                          className="text-muted hover:text-danger disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-action-navy hover:text-blue-700 hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add row</span>
          </button>
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
            disabled={isSubmitting || isSameLocation || hasStockError}
            title={
              isSameLocation
                ? "Cannot transfer to same location"
                : hasStockError
                ? "Insufficient stock in source warehouse"
                : "Create Transfer"
            }
            className="px-6 py-2 text-sm font-semibold text-white bg-[#1b3858] hover:bg-[#142c46] rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Transfer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
