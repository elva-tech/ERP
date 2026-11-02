import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { buildUrl, apiRequest, ApiError } from "../src/lib/apiClient.js";
import { supplierService } from "../src/features/suppliers/services/supplierService.js";
import { reconciliationService } from "../src/features/reconciliation/services/reconciliationService.js";
import { inwardService } from "../src/features/inward/services/inwardService.js";
import AddInwardModal from "../src/features/inward/components/AddInwardModal.jsx";
import CreateTransferModal from "../src/features/transfers/components/CreateTransferModal.jsx";
import StockReconciliationPage from "../src/pages/StockReconciliationPage.jsx";
import DeliveryNotesPage from "../src/pages/DeliveryNotesPage.jsx";
import OutwardPage from "../src/pages/OutwardPage.jsx";
import App from "../src/App.jsx";

describe("Audit Fixes & Workflow Strengthening Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Phase 1: Procurement Supplier Integration", () => {
    it("should construct the correct root-level URL for Procurement cross-module routes", () => {
      const url = buildUrl("/procurement/suppliers", { status: "active" });
      expect(url).toContain("/api/procurement/suppliers");
      expect(url).not.toContain("/api/inventory/procurement/suppliers");
      expect(url).toContain("status=active");
    });

    it("should handle the documented Procurement envelope { items: [...], pagination: {...} }", async () => {
      const spy = vi.spyOn(supplierService, "getSuppliers").mockResolvedValue({
        items: [
          { id: "sup-99", code: "SUP-099", name: "Procurement Master Supplier", status: "active" },
        ],
        pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      });

      render(
        <AddInwardModal
          isOpen={true}
          onClose={() => {}}
          warehouses={[{ id: "wh-1", name: "Main WH" }]}
          items={[{ id: "item-1", name: "Cable", currentStock: 100 }]}
        />
      );

      const selectBtn = screen.getByRole("button", { name: /Select or search supplier/i });
      fireEvent.click(selectBtn);

      await waitFor(() => {
        expect(screen.getByText("Procurement Master Supplier")).toBeInTheDocument();
        expect(screen.getByText(/SUP-099/)).toBeInTheDocument();
      });

      spy.mockRestore();
    });

    it("should preserve supplier unique ID upon selection", async () => {
      render(
        <AddInwardModal
          isOpen={true}
          onClose={() => {}}
          warehouses={[{ id: "wh-1", name: "Main WH" }]}
          items={[{ id: "item-1", name: "Cable", currentStock: 100 }]}
        />
      );

      const selectBtn = screen.getByRole("button", { name: /Select or search supplier/i });
      fireEvent.click(selectBtn);

      const supplierOption = await screen.findByText("Velora Steel Traders");
      fireEvent.click(supplierOption.closest("button"));

      expect(screen.getByRole("button", { name: /\[SUP-001\] Velora Steel Traders/i })).toBeInTheDocument();
    });
  });

  describe("Phase 2: Stock Reconciliation Persistence", () => {
    it("should call adjustStock API endpoint and prevent local state mutation on API failure", async () => {
      const adjustSpy = vi.spyOn(reconciliationService, "adjustStock").mockRejectedValue(
        new ApiError("unavailable", "Backend ledger service temporarily unavailable")
      );
      const toastSpy = vi.fn();

      render(<StockReconciliationPage onShowToast={toastSpy} />);

      const adjustBtns = await screen.findAllByRole("button", { name: /Adjust Stock/i });
      expect(adjustBtns.length).toBeGreaterThan(0);
      fireEvent.click(adjustBtns[0]);

      await waitFor(() => {
        expect(adjustSpy).toHaveBeenCalled();
        expect(toastSpy).toHaveBeenCalledWith(
          expect.stringContaining("Backend ledger service temporarily unavailable"),
          "error"
        );
      });

      expect(adjustBtns[0]).toBeInTheDocument();
      adjustSpy.mockRestore();
    });

    it("should atomically update authoritative stock and dispatch stock-updated event on real success", async () => {
      const eventSpy = vi.fn();
      window.addEventListener("inventory:stock-updated", eventSpy);

      const toastSpy = vi.fn();
      render(<StockReconciliationPage onShowToast={toastSpy} />);

      const adjustBtns = await screen.findAllByRole("button", { name: /Adjust Stock/i });
      fireEvent.click(adjustBtns[0]);

      await waitFor(() => {
        expect(toastSpy).toHaveBeenCalledWith(
          expect.stringContaining("posted to ledger as inventory adjustment"),
          "success"
        );
        expect(eventSpy).toHaveBeenCalled();
      });

      window.removeEventListener("inventory:stock-updated", eventSpy);
    });
  });

  describe("Phase 3: GRN Generation & Preservation on Edit", () => {
    it("should preserve existing GRN and call updateInward when editing an existing record", async () => {
      const updateSpy = vi.spyOn(inwardService, "updateInward").mockResolvedValue({
        data: { id: "inw-test", grnNo: "GRN-2609-EXISTING" },
      });

      const existingEntry = {
        id: "inw-test",
        grnNo: "GRN-2609-EXISTING",
        supplier: "Velora Steel Traders",
        supplierId: "sup-001",
        warehouseId: "wh-1",
        date: "2026-10-31",
        remarks: "Existing remark",
        lineItems: [{ itemId: "item-1", quantity: "50", rate: "200" }],
      };

      render(
        <AddInwardModal
          isOpen={true}
          onClose={() => {}}
          editEntry={existingEntry}
          warehouses={[{ id: "wh-1", name: "Main WH" }]}
          items={[{ id: "item-1", name: "Cable", currentStock: 100 }]}
        />
      );

      expect(screen.getByText("Edit Inward Entry")).toBeInTheDocument();
      expect(screen.getByDisplayValue("GRN-2609-EXISTING")).toBeInTheDocument();

      const submitBtn = screen.getByRole("button", { name: /Update Inward/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          "inw-test",
          expect.objectContaining({
            grnNo: "GRN-2609-EXISTING",
          }),
          expect.anything()
        );
      });

      updateSpy.mockRestore();
    });
  });

  describe("Phase 4: Delivery Notes Date Filtering", () => {
    it("should render date filter on DeliveryNotesPage and filter delivery notes", async () => {
      render(<DeliveryNotesPage onShowToast={() => {}} />);

      const startDateInput = await screen.findByLabelText(/Start date/i);
      const endDateInput = screen.getByLabelText(/End date/i);
      expect(startDateInput).toBeInTheDocument();
      expect(endDateInput).toBeInTheDocument();

      fireEvent.change(startDateInput, { target: { value: "2025-01-01" } });
      fireEvent.change(endDateInput, { target: { value: "2025-01-02" } });

      await waitFor(() => {
        expect(screen.getByText(/No delivery notes found matching your search/i)).toBeInTheDocument();
      });
    });
  });

  describe("Phase 5: Outward Workflow & Status", () => {
    it("should render Outward table without user-facing Status column or filter", async () => {
      render(<OutwardPage onShowToast={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText(/Recent outward entries/i)).toBeInTheDocument();
      });

      const tableHeaders = screen.getAllByRole("columnheader").map((th) => th.textContent);
      expect(tableHeaders).not.toContain("Status");
    });
  });

  describe("Phase 6 & 7: Transfer Validation & Navigation Cleanup", () => {
    it("should disable submit and display validation error when source and destination warehouse are identical", async () => {
      render(
        <CreateTransferModal
          isOpen={true}
          onClose={() => {}}
          onSubmit={() => {}}
          warehouses={[
            { id: "wh-1", name: "Main Warehouse" },
            { id: "wh-2", name: "Secondary Warehouse" },
          ]}
          items={[{ id: "item-1", name: "Copper Cable", currentStock: 500 }]}
        />
      );

      const toSelect = screen.getByLabelText(/To Warehouse/i);
      fireEvent.change(toSelect, { target: { value: "wh-1" } });

      expect(
        screen.getByText(/Source and destination warehouses cannot be the same location/i)
      ).toBeInTheDocument();

      const submitBtn = screen.getByRole("button", { name: /Create Transfer/i });
      expect(submitBtn).toBeDisabled();
    });

    it("should confirm Sales Invoice is absent from routes and navigation", () => {
      render(<App />);

      expect(screen.queryByRole("link", { name: /Sales Invoice/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Sales Invoices/i)).not.toBeInTheDocument();
    });
  });
});
