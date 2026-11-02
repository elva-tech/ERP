import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Info, Search, RefreshCw, Check, ChevronDown, AlertCircle } from "lucide-react";
import LineItemsEditor from "../../../components/ui/LineItemsEditor.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import FormField from "../../../components/ui/FormField.jsx";
import { SelectField, TextAreaField, TextField } from "../../../components/ui/FormFields.jsx";
import { INPUT_CLASS } from "../../../components/ui/formStyles.js";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { isBlank, isPositiveDecimal } from "../../../lib/validation.js";
import { inwardService } from "../services/inwardService.js";
import { supplierService } from "../../suppliers/services/supplierService.js";

const ID_PREFIX = "inward";
const EMPTY_LINE = { itemId: "", quantity: "", rate: "" };

function formatAmount(item) {
  const quantity = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  if (!quantity || !rate) return "—";
  return `₹${(quantity * rate).toLocaleString("en-IN")}`;
}

function validate(values) {
  const errors = {};
  if (isBlank(values.supplierId) && isBlank(values.supplier)) {
    errors.supplier = "Supplier is required.";
  }
  if (isBlank(values.warehouseId)) {
    errors.warehouseId = "Select a warehouse.";
  }
  if (isBlank(values.date)) {
    errors.date = "Enter the receipt date.";
  }

  // Validate GRN when manual entry is selected
  if (values.grnMode === "manual") {
    if (isBlank(values.manualGrn)) {
      errors.grnNo = "Manual GRN number is required.";
    } else if (!/^[A-Za-z0-9\-_/]+$/.test(values.manualGrn.trim())) {
      errors.grnNo = "GRN must contain only letters, numbers, dashes, or slashes.";
    }
  }

  values.lineItems.forEach((line, index) => {
    if (isBlank(line.itemId)) errors[`lineItems.${index}.itemId`] = "Select an item.";
    if (isBlank(line.quantity)) errors[`lineItems.${index}.quantity`] = "Enter quantity.";
    else if (!isPositiveDecimal(line.quantity)) errors[`lineItems.${index}.quantity`] = "Quantity must be greater than zero.";
    if (isBlank(line.rate)) errors[`lineItems.${index}.rate`] = "Enter rate.";
    else if (!isPositiveDecimal(line.rate)) errors[`lineItems.${index}.rate`] = "Rate must be greater than zero.";
  });

  return errors;
}

function buildItemOptions(items) {
  return items.map((item) => ({
    value: item.id,
    label: `${item.itemCode} • ${item.itemName}`,
  }));
}

