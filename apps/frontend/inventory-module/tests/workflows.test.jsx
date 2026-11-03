import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "../src/pages/DashboardPage.jsx";
import ItemMasterPage from "../src/pages/ItemMasterPage.jsx";
import WarehouseDashboardPage from "../src/pages/WarehouseDashboardPage.jsx";
import StockLedgerPage from "../src/pages/StockLedgerPage.jsx";

describe("Frontend Page Workflows & UI Integration", () => {
  it("should render DashboardPage with KPIs and warehouse summary", async () => {
    const handleNavigate = vi.fn();
    const handleToast = vi.fn();

    render(<DashboardPage onNavigate={handleNavigate} onShowToast={handleToast} />);

    // Wait for header to appear
    const heading = await screen.findByRole("heading", { level: 2, name: /Inventory Dashboard/i });

    // Wait for metrics to load
    await waitFor(() => {
      expect(screen.getByText(/Total SKUs/i)).toBeInTheDocument();
      expect(screen.getByText(/Low Stock Items/i)).toBeInTheDocument();
      expect(screen.getByText(/Inward Today/i)).toBeInTheDocument();
      expect(screen.getByText(/Outward Today/i)).toBeInTheDocument();
    });
  });

  it("should render ItemMasterPage and list electrical items", async () => {
    const handleToast = vi.fn();

    render(<ItemMasterPage onShowToast={handleToast} />);

    const heading = await screen.findByRole("heading", { level: 2, name: /Item Master/i });

    await waitFor(() => {
      expect(screen.getAllByText(/CBL-1.5-3C/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/MCB-TP-32/i).length).toBeGreaterThan(0);
    });
  });

  it("should render WarehouseDashboardPage with multi-location cards", async () => {
    const handleNavigate = vi.fn();
    const handleToast = vi.fn();

    render(<WarehouseDashboardPage onNavigate={handleNavigate} onShowToast={handleToast} />);

    const heading = await screen.findByRole("heading", { level: 2, name: /Warehouse Overview/i });

    await waitFor(() => {
      expect(screen.getByText(/Pune Main Warehouse/i)).toBeInTheDocument();
      expect(screen.getByText(/Mumbai Yard Warehouse/i)).toBeInTheDocument();
    });
  });

  it("should render StockLedgerPage with running balances", async () => {
    const handleToast = vi.fn();

    render(<StockLedgerPage onShowToast={handleToast} />);

    const heading = await screen.findByRole("heading", { level: 2, name: /Stock Ledger/i });

    await waitFor(() => {
      expect(screen.getByText(/Opening Balance/i)).toBeInTheDocument();
      expect(screen.getByText(/Closing Balance/i)).toBeInTheDocument();
      expect(screen.getByText(/GRN-2609-0184/i)).toBeInTheDocument();
    });
  });
});
