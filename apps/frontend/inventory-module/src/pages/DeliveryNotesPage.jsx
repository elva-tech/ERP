import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Truck, Search, Eye, FileText, CheckCircle2, Clock, AlertCircle, MapPin, Phone } from "lucide-react";
import { deliveryNoteService } from "../features/delivery-notes/services/deliveryNoteService.js";
import { invoiceService } from "../features/invoices/services/invoiceService.js";
import { warehouseService } from "../features/warehouses/services/warehouseService.js";
import CreateDeliveryNoteModal from "../features/delivery-notes/components/CreateDeliveryNoteModal.jsx";
import Badge from "../components/ui/Badge.jsx";

export default function DeliveryNotesPage({ onShowToast }) {
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dnRes, invRes, whRes] = await Promise.all([
        deliveryNoteService.getDeliveryNotes(),
        invoiceService.getInvoices(),
        warehouseService.getWarehouses(),
      ]);
      const notes = dnRes.data || [];
      setDeliveryNotes(notes);
      setInvoices(invRes.data || []);
      setWarehouses(whRes.data || []);
      if (notes.length > 0 && !selectedNote) {
        setSelectedNote(notes[0]);
      }
    } catch (err) {
      setError(err.message || "Failed to load delivery notes");
    } finally {
      setLoading(false);
    }
  }, [selectedNote]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateDN = async (dnData) => {
    try {
      setIsSubmitting(true);
      await deliveryNoteService.createDeliveryNote(dnData);
      setIsModalOpen(false);
      onShowToast && onShowToast("Delivery note created and dispatch scheduled!", "success");
      fetchData();
    } catch (err) {
      onShowToast && onShowToast(err.message || "Failed to create delivery note", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDispatched = (dn) => {
    setDeliveryNotes((prev) =>
      prev.map((item) => (item.id === dn.id ? { ...item, status: "Dispatched" } : item))
    );
    if (selectedNote?.id === dn.id) {
      setSelectedNote((prev) => ({ ...prev, status: "Dispatched" }));
    }
    onShowToast && onShowToast(`Delivery Note ${dn.dnNo} marked as dispatched!`, "success");
  };

  const filteredNotes = useMemo(() => {
    return deliveryNotes.filter((dn) => {
      const matchStatus =
        statusFilter === "all" || dn.status.toLowerCase() === statusFilter.toLowerCase();
      const matchSearch =
        (dn.dnNo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dn.customer || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dn.salesInvoiceRef || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dn.vehicleNo || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [deliveryNotes, statusFilter, searchQuery]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="sr-only">Delivery Notes</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            Physical dispatch documentation, warehouse picking lists, and transport tracking
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Delivery Note
        </button>
      </div>

      {/* Integration Boundary Notice */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-blue-950">Integration Workflow & Module Boundaries</span>
          <p className="text-blue-800 leading-relaxed">
            In standard ELVA ERP operations, a Delivery Note records physical fulfillment of sales orders or pre-invoiced shipments.
            Stock is officially decremented upon dispatch confirmation. Financial recognition and tax liabilities remain isolated in the Finance/Sales module.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search DN #, customer, invoice ref, vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-ink-muted uppercase">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Master Table and Detail Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Column */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-ink text-sm">Delivery Note Register</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {filteredNotes.length} notes
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-ink-muted">Loading delivery notes...</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 bg-rose-50/50 m-4 rounded-lg">{error}</div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-12 text-center text-ink-muted">No delivery notes found matching your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-ink-muted">
                  <tr>
                    <th className="py-3 px-4">Note #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer & Reference</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNotes.map((dn) => {
                    const isSelected = selectedNote?.id === dn.id;
                    return (
                      <tr
                        key={dn.id}
                        onClick={() => setSelectedNote(dn)}
                        className={`cursor-pointer transition ${
                          isSelected ? "bg-blue-50/40" : "hover:bg-slate-50/50"
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-medium text-xs text-brand-primary">
                          {dn.dnNo}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-ink-secondary whitespace-nowrap">
                          {dn.date}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-ink text-xs">{dn.customer}</div>
                          <div className="text-[11px] text-ink-muted font-mono">{dn.salesInvoiceRef}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-ink-secondary">
                          {dn.warehouseName}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              dn.status === "Delivered"
                                ? "success"
                                : dn.status === "Dispatched"
                                ? "info"
                                : "warning"
                            }
                          >
                            {dn.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNote(dn);
                            }}
                            className="p-1 text-slate-400 hover:text-brand-primary rounded transition"
                            title="Inspect details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Delivery Note Inspection Panel */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-5">
          {selectedNote ? (
            <>
              <div className="border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-brand-primary bg-blue-50 px-2 py-0.5 rounded">
                    {selectedNote.dnNo}
                  </span>
                  <Badge
                    variant={
                      selectedNote.status === "Delivered"
                        ? "success"
                        : selectedNote.status === "Dispatched"
                        ? "info"
                        : "warning"
                    }
                  >
                    {selectedNote.status}
                  </Badge>
                </div>
                <h4 className="font-bold text-ink text-base mt-2">{selectedNote.customer}</h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  Ref Invoice: <span className="font-mono text-ink-secondary">{selectedNote.salesInvoiceRef}</span> • Date: {selectedNote.date}
                </p>
              </div>

              {/* Logistics Details */}
              <div className="space-y-2.5 text-xs">
                <div className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider">
                  Dispatch & Transport
                </div>
                <div className="flex items-center gap-2 text-ink">
                  <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-ink-secondary">Vehicle:</span>
                  <strong className="font-mono">{selectedNote.vehicleNo || "MH 12 CR 1199"}</strong>
                </div>
                <div className="flex items-center gap-2 text-ink">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-ink-secondary">Transporter:</span>
                  <span>{selectedNote.transporterName || "Apex Express Logistics"}</span>
                </div>
                <div className="flex items-center gap-2 text-ink">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-ink-secondary">Contact:</span>
                  <span>{selectedNote.contactPhone || "+91 98220 55443"}</span>
                </div>
              </div>

              {/* Picking Line Items */}
              <div className="space-y-2">
                <div className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider">
                  Picking Items ({selectedNote.lineItems?.length || 1})
                </div>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                  {(selectedNote.lineItems || [
                    {
                      itemCode: "CBL-1.5-3C",
                      description: "1.5 Sqmm Copper Armoured Cable",
                      pickQty: 250,
                      unit: "Mtr",
                      binLocation: "A-12-04",
                    },
                  ]).map((item, idx) => (
                    <div key={idx} className="py-2 first:pt-0 last:pb-0 text-xs">
                      <div className="flex items-center justify-between font-medium text-ink">
                        <span>{item.description || item.itemName}</span>
                        <span className="font-bold font-mono">{item.pickQty} {item.unit}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-ink-muted mt-0.5">
                        <span className="font-mono">{item.itemCode}</span>
                        <span>Bin: {item.binLocation || "A-01-01"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex flex-col gap-2">
                {selectedNote.status === "Pending" && (
                  <button
                    onClick={() => handleMarkDispatched(selectedNote)}
                    className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm & Dispatch Stock
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="w-full py-2 border border-slate-300 rounded-lg text-xs font-semibold text-ink-secondary bg-white hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Print Delivery Slip
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-ink-muted text-xs">
              Select a delivery note from the table to view dispatch details.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <CreateDeliveryNoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateDN}
        isSubmitting={isSubmitting}
        invoices={invoices}
        warehouses={warehouses}
      />
    </div>
  );
}