function AddInwardModal({ isOpen, onClose, onCreated, warehouses = [], items = [], editEntry = null }) {
  const itemOptions = buildItemOptions(items);
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));
  const defaultWarehouse = warehouses[0]?.id ?? "";
  const defaultItem = items[0]?.id ?? "";

  // Supplier fetch state
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierDropdownRef = useRef(null);

  // Auto GRN preview generated ONCE per modal lifecycle
  const autoGrnPreview = useMemo(() => {
    const yearSuffix = new Date().getFullYear().toString().slice(2);
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `GRN-${yearSuffix}${month}-AUTO`;
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      setSuppliersLoading(true);
      setSuppliersError(null);
      const res = await supplierService.getSuppliers({ status: "active" });
      const supplierList = res?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
      setSuppliers(supplierList);
    } catch (err) {
      setSuppliersError(err.message || "Failed to load suppliers from Procurement Master");
    } finally {
      setSuppliersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen, fetchSuppliers]);

  const form = useFormSubmission({
    initialValues: {
      supplierId: editEntry?.supplierId || "",
      supplier: editEntry?.supplier || "",
      supplierCode: editEntry?.supplierCode || "",
      warehouseId: editEntry?.warehouseId || defaultWarehouse,
      date: editEntry?.date || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      grnMode: editEntry?.isManualGrn ? "manual" : "auto",
      manualGrn: editEntry?.grnNo || "",
      remarks: editEntry?.remarks || "",
      lineItems: editEntry?.lineItems?.length
        ? editEntry.lineItems.map((l) => ({ itemId: l.itemId, quantity: String(l.quantity), rate: String(l.rate) }))
        : [{ ...EMPTY_LINE, itemId: defaultItem, quantity: "100", rate: "250" }],
    },
    validate,
    submit: async (values, context) => {
      const payload = {
        supplierId: values.supplierId || undefined,
        supplier: values.supplier.trim(),
        warehouseId: values.warehouseId,
        date: values.date,
        remarks: values.remarks,
        status: "Received",
        isManualGrn: editEntry ? Boolean(editEntry.isManualGrn) : values.grnMode === "manual",
        grnNo: editEntry ? editEntry.grnNo : (values.grnMode === "manual" ? values.manualGrn.trim() : undefined),
        lineItems: values.lineItems.map((line) => ({
          itemId: line.itemId,
          quantity: Number(line.quantity),
          rate: Number(line.rate),
        })),
      };
      if (editEntry) {
        return inwardService.updateInward(editEntry.id, payload, context);
      }
      return inwardService.createInward(payload, context);
    },
    onSuccess: (result) => {
      window.dispatchEvent(new CustomEvent("inventory:stock-updated"));
      onCreated?.(result?.data ?? result);
    },
  });

  // Sync form values on modal open or editEntry change
  useEffect(() => {
    if (isOpen) {
      form.reset({
        supplierId: editEntry?.supplierId || "",
        supplier: editEntry?.supplier || "",
        supplierCode: editEntry?.supplierCode || "",
        warehouseId: editEntry?.warehouseId || defaultWarehouse,
        date: editEntry?.date || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        grnMode: editEntry?.isManualGrn ? "manual" : "auto",
        manualGrn: editEntry?.grnNo || "",
        remarks: editEntry?.remarks || "",
        lineItems: editEntry?.lineItems?.length
          ? editEntry.lineItems.map((l) => ({ itemId: l.itemId, quantity: String(l.quantity), rate: String(l.rate) }))
          : [{ ...EMPTY_LINE, itemId: defaultItem, quantity: "100", rate: "250" }],
      });
      setSupplierSearch("");
      setIsSupplierDropdownOpen(false);
    }
  }, [isOpen, editEntry, defaultWarehouse, defaultItem]);

  // Click outside listener for supplier dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
        setIsSupplierDropdownOpen(false);
      }
    }
    if (isSupplierDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isSupplierDropdownOpen]);

  const field = { form, idPrefix: ID_PREFIX };
  const itemLookup = { options: itemOptions, status: "success" };

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.categoryName && s.categoryName.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  const handleSelectSupplier = (s) => {
    form.setValue("supplierId", s.id);
    form.setValue("supplier", s.name);
    form.setValue("supplierCode", s.code || "");
    setIsSupplierDropdownOpen(false);
    setSupplierSearch("");
  };

  if (!isOpen) return null;

  return (
    <Modal
      title={editEntry ? "Edit Inward Entry" : "Add New Inward"}
      description="Record a new goods inward entry integrated with Procurement Supplier Master."
      width="xl"
      onClose={onClose}
    >
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel={editEntry ? "Update Inward" : "Submit Inward"}
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          {/* Supplier Dropdown with Procurement Master API */}
          <div className="relative" ref={supplierDropdownRef}>
            <label className="block text-[12px] font-medium leading-4 text-ink mb-1">
              Supplier <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSupplierDropdownOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between text-left ${INPUT_CLASS} ${
                  form.fieldErrors.supplier ? "border-danger focus-visible:outline-danger" : ""
                } ${form.values.supplier ? "text-ink font-medium" : "text-placeholder"}`}
                aria-haspopup="listbox"
                aria-expanded={isSupplierDropdownOpen}
              >
                <span className="truncate">
                  {form.values.supplier
                    ? form.values.supplierCode
                      ? `[${form.values.supplierCode}] ${form.values.supplier}`
                      : form.values.supplier
                    : "Select or search supplier..."}
                </span>
                <ChevronDown size={14} className="text-muted shrink-0 ml-2" />
              </button>
            </div>

            {form.fieldErrors.supplier && (
              <p className="mt-1 text-[11px] leading-3 text-danger">{form.fieldErrors.supplier}</p>
            )}

            {/* Dropdown Popover */}
            {isSupplierDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface border border-line rounded-lg shadow-lg overflow-hidden flex flex-col max-h-64">
                {/* Search input inside dropdown */}
                <div className="p-2 border-b border-line bg-workspace flex items-center gap-2">
                  <Search size={14} className="text-muted shrink-0" />
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    placeholder="Search by name, code (e.g. SUP-001)..."
                    className="w-full bg-transparent text-[12px] text-ink placeholder:text-placeholder focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="overflow-y-auto flex-1 divide-y divide-line/60">
                  {suppliersLoading ? (
                    <div className="p-3 text-center text-xs text-muted flex items-center justify-center gap-2">
                      <RefreshCw size={13} className="animate-spin text-brand" />
                      Loading suppliers from Procurement Master...
                    </div>
                  ) : suppliersError ? (
                    <div className="p-3 text-xs text-danger flex flex-col items-center gap-1.5 text-center">
                      <div className="flex items-center gap-1.5 font-medium">
                        <AlertCircle size={14} />
                        Failed to load suppliers
                      </div>
                      <p className="text-[11px] text-ink-soft">{suppliersError}</p>
                      <button
                        type="button"
                        onClick={fetchSuppliers}
                        className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-danger-soft text-danger rounded hover:bg-danger/20 transition-colors"
                      >
                        <RefreshCw size={11} /> Retry
                      </button>
                    </div>
                  ) : filteredSuppliers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted">
                      No suppliers found matching "{supplierSearch}"
                    </div>
                  ) : (
                    filteredSuppliers.map((s) => {
                      const isSelected = form.values.supplierId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectSupplier(s)}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-workspace transition-colors ${
                            isSelected ? "bg-brand/10 font-medium text-brand" : "text-ink"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              {s.code && (
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-semibold">
                                  {s.code}
                                </span>
                              )}
                              <span>{s.name}</span>
                            </div>
                            {s.categoryName && (
                              <p className="text-[10px] text-muted mt-0.5">{s.categoryName}</p>
                            )}
                          </div>
                          {isSelected && <Check size={14} className="text-brand shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <SelectField
            {...field}
            name="warehouseId"
            label="Warehouse"
            placeholder="Select warehouse"
            options={warehouseOptions}
            required
          />

          <TextField {...field} name="date" label="Date" required />

          {/* GRN Field: Immutable in edit mode, selectable in create mode */}
          {editEntry ? (
            <div>
              <label className="text-[12px] font-medium leading-4 text-ink block mb-1">
                GRN Number (Immutable)
              </label>
              <div className="relative">
                <input
                  id={`${ID_PREFIX}-grn-edit`}
                  readOnly
                  disabled
                  value={editEntry.grnNo}
                  className={`${INPUT_CLASS} cursor-not-allowed bg-workspace text-ink font-mono font-medium`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                  Fixed / Issued
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-medium leading-4 text-ink">
                  GRN Number <span className="text-danger">*</span>
                </label>
                <div className="flex items-center gap-3 text-[11px]">
                  <label className="inline-flex items-center gap-1 cursor-pointer text-ink font-medium">
                    <input
                      type="radio"
                      name="grnMode"
                      value="auto"
                      checked={form.values.grnMode === "auto"}
                      onChange={() => form.setValue("grnMode", "auto")}
                      className="text-brand focus:ring-brand h-3.5 w-3.5"
                    />
                    <span>Automatic</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer text-ink font-medium">
                    <input
                      type="radio"
                      name="grnMode"
                      value="manual"
                      checked={form.values.grnMode === "manual"}
                      onChange={() => form.setValue("grnMode", "manual")}
                      className="text-brand focus:ring-brand h-3.5 w-3.5"
                    />
                    <span>Manual</span>
                  </label>
                </div>
              </div>

              {form.values.grnMode === "auto" ? (
                <div className="relative">
                  <input
                    id={`${ID_PREFIX}-grn-auto`}
                    readOnly
                    disabled
                    value={autoGrnPreview}
                    className={`${INPUT_CLASS} cursor-not-allowed bg-workspace text-muted font-mono`}
                    title="System generated GRN format: GRN-YYMM-XXXX"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                    Generated on Save
                  </span>
                </div>
              ) : (
                <div>
                  <input
                    id={`${ID_PREFIX}-grn-manual`}
                    name="manualGrn"
                    type="text"
                    value={form.values.manualGrn}
                    onChange={(e) => form.setValue("manualGrn", e.target.value)}
                    placeholder="e.g. GRN-2609-5001"
                    className={`${INPUT_CLASS} font-mono ${
                      form.fieldErrors.grnNo ? "border-danger focus-visible:outline-danger" : ""
                    }`}
                  />
                  {form.fieldErrors.grnNo && (
                    <p className="mt-1 text-[11px] leading-3 text-danger">{form.fieldErrors.grnNo}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="sm:col-span-2">
            <p
              role="status"
              className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2 text-[12px] leading-[17px] text-ink"
            >
              <Info size={15} className="mt-px shrink-0 text-info" aria-hidden="true" />
              <span>
                {form.values.grnMode === "auto"
                  ? "Standard GRN numbering will be automatically assigned upon creation."
                  : "Manual GRN entry will be strictly validated for uniqueness against existing records."}
              </span>
            </p>
          </div>

          <div className="sm:col-span-2">
            <LineItemsEditor
              form={form}
              name="lineItems"
              idPrefix={ID_PREFIX}
              label="Line Items"
              emptyItem={{ ...EMPTY_LINE, itemId: defaultItem }}
              addLabel="Add row"
              columns={[
                {
                  key: "itemId",
                  label: "Item",
                  width: "minmax(0,1fr)",
                  kind: "select",
                  placeholder: "Select item",
                  lookup: itemLookup,
                },
                { key: "quantity", label: "Qty", width: "96px", kind: "quantity", placeholder: "0" },
                { key: "rate", label: "Rate", width: "110px", kind: "decimal", placeholder: "0" },
                { key: "amount", label: "Amount", width: "120px", kind: "computed", compute: formatAmount },
              ]}
            />
          </div>

          <TextAreaField
            {...field}
            name="remarks"
            label="Remarks"
            placeholder="Add delivery notes, PO reference, or gate pass details"
            className="sm:col-span-2"
          />
        </div>
      </ModalForm>
    </Modal>
  );
}

export default AddInwardModal;
