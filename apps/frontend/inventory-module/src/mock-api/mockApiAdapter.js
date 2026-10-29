import { ApiError } from "../lib/apiClient.js";
import {
  CreateItemInputSchema,
  CreateWarehouseInputSchema,
  CreateInwardInputSchema,
  CreateOutwardInputSchema,
  CreateTransferInputSchema,
  StartReconciliationInputSchema,
  CreateDeliveryNoteInputSchema,
  CreateInvoiceInputSchema,
} from "../schemas/inventorySchemas.js";
import { mockDb } from "./mockDatabase.js";

/**
 * Parses route paths and dispatches to mock handlers.
 */
export const mockApiAdapter = {
  async handleRequest(path, options = {}) {
    const { method = "GET", query = {}, body, idempotencyKey } = options;
    const cleanPath = path.split("?")[0].replace(/^\/api\/inventory/, "").replace(/\/+$/, "") || "/";

    // Idempotency check for mutations
    if (idempotencyKey && (method === "POST" || method === "PUT" || method === "PATCH")) {
      if (mockDb.processedIdempotencyKeys.has(idempotencyKey)) {
        throw new ApiError(
          "conflict",
          `Duplicate request detected for idempotency key "${idempotencyKey}". Transaction already submitted.`,
          { status: 409, code: "DUPLICATE_IDEMPOTENCY_KEY" }
        );
      }
      mockDb.processedIdempotencyKeys.add(idempotencyKey);
    }

    // Route matching
    // 1. Dashboard
    if (cleanPath === "/dashboard" && method === "GET") {
      return this.getDashboardMetrics();
    }

    // 2. Items
    if (cleanPath === "/items" && method === "GET") {
      return this.listItems(query);
    }
    if (cleanPath === "/items" && method === "POST") {
      return this.createItem(body);
    }
    if (cleanPath.startsWith("/items/") && method === "GET") {
      const id = cleanPath.replace("/items/", "");
      return this.getItemById(id);
    }
    if (cleanPath.startsWith("/items/") && method === "PATCH") {
      const id = cleanPath.replace("/items/", "");
      return this.updateItem(id, body);
    }

    // 3. Warehouses
    if (cleanPath === "/warehouses" && method === "GET") {
      return this.listWarehouses(query);
    }
    if (cleanPath === "/warehouses" && method === "POST") {
      return this.createWarehouse(body);
    }
    if (cleanPath.startsWith("/warehouses/") && method === "GET") {
      const id = cleanPath.replace("/warehouses/", "");
      return this.getWarehouseById(id);
    }

    // 4. Inward
    if (cleanPath === "/inward" && method === "GET") {
      return this.listInward(query);
    }
    if (cleanPath === "/inward" && method === "POST") {
      return this.createInward(body);
    }
    if (cleanPath.startsWith("/inward/") && method === "GET") {
      const id = cleanPath.replace("/inward/", "");
      return this.getInwardById(id);
    }

    // 5. Outward
    if (cleanPath === "/outward" && method === "GET") {
      return this.listOutward(query);
    }
    if (cleanPath === "/outward" && method === "POST") {
      return this.createOutward(body);
    }
    if (cleanPath.startsWith("/outward/") && method === "GET") {
      const id = cleanPath.replace("/outward/", "");
      return this.getOutwardById(id);
    }

    // 6. Stock Ledger
    if (cleanPath === "/ledger" && method === "GET") {
      return this.getLedger(query);
    }

    // 7. Transfers
    if (cleanPath === "/transfers" && method === "GET") {
      return this.listTransfers(query);
    }
    if (cleanPath === "/transfers" && method === "POST") {
      return this.createTransfer(body);
    }

    // 8. Reconciliation
    if (cleanPath === "/reconciliations" && method === "GET") {
      return this.listReconciliations(query);
    }
    if (cleanPath === "/reconciliations" && method === "POST") {
      return this.startReconciliation(body);
    }

    // 9. Aging
    if (cleanPath === "/aging" && method === "GET") {
      return this.getAging(query);
    }

    // 10. Delivery Notes
    if (cleanPath === "/delivery-notes" && method === "GET") {
      return this.listDeliveryNotes(query);
    }
    if (cleanPath === "/delivery-notes" && method === "POST") {
      return this.createDeliveryNote(body);
    }

    // 11. Sales Invoices
    if (cleanPath === "/invoices" && method === "GET") {
      return this.listInvoices(query);
    }
    if (cleanPath === "/invoices" && method === "POST") {
      return this.createInvoice(body);
    }

    throw new ApiError("not_found", `Mock endpoint not found: ${method} ${cleanPath}`, {
      status: 404,
    });
  },

  // --- Handlers ---

  async getDashboardMetrics() {
    const totalSkus = mockDb.items.length;
    const lowStockCount = mockDb.items.filter((i) => i.currentStock <= i.reorderLevel).length;

    // Calculate Inward today
    const inwardTodayShipmentsCount = 12;
    const inwardTodayAmount = "₹4.2 Lakhs";
    const outwardTodayIssuesCount = 8;
    const outwardTodayAmount = "₹3.1 Lakhs";

    const categoryStockDistribution = [
      { category: "Cables & Wires", percentage: 85 },
      { category: "Switchgear & MCBs", percentage: 65 },
      { category: "Distribution Panels", percentage: 45 },
      { category: "Transformers", percentage: 20 },
    ];

    const monthlyTrends = [
      { month: "Nov", inwardValue: 40, outwardValue: 28 },
      { month: "Dec", inwardValue: 55, outwardValue: 48 },
      { month: "Jan", inwardValue: 50, outwardValue: 54 },
      { month: "Feb", inwardValue: 65, outwardValue: 35 },
      { month: "Mar", inwardValue: 75, outwardValue: 62 },
      { month: "Apr", inwardValue: 82, outwardValue: 68 },
    ];

    const lowStockAlerts = mockDb.items
      .filter((i) => i.currentStock <= i.reorderLevel)
      .map((item) => {
        // Find warehouse that holds it
        const wb = mockDb.warehouseBalances.find((b) => b.itemId === item.id);
        const wh = wb ? mockDb.warehouses.find((w) => w.id === wb.warehouseId) : null;
        return {
          id: item.id,
          itemCode: item.itemCode,
          description: item.itemName,
          currentStock: item.currentStock,
          minLevel: item.reorderLevel,
          unit: item.unit,
          warehouse: wh ? wh.name : "Pune Main WH",
        };
      });

    return {
      totalSkus,
      lowStockCount,
      inwardTodayAmount,
      inwardTodayShipmentsCount,
      outwardTodayAmount,
      outwardTodayIssuesCount,
      categoryStockDistribution,
      monthlyTrends,
      lowStockAlerts,
    };
  },

  async listItems(query = {}) {
    let result = [...mockDb.items];

    if (query.search) {
      const q = String(query.search).toLowerCase();
      result = result.filter(
        (i) =>
          i.itemCode.toLowerCase().includes(q) ||
          i.itemName.toLowerCase().includes(q) ||
          i.hsnCode.includes(q)
      );
    }
    if (query.category && query.category !== "all" && query.category !== "All Categories") {
      result = result.filter((i) => i.category.toLowerCase() === String(query.category).toLowerCase());
    }
    if (query.status && query.status !== "all" && query.status !== "All Status") {
      result = result.filter((i) => i.status.toLowerCase() === String(query.status).toLowerCase());
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const total = result.length;
    const start = (page - 1) * limit;
    const data = result.slice(start, start + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async getItemById(id) {
    const item = mockDb.items.find((i) => i.id === id || i.itemCode === id);
    if (!item) {
      throw new ApiError("not_found", `Item with ID "${id}" does not exist.`, { status: 404 });
    }
    return item;
  },

  async createItem(rawBody) {
    const parsed = CreateItemInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError("validation", "Item validation failed.", {
        status: 400,
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;

    // Check duplicate item code
    const duplicate = mockDb.items.find(
      (i) => i.itemCode.toUpperCase() === input.itemCode.toUpperCase()
    );
    if (duplicate) {
      throw new ApiError("conflict", `Item code "${input.itemCode}" is already in use.`, {
        status: 409,
        code: "DUPLICATE_ITEM_CODE",
        fieldErrors: { itemCode: ["This item code already exists in your catalogue."] },
      });
    }

    const initialStock = Number(input.initialStock) || 0;
    const status = initialStock === 0 ? "Out of Stock" : initialStock <= input.reorderLevel ? "Low Stock" : "In Stock";

    const newItem = {
      id: `item-${Date.now()}`,
      itemCode: input.itemCode.toUpperCase(),
      itemName: input.itemName,
      category: input.category,
      unit: input.unit,
      hsnCode: input.hsnCode,
      reorderLevel: Number(input.reorderLevel),
      currentStock: initialStock,
      description: input.description || "",
      taxRate: Number(input.taxRate) || 18,
      status,
      createdAt: new Date().toISOString(),
    };

    mockDb.items.unshift(newItem);

    // If initial stock and warehouse provided, register balance & ledger
    if (initialStock > 0 && input.warehouseId) {
      mockDb.warehouseBalances.push({
        warehouseId: input.warehouseId,
        itemId: newItem.id,
        quantity: initialStock,
      });

      const wh = mockDb.warehouses.find((w) => w.id === input.warehouseId);
      mockDb.ledgerEntries.unshift({
        id: `led-${Date.now()}`,
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        voucherNo: `OPN-${Math.floor(1000 + Math.random() * 9000)}`,
        type: "Inward",
        itemId: newItem.id,
        itemCode: newItem.itemCode,
        itemName: newItem.itemName,
        unit: newItem.unit,
        warehouseId: input.warehouseId,
        warehouseName: wh ? wh.name : "Main Warehouse",
        quantityIn: initialStock,
        quantityOut: 0,
        balance: initialStock,
        reference: "Opening Stock Balance",
        createdAt: new Date().toISOString(),
      });
    }

    return newItem;
  },

  async updateItem(id, updateData) {
    const item = mockDb.items.find((i) => i.id === id);
    if (!item) {
      throw new ApiError("not_found", `Item not found: ${id}`, { status: 404 });
    }
    Object.assign(item, updateData, { updatedAt: new Date().toISOString() });
    return item;
  },

  async listWarehouses(query = {}) {
    let result = [...mockDb.warehouses];
    if (query.search) {
      const q = String(query.search).toLowerCase();
      result = result.filter((w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q) || w.city.toLowerCase().includes(q));
    }
    return { data: result, total: result.length };
  },

  async getWarehouseById(id) {
    const warehouse = mockDb.warehouses.find((w) => w.id === id || w.code === id);
    if (!warehouse) {
      throw new ApiError("not_found", `Warehouse "${id}" not found.`, { status: 404 });
    }

    // Stored items
    const balances = mockDb.warehouseBalances.filter((b) => b.warehouseId === warehouse.id);
    const itemsStored = balances.map((b) => {
      const item = mockDb.items.find((i) => i.id === b.itemId) || { itemCode: "UNKNOWN", itemName: "Unknown Item", category: "General", unit: "Nos" };
      return {
        id: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        category: item.category,
        quantity: b.quantity,
        unit: item.unit,
        stockValue: b.quantity * 250, // estimated
      };
    });

    const recentActivity = [
      { type: "Inward", ref: "GRN-2609-0184 • Finolex Cables", amount: "+ ₹4.2 L", positive: true },
      { type: "Outward", ref: "DN-2609-0092 • Hinjawadi Phase 3", amount: "- ₹1.8 L", positive: false },
      { type: "Inward", ref: "GRN-2609-0178 • Polycab India", amount: "+ ₹2.7 L", positive: true },
    ];

    const categoryDistribution = [
      { name: "Cables & Wires", percentage: 34 },
      { name: "Switchgear", percentage: 24 },
      { name: "Panels", percentage: 18 },
      { name: "Accessories", percentage: 14 },
    ];

    return {
      warehouse,
      itemsStored,
      recentActivity,
      categoryDistribution,
    };
  },

  async createWarehouse(rawBody) {
    const parsed = CreateWarehouseInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError("validation", "Warehouse validation failed.", {
        status: 400,
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;

    // Check duplicate code
    const duplicate = mockDb.warehouses.find(
      (w) => w.code.toUpperCase() === input.code.toUpperCase()
    );
    if (duplicate) {
      throw new ApiError("conflict", `Warehouse code "${input.code}" already exists.`, {
        status: 409,
        code: "DUPLICATE_WAREHOUSE_CODE",
        fieldErrors: { code: ["Warehouse code already in use."] },
      });
    }

    const newWarehouse = {
      id: `wh-${Date.now()}`,
      code: input.code.toUpperCase(),
      name: input.name,
      streetAddress: input.streetAddress,
      city: input.city,
      state: input.state,
      pinCode: input.pinCode,
      type: input.type,
      totalAreaSqFt: Number(input.totalAreaSqFt),
      zonesCount: Number(input.zonesCount) || 4,
      capacityUtilization: 0,
      totalItems: 0,
      stockValue: 0,
      contactPerson: input.contactPerson,
      contactPhone: input.contactPhone,
      status: "Active",
    };

    mockDb.warehouses.push(newWarehouse);
    return newWarehouse;
  },

  async listInward(query = {}) {
    let result = [...mockDb.inwardEntries];
    if (query.warehouseId && query.warehouseId !== "all") {
      result = result.filter((e) => e.warehouseId === query.warehouseId);
    }
    if (query.status && query.status !== "all") {
      result = result.filter((e) => e.status.toLowerCase() === String(query.status).toLowerCase());
    }
    return { data: result, total: result.length };
  },

  async getInwardById(id) {
    const entry = mockDb.inwardEntries.find((e) => e.id === id || e.grnNo === id);
    if (!entry) {
      throw new ApiError("not_found", `Inward transaction "${id}" not found.`, { status: 404 });
    }
    return entry;
  },

  async createInward(rawBody) {
    const parsed = CreateInwardInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError("validation", "Inward submission invalid.", {
        status: 400,
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;
    const wh = mockDb.warehouses.find((w) => w.id === input.warehouseId);
    if (!wh) {
      throw new ApiError("not_found", "Selected warehouse does not exist.", { status: 404 });
    }

    const grnNo = `GRN-${new Date().getFullYear().toString().slice(2)}09-${Math.floor(1000 + Math.random() * 9000)}`;

    // Process line items and update balances atomically
    let totalAmount = 0;
    const resolvedLines = [];

    for (const line of input.lineItems) {
      const item = mockDb.items.find((i) => i.id === line.itemId);
      if (!item) {
        throw new ApiError("not_found", `Item "${line.itemId}" not found in catalogue.`, { status: 404 });
      }

      const qty = Number(line.quantity);
      const rate = Number(line.rate) || 0;
      const amount = qty * rate;
      totalAmount += amount;

      resolvedLines.push({
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unit,
        quantity: qty,
        rate,
        amount,
      });

      // Update warehouse stock
      let wb = mockDb.warehouseBalances.find((b) => b.warehouseId === wh.id && b.itemId === item.id);
      if (!wb) {
        wb = { warehouseId: wh.id, itemId: item.id, quantity: 0 };
        mockDb.warehouseBalances.push(wb);
      }
      wb.quantity += qty;

      // Update total item stock
      item.currentStock += qty;
      item.status = item.currentStock <= item.reorderLevel ? "Low Stock" : "In Stock";

      // Append stock ledger entry
      mockDb.ledgerEntries.unshift({
        id: `led-${Date.now()}-${item.id}`,
        date: input.date,
        voucherNo: grnNo,
        type: "Inward",
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unit,
        warehouseId: wh.id,
        warehouseName: wh.name,
        quantityIn: qty,
        quantityOut: 0,
        balance: item.currentStock,
        reference: `Supplier Inward • ${input.supplier}`,
        createdAt: new Date().toISOString(),
      });
    }

    const newEntry = {
      id: `inw-${Date.now()}`,
      grnNo,
      supplier: input.supplier,
      warehouseId: wh.id,
      warehouseName: wh.name,
      date: input.date,
      status: input.status || "Received",
      totalItems: resolvedLines.length,
      totalAmount,
      remarks: input.remarks || "",
      lineItems: resolvedLines,
      createdAt: new Date().toISOString(),
    };

    mockDb.inwardEntries.unshift(newEntry);
    return newEntry;
  },

  async listOutward(query = {}) {
    let result = [...mockDb.outwardEntries];
    if (query.warehouseId && query.warehouseId !== "all") {
      result = result.filter((e) => e.warehouseId === query.warehouseId);
    }
    if (query.status && query.status !== "all") {
      result = result.filter((e) => e.status.toLowerCase() === String(query.status).toLowerCase());
    }
    return { data: result, total: result.length };
  },

  async getOutwardById(id) {
    const entry = mockDb.outwardEntries.find((e) => e.id === id || e.deliveryNoteNo === id);
    if (!entry) {
      throw new ApiError("not_found", `Outward transaction "${id}" not found.`, { status: 404 });
    }
    return entry;
  },

  async createOutward(rawBody) {
    const parsed = CreateOutwardInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError("validation", "Outward issue details invalid.", {
        status: 400,
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;
    const wh = mockDb.warehouses.find((w) => w.id === input.warehouseId);
    if (!wh) {
      throw new ApiError("not_found", "Dispatch warehouse not found.", { status: 404 });
    }

    // Check stock availability and reject negative stock!
    for (const line of input.lineItems) {
      const item = mockDb.items.find((i) => i.id === line.itemId);
      if (!item) {
        throw new ApiError("not_found", `Item "${line.itemId}" does not exist.`, { status: 404 });
      }

      const wb = mockDb.warehouseBalances.find((b) => b.warehouseId === wh.id && b.itemId === item.id);
      const available = wb ? wb.quantity : 0;
      const requested = Number(line.quantity);

      if (available < requested) {
        throw new ApiError(
          "validation",
          `Insufficient stock available for "${item.itemName}" (${item.itemCode}) in ${wh.name}. Available: ${available} ${item.unit}, Requested: ${requested} ${item.unit}. Negative stock is disallowed.`,
          {
            status: 400,
            code: "INSUFFICIENT_STOCK",
            fieldErrors: {
              lineItems: [`Requested quantity (${requested}) exceeds available stock (${available}) for ${item.itemCode}.`],
            },
          }
        );
      }
    }

    // Deduct stock atomically
    let totalAmount = 0;
    const resolvedLines = [];

    for (const line of input.lineItems) {
      const item = mockDb.items.find((i) => i.id === line.itemId);
      const qty = Number(line.quantity);
      const rate = Number(line.rate) || 0;
      const amount = qty * rate;
      totalAmount += amount;

      resolvedLines.push({
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unit,
        quantity: qty,
        rate,
        amount,
        remarks: line.remarks || "",
      });

      const wb = mockDb.warehouseBalances.find((b) => b.warehouseId === wh.id && b.itemId === item.id);
      wb.quantity -= qty;

      item.currentStock -= qty;
      item.status = item.currentStock <= 0 ? "Out of Stock" : item.currentStock <= item.reorderLevel ? "Low Stock" : "In Stock";

      // Ledger entry
      mockDb.ledgerEntries.unshift({
        id: `led-${Date.now()}-${item.id}`,
        date: input.date,
        voucherNo: `DN-${Math.floor(26090000 + Math.random() * 9999)}`,
        type: "Outward",
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unit,
        warehouseId: wh.id,
        warehouseName: wh.name,
        quantityIn: 0,
        quantityOut: qty,
        balance: wb.quantity,
        reference: `Issue to ${input.destination}`,
        createdAt: new Date().toISOString(),
      });
    }

    const deliveryNoteNo = `DN-${new Date().getFullYear().toString().slice(2)}09-${Math.floor(1000 + Math.random() * 9000)}`;
    const newEntry = {
      id: `out-${Date.now()}`,
      deliveryNoteNo,
      purpose: input.purpose,
      destination: input.destination,
      warehouseId: wh.id,
      warehouseName: wh.name,
      date: input.date,
      status: input.status || "Dispatched",
      totalItems: resolvedLines.length,
      totalAmount,
      authorization: input.authorization || "",
      remarks: input.remarks || "",
      lineItems: resolvedLines,
      createdAt: new Date().toISOString(),
    };

    mockDb.outwardEntries.unshift(newEntry);
    return newEntry;
  },

  async getLedger(query = {}) {
    let result = [...mockDb.ledgerEntries];

    if (query.itemId && query.itemId !== "all") {
      result = result.filter((e) => e.itemId === query.itemId || e.itemCode === query.itemId);
    }
    if (query.warehouseId && query.warehouseId !== "all" && query.warehouseId !== "All Warehouses") {
      result = result.filter((e) => e.warehouseId === query.warehouseId || e.warehouseName === query.warehouseId);
    }

    // Compute summary
    const selectedItem = mockDb.items.find((i) => i.id === query.itemId || i.itemCode === query.itemId) || mockDb.items[0];
    const totalInward = result.reduce((acc, row) => acc + (row.quantityIn || 0), 0);
    const totalOutward = result.reduce((acc, row) => acc + (row.quantityOut || 0), 0);
    const closingBalance = result.length > 0 ? result[0].balance : selectedItem.currentStock;
    const openingBalance = closingBalance - totalInward + totalOutward;

    const summary = {
      openingBalance: Math.max(0, openingBalance),
      totalInward,
      totalOutward,
      closingBalance,
      unit: selectedItem.unit,
      asOnDate: "01 Sep 2026",
      inwardMovementsCount: result.filter((r) => r.quantityIn > 0).length,
      outwardMovementsCount: result.filter((r) => r.quantityOut > 0).length,
    };

    return {
      data: result,
      summary,
      total: result.length,
    };
  },

  async listTransfers(query = {}) {
    let result = [...mockDb.transfers];
    if (query.status && query.status !== "all") {
      result = result.filter((t) => t.status.toLowerCase() === String(query.status).toLowerCase());
    }
    return { data: result, total: result.length };
  },

  async createTransfer(rawBody) {
    const parsed = CreateTransferInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError("validation", "Stock transfer validation failed.", {
        status: 400,
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;
    const fromWh = mockDb.warehouses.find((w) => w.id === input.fromWarehouseId);
    const toWh = mockDb.warehouses.find((w) => w.id === input.toWarehouseId);

    if (!fromWh || !toWh) {
      throw new ApiError("not_found", "Origin or destination warehouse does not exist.", { status: 404 });
    }

    // Verify stock at source
    for (const line of input.lineItems) {
      const item = mockDb.items.find((i) => i.id === line.itemId);
      if (!item) {
        throw new ApiError("not_found", `Item "${line.itemId}" not found.`, { status: 404 });
      }

      const wb = mockDb.warehouseBalances.find((b) => b.warehouseId === fromWh.id && b.itemId === item.id);
      const available = wb ? wb.quantity : 0;
      if (available < line.quantity) {
        throw new ApiError(
          "validation",
          `Source warehouse "${fromWh.name}" has insufficient stock for "${item.itemName}". Available: ${available}, Requested: ${line.quantity}.`,
          { status: 400, code: "INSUFFICIENT_STOCK" }
        );
      }
    }

    // Execute transfer movement atomically
    const resolvedLines = [];
    for (const line of input.lineItems) {
      const item = mockDb.items.find((i) => i.id === line.itemId);
      const qty = Number(line.quantity);

      resolvedLines.push({
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unit,
        quantity: qty,
      });

      // Deduct from source
      const srcWb = mockDb.warehouseBalances.find((b) => b.warehouseId === fromWh.id && b.itemId === item.id);
      srcWb.quantity -= qty;

      // Add to destination
      let dstWb = mockDb.warehouseBalances.find((b) => b.warehouseId === toWh.id && b.itemId === item.id);
      if (!dstWb) {
        dstWb = { warehouseId: toWh.id, itemId: item.id, quantity: 0 };
        mockDb.warehouseBalances.push(dstWb);
      }
      dstWb.quantity += qty;

      // Transfer ledger out from source
      mockDb.ledgerEntries.unshift({
        id: `led-${Date.now()}-trf-out`,
        date: input.date,
        voucherNo: `ST-${Math.floor(26090000 + Math.random() * 9999)}`,
        type: "Transfer",
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unit,
        warehouseId: fromWh.id,
        warehouseName: fromWh.name,
        quantityIn: 0,
        quantityOut: qty,
        balance: srcWb.quantity,
        reference: `Transfer To ${toWh.name}`,
        createdAt: new Date().toISOString(),
      });

      // Transfer ledger in at destination
      mockDb.ledgerEntries.unshift({
        id: `led-${Date.now()}-trf-in`,
        date: input.date,
        voucherNo: `ST-${Math.floor(26090000 + Math.random() * 9999)}`,
        type: "Transfer",
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unit,
        warehouseId: toWh.id,
        warehouseName: toWh.name,
        quantityIn: qty,
        quantityOut: 0,
        balance: dstWb.quantity,
        reference: `Transfer From ${fromWh.name}`,
        createdAt: new Date().toISOString(),
      });
    }

    const transferNo = `ST-2609-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTransfer = {
      id: `trf-${Date.now()}`,
      transferNo,
      fromWarehouseId: fromWh.id,
      fromWarehouseName: fromWh.name,
      toWarehouseId: toWh.id,
      toWarehouseName: toWh.name,
      date: input.date,
      itemsCount: resolvedLines.length,
      status: "In Transit",
      reason: input.reason,
      lineItems: resolvedLines,
      createdAt: new Date().toISOString(),
    };

    mockDb.transfers.unshift(newTransfer);
    return newTransfer;
  },

  async listReconciliations(query = {}) {
    let result = [...mockDb.reconciliationRecords];
    if (query.warehouseId && query.warehouseId !== "all" && query.warehouseId !== "All Warehouses") {
      result = result.filter((r) => r.warehouseId === query.warehouseId || r.warehouseName === query.warehouseId);
    }
    return {
      data: result,
      summary: {
        totalChecked: 2412,
        matched: 2368,
        discrepancies: 44,
        pending: 435,
      },
    };
  },

  async startReconciliation(rawBody) {
    const parsed = StartReconciliationInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError("validation", "Start reconciliation data invalid.", {
        status: 400,
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;
    const wh = mockDb.warehouses.find((w) => w.id === input.warehouseId);
    if (!wh) {
      throw new ApiError("not_found", "Warehouse not found.", { status: 404 });
    }

    return {
      success: true,
      reconciliationId: `rec-batch-${Date.now()}`,
      message: `Reconciliation initiated for warehouse ${wh.name} assigned to ${input.assignedTo}.`,
    };
  },

  async getAging(query = {}) {
    const buckets = [
      { bucket: "0-30 days", value: 84200000, percentage: 68, color: "#10b981", count: 1840 },
      { bucket: "31-60 days", value: 19600000, percentage: 16, color: "#2e73d1", count: 420 },
      { bucket: "61-90 days", value: 11200000, percentage: 9, color: "#f59e0b", count: 260 },
      { bucket: "90+ days", value: 8540000, percentage: 7, color: "#ef4444", count: 190 },
    ];

    const itemDetails = [
      {
        id: "age-1",
        itemCode: "CBL-1.5-3C",
        itemName: "Copper Armoured Cable",
        warehouseName: "Pune Main WH",
        quantity: 1850,
        unit: "Mtr",
        ageDays: 18,
        value: 459000,
        lastMovementDate: "24 Aug 2026",
      },
      {
        id: "age-2",
        itemCode: "DB-12WAY-SPN",
        itemName: "12 Way SPN Distribution Board",
        warehouseName: "Mumbai Yard WH",
        quantity: 64,
        unit: "Nos",
        ageDays: 47,
        value: 660000,
        lastMovementDate: "26 Jul 2026",
      },
      {
        id: "age-3",
        itemCode: "TRF-250KVA",
        itemName: "250 KVA Distribution Transformer",
        warehouseName: "Pune Main WH",
        quantity: 8,
        unit: "Nos",
        ageDays: 76,
        value: 3840000,
        lastMovementDate: "27 Jun 2026",
      },
      {
        id: "age-4",
        itemCode: "CT-200-5A",
        itemName: "200/5A Current Transformer",
        warehouseName: "Nagpur Site WH",
        quantity: 22,
        unit: "Nos",
        ageDays: 124,
        value: 176000,
        lastMovementDate: "10 May 2026",
      },
    ];

    return {
      buckets,
      totalValue: 123500000,
      itemDetails,
    };
  },

  async listDeliveryNotes(query = {}) {
    let result = [...mockDb.deliveryNotes];
    if (query.status && query.status !== "all") {
      result = result.filter((d) => d.status.toLowerCase() === String(query.status).toLowerCase());
    }
    return { data: result, total: result.length };
  },

  async createDeliveryNote(rawBody) {
    const parsed = CreateDeliveryNoteInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError("validation", "Delivery note inputs invalid.", {
        status: 400,
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;
    const wh = mockDb.warehouses.find((w) => w.id === input.warehouseId);
    const dnNo = `DN-2609-${Math.floor(1000 + Math.random() * 9000)}`;

    const newNote = {
      id: `dn-${Date.now()}`,
      dnNo,
      date: input.deliveryDate,
      customer: input.customer,
      salesInvoiceRef: input.salesInvoiceRef,
      itemsCount: 3,
      warehouseId: input.warehouseId,
      warehouseName: wh ? wh.name : "Main Warehouse",
      status: "Pending",
      vehicleNo: input.vehicleNo || "",
      transporterName: input.transporterName || "",
      contactPhone: input.contactPhone || "",
      lineItems: [],
      createdAt: new Date().toISOString(),
    };

    mockDb.deliveryNotes.unshift(newNote);
    return newNote;
  },

  async listInvoices(query = {}) {
    let result = [...mockDb.salesInvoices];
    if (query.status && query.status !== "all") {
      result = result.filter((i) => i.status.toLowerCase() === String(query.status).toLowerCase());
    }
    return { data: result, total: result.length };
  },

  async createInvoice(rawBody) {
    const parsed = CreateInvoiceInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError("validation", "Invoice input invalid.", {
        status: 400,
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;
    let subtotal = 0;
    const resolvedLines = input.lineItems.map((l) => {
      const item = mockDb.items.find((i) => i.id === l.itemId) || { itemCode: "ITEM", itemName: "General Item" };
      const amount = l.qty * l.rate;
      subtotal += amount;
      return {
        itemId: l.itemId,
        itemCode: item.itemCode,
        description: item.itemName,
        qty: l.qty,
        rate: l.rate,
        taxPercent: l.taxPercent || 18,
        amount,
      };
    });

    const taxAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + taxAmount;
    const invoiceNo = `INV-2609-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNo,
      date: input.invoiceDate,
      dueDate: input.dueDate,
      customer: input.customer,
      customerGstin: input.customerGstin || "",
      itemsCount: resolvedLines.length,
      subtotal,
      taxAmount,
      totalAmount,
      status: "Draft",
      paymentTerms: input.paymentTerms || "Net 15",
      remarks: input.remarks || "",
      lineItems: resolvedLines,
      createdAt: new Date().toISOString(),
    };

    mockDb.salesInvoices.unshift(newInvoice);
    return newInvoice;
  },
};
