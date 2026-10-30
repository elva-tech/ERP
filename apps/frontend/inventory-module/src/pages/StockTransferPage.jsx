import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Truck, ArrowRight, CheckCircle2, Clock, Search, Layers, ArrowLeftRight } from "lucide-react";
import { transferService } from "../features/transfers/services/transferService.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";
import { itemService } from "../features/items/services/itemService.js";
import CreateTransferModal from "../features/transfers/components/CreateTransferModal.jsx";
import Badge from "../components/ui/Badge.jsx";

export default function StockTransferPage({ onShowToast }) {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [trfRes, whRes, itmRes] = await Promise.all([
        transferService.getTransfers(),
        warehouseService.getWarehouses(),
        itemService.getItems(),
      ]);
      setTransfers(trfRes.data || []);
      setWarehouses(whRes.data || []);
      setItems(itmRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load stock transfers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTransfer = async (transferData) => {
    try {
      setIsSubmitting(true);
      await transferService.createTransfer(transferData);
      setIsModalOpen(false);
      onShowToast && onShowToast("Stock transfer initiated successfully!", "success");
      fetchData();
    } catch (err) {
      onShowToast && onShowToast(err.message || "Failed to create transfer", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchStatus = selectedStatus === "all" || t.status.toLowerCase() === selectedStatus.toLowerCase();
      const matchSearch =
        (t.transferNo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.fromWarehouseName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.toWarehouseName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.reason || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [transfers, selectedStatus, searchQuery]);

  const kpis = useMemo(() => {
    const inTransit = transfers.filter((t) => t.status === "In Transit").length;
    const received = transfers.filter((t) => t.status === "Received").length;
    const draft = transfers.filter((t) => t.status === "Draft" || t.status === "Pending").length;
    return { inTransit, received, draft };
  }, [transfers]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="sr-only">Stock Transfer</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            Inter-warehouse stock movements, transit tracking, and replenishment
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Transfer
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">In Transit</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {kpis.inTransit} <span className="text-xs font-normal text-slate-500">transfers active</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">Dispatched and en route to destination</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Received This Month</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {kpis.received} <span className="text-xs font-normal text-slate-500">completed</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">Stock acknowledged and inwarded</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Pending / Draft</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-ink">
            {kpis.draft} <span className="text-xs font-normal text-slate-500">orders</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">Awaiting dispatch approval</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search transfer no, warehouse, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-ink-muted uppercase">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          >
            <option value="all">All Transfers</option>
            <option value="In Transit">In Transit</option>
            <option value="Received">Received</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Transfers List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-ink text-sm">Transfer History</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {filteredTransfers.length} records
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-muted">Loading stock transfers...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50/50 m-4 rounded-lg">{error}</div>
        ) : filteredTransfers.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">No stock transfers match the current criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-ink-muted">
                <tr>
                  <th className="py-3 px-4">Transfer ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Origin & Destination</th>
                  <th className="py-3 px-4">Items / Details</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono font-medium text-xs text-brand-primary">
                      {t.transferNo}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-ink-secondary whitespace-nowrap">
                      {t.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-medium text-ink">{t.fromWarehouseName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-brand-primary">{t.toWarehouseName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-medium text-ink">
                        {t.lineItems?.length ? `${t.lineItems.length} distinct item(s)` : `${t.itemsCount || 0} items`}
                      </div>
                      {t.lineItems && t.lineItems.length > 0 && (
                        <div className="text-[11px] text-ink-muted truncate max-w-xs">
                          {t.lineItems[0].itemName || t.lineItems[0].itemId} ({t.lineItems[0].quantity} units)
                          {t.lineItems.length > 1 && ` +${t.lineItems.length - 1} more`}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-ink-muted max-w-xs truncate">
                      {t.reason || "Inter-warehouse stock transfer"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          t.status === "Received"
                            ? "success"
                            : t.status === "In Transit"
                            ? "warning"
                            : "default"
                        }
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {t.status === "In Transit" ? (
                        <button
                          onClick={() => {
                            onShowToast && onShowToast(`Transfer ${t.transferNo} receipt confirmed!`, "success");
                            setTransfers((prev) =>
                              prev.map((item) => (item.id === t.id ? { ...item, status: "Received" } : item))
                            );
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-200 transition"
                        >
                          Mark Received
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateTransferModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTransfer}
        isSubmitting={isSubmitting}
        warehouses={warehouses}
        items={items}
      />
    </div>
  );
}

