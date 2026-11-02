import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CreateTransferModal from "../src/features/transfers/components/CreateTransferModal.jsx";
import StartReconciliationModal from "../src/features/reconciliation/components/StartReconciliationModal.jsx";
import CreateInvoiceModal from "../src/features/invoices/components/CreateInvoiceModal.jsx";
import CreateDeliveryNoteModal from "../src/features/delivery-notes/components/CreateDeliveryNoteModal.jsx";

const warehouses = [
  { id: "wh-1", name: "Main Warehouse" },
  { id: "wh-2", name: "Site Warehouse" },
];

const items = [
  { id: "item-1", itemCode: "CBL-1", itemName: "Copper Cable" },
  { id: "item-2", itemCode: "MCB-2", itemName: "Circuit Breaker" },
  { id: "item-3", itemCode: "EAR-3", itemName: "Earthing Kit" },
];

describe("Inventory form layouts", () => {
  it("keeps stock transfer line editing and submission working", () => {
    const onSubmit = vi.fn();
    render(
      <CreateTransferModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
        warehouses={warehouses}
        items={items}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity, line 1" }), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Add row" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Transfer" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        fromWarehouseId: "wh-1",
        toWarehouseId: "wh-2",
        lineItems: [
          { itemId: "item-1", quantity: 12 },
          { itemId: "item-1", quantity: 10 },
        ],
      }),
    );
  });

  it("keeps reconciliation scope and item selection working", () => {
    const onSubmit = vi.fn();
    render(
      <StartReconciliationModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
        warehouses={warehouses}
        items={items}
      />,
    );

    fireEvent.change(screen.getByLabelText("Item Selection"), { target: { value: "item-3" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Reconciliation" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouseId: "wh-1",
        scope: "Selected Items",
        selectedItemIds: ["item-1", "item-2", "item-3"],
      }),
    );
  });

  it("keeps invoice line calculations and submission working", () => {
    const onSubmit = vi.fn();
    render(
      <CreateInvoiceModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
        items={items}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity, line 1" }), { target: { value: "2" } });
    expect(screen.getByText("₹500")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create Invoice" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "MahaBuild Contractors Pvt. Ltd.",
        lineItems: [{ itemId: "item-1", qty: 2, rate: 250, taxPercent: 18 }],
      }),
    );
  });

  it("keeps delivery note invoice autofill and submission working", () => {
    const onSubmit = vi.fn();
    const invoices = [
      { id: "inv-1", invoiceNo: "INV-1", customer: "Customer One" },
      { id: "inv-2", invoiceNo: "INV-2", customer: "Customer Two" },
    ];
    render(
      <CreateDeliveryNoteModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
        invoices={invoices}
        warehouses={warehouses}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Sales Invoice/), { target: { value: "INV-2" } });
    expect(screen.getByLabelText(/Customer/)).toHaveValue("Customer Two");
    fireEvent.click(screen.getByRole("button", { name: "Create Delivery Note" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        salesInvoiceRef: "INV-2",
        customer: "Customer Two",
        warehouseId: "wh-1",
      }),
    );
  });
});
