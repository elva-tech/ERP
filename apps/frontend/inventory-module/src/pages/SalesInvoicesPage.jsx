import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, Eye, FileText, ExternalLink, ShieldAlert, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { invoiceService } from "../features/invoices/services/invoiceService.js";
import { itemService } from "../features/items/services/itemService.js";
import CreateInvoiceModal from "../features/invoices/components/CreateInvoiceModal.jsx";
import Badge from "../components/ui/Badge.jsx";

export default function SalesInvoicesPage({ onShowToast }) {
  const [invoices, setInvoices] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
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
      const [invRes, itmRes] = await Promise.all([
        invoiceService.getInvoices(),
        itemService.getItems(),
      ]);
      const data = invRes.data || [];
      setInvoices(data);
      setItems(itmRes.data || []);
      if (data.length > 0 && !selectedInvoice) {
        setSelectedInvoice(data[0]);
      }
    } catch (err) {
      setError(err.message || "Failed to load sales invoices");
    } finally {
      setLoading(false);
    }
  }, [selectedInvoice]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateInvoice = async (invData) => {
    try {
      setIsSubmitting(true);
      await invoiceService.createInvoice(invData);
      setIsModalOpen(false);
      onShowToast && onShowToast("Sales invoice drafted and linked to dispatch!", "success");
      fetchData();
    } catch (err) {
      onShowToast && onShowToast(err.message || "Failed to create invoice", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchStatus =
        statusFilter === "all" || inv.status.toLowerCase() === statusFilter.toLowerCase();
      const matchSearch =
        (inv.invoiceNo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.customer || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.customerGstin || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [invoices, statusFilter, searchQuery]);

  const formatCurrency = (val) => {
    return "₹" + Number(val || 0).toLocaleString("en-IN");
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="sr-only">Sales Invoices</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            Reference invoice register linked to dispatch orders and billing verification
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Finance Module Domain Boundary Warning */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-amber-950">
            Domain Boundary Notice: Finance & Accounts Ownership
          </span>
          <p className="text-amber-800 leading-relaxed">
            PROPOSED — BACKEND/PRODUCT CONFIRMATION REQUIRED. Sales Invoices displayed here serve as inventory dispatch references.
            Official general ledger postings, GST liabilities, and debtor accounts are managed by the ELVA Finance Module.
            Stock deduction is executed via Delivery Notes to prevent duplicate balance postings.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, customer name, GSTIN..."
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
            <option value="all">All Invoices</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Master List & Selected Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoices List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-ink text-sm">Invoice Records</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {filteredInvoices.length} invoices
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-ink-muted">Loading invoices...</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 bg-rose-50/50 m-4 rounded-lg">{error}</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-ink-muted">No sales invoices match your query.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-ink-muted">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => {
                    const isSelected = selectedInvoice?.id === inv.id;
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => setSelectedInvoice(inv)}
                        className={`cursor-pointer transition ${
                          isSelected ? "bg-blue-50/40" : "hover:bg-slate-50/50"
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-medium text-xs text-brand-primary">
                          {inv.invoiceNo}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-ink-secondary whitespace-nowrap">
                          {inv.date}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-ink text-xs">{inv.customer}</div>
                          <div className="text-[11px] text-ink-muted font-mono">{inv.customerGstin}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-xs text-ink">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              inv.status === "Paid"
                                ? "success"
                                : inv.status === "Pending"
                                ? "warning"
                                : "danger"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoice(inv);
                            }}
                            className="p-1 text-slate-400 hover:text-brand-primary rounded transition"
                            title="View details"
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

        {/* Selected Invoice Details View */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-5">
          {selectedInvoice ? (
            <>
              <div className="border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-brand-primary bg-blue-50 px-2 py-0.5 rounded">
                    {selectedInvoice.invoiceNo}
                  </span>
                  <Badge
                    variant={
                      selectedInvoice.status === "Paid"
                        ? "success"
                        : selectedInvoice.status === "Pending"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {selectedInvoice.status}
                  </Badge>
                </div>
                <h4 className="font-bold text-ink text-base mt-2">{selectedInvoice.customer}</h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  GSTIN: <span className="font-mono text-ink-secondary">{selectedInvoice.customerGstin}</span>
                </p>
                <p className="text-xs text-ink-muted">
                  Terms: {selectedInvoice.paymentTerms || "Net 30"} • Due: {selectedInvoice.dueDate}
                </p>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2">
                <div className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider">
                  Billed Items ({selectedInvoice.lineItems?.length || 1})
                </div>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                  {(selectedInvoice.lineItems || [
                    {
                      itemCode: "CBL-1.5-3C",
                      description: "Copper Cable",
                      qty: 600,
                      rate: 186,
                      amount: 111600,
                    },
                  ]).map((item, idx) => (
                    <div key={idx} className="py-2 first:pt-0 last:pb-0 text-xs">
                      <div className="flex items-center justify-between font-medium text-ink">
                        <span>{item.description || item.itemName}</span>
                        <span className="font-bold font-mono">{formatCurrency(item.amount || item.qty * item.rate)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-ink-muted mt-0.5">
                        <span className="font-mono">{item.itemCode || "ITEM-01"}</span>
                        <span>{item.qty} units @ ₹{item.rate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1.5 text-xs border-t border-slate-200 pt-3">
                <div className="flex justify-between text-ink-muted">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.subtotal || selectedInvoice.totalAmount * 0.85)}</span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>Taxes (GST 18%):</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.taxAmount || selectedInvoice.totalAmount * 0.15)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-ink border-t border-slate-100 pt-2">
                  <span>Grand Total:</span>
                  <span className="font-mono text-brand-primary">{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => window.print()}
                  className="w-full py-2 border border-slate-300 rounded-lg text-xs font-semibold text-ink-secondary bg-white hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Print Tax Invoice Slip
                </button>
                <button
                  onClick={() =>
                    onShowToast &&
                    onShowToast("Opening invoice in ELVA Finance Module (finance.elva.internal)...", "neutral")
                  }
                  className="w-full py-2 bg-slate-100 text-ink-secondary hover:bg-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  View in Finance Module
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-ink-muted text-xs">
              Select an invoice from the table to view billing details.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <CreateInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateInvoice}
        isSubmitting={isSubmitting}
        items={items}
      />
    </div>
  );
}

