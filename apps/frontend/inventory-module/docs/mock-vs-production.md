# ELVA ERP — Mock Environment vs Real Production API

> Architectural comparison, transport behaviors, and production readiness requirements.

---

## 1. Architectural Overview

```mermaid
flowchart TD
    UI[Frontend UI Components & Pages] --> SVC[Feature Services Layer]
    SVC --> CLIENT[Centralized API Client]
    
    CLIENT --> MODE{VITE_API_MODE}
    
    MODE -- "mock" --> ADAPTER[MockApiAdapter]
    ADAPTER --> DB[(Seeded Mock Database)]
    ADAPTER --> LOG[(In-Memory Stock Ledger)]
    
    MODE -- "real" --> FETCH[Real HTTP Transport]
    FETCH --> GATEWAY[ELVA ERP API Gateway]
    GATEWAY --> BACKEND[Inventory Backend Microservice]
    BACKEND --> PROD_DB[(PostgreSQL / ACID Transactions)]
    
    FETCH -.x|Failures NEVER fall back to Mock| ADAPTER
```

---

## 2. Feature Comparison Matrix

| Capability | Mock Environment (`mock`) | Production Backend (`real`) |
|---|---|---|
| **Data Persistence** | In-memory JavaScript heap; resets on page reload or via `resetMockDatabase()` | Relational PostgreSQL database with ACID transaction durability |
| **Stock Balance Atomicity** | Synchronous JavaScript state updates guarded by Zod validation | Multi-row database transactions guarded by `SELECT ... FOR UPDATE` |
| **Negative Stock Prevention** | Validated in memory: throws `ApiError(400, "INSUFFICIENT_STOCK")` | Enforced by SQL `CHECK (quantity >= 0)` constraint and transaction rollback |
| **Stock Ledger Audit** | Synchronously prepends running balance rows to `mockDb.ledgerEntries` | Immutable append-only audit table with database sequence vouchers |
| **Inter-Warehouse Transfers** | Atomically decrements source and increments destination | Distributed two-phase commit or transactional outbox with in-transit states |
| **Idempotency** | In-memory `Set` of processed `Idempotency-Key` tokens | Redis / DB-backed idempotency table with TTL expiration |
| **Authentication** | Seeded prototype identity (Suresh Patil, Inventory Head) | ELVA IAM SSO / OAuth2 session cookies with JWT signature verification |
| **Network Failure Handling** | Instant local response (< 50ms) | Network timeouts, retry policies, AbortSignal handling |

---

## 3. Strict Real Mode Separation Safeguard

A critical architectural mandate is that **production requests must never silently fall back to mock data**:

```javascript
// src/lib/apiClient.js
if (isMockMode()) {
  return mockAdapterInstance.handleRequest(path, options);
}

// In Real Mode, only genuine fetch is executed
const response = await fetch(fullUrl, { ... });
if (!response.ok) {
  // Throws ApiError directly to UI.
  // NEVER catches error to return mockDb!
  throw new ApiError(kind, message, parsed);
}
```

This guarantee has been verified in automated test suite `tests/apiClient.test.js`:
- Test: `"should fail explicitly and NEVER fall back to mock data when real mode is configured"`: **PASSED**.

---

## 4. Production Backend Requirements for Go-Live

When implementing the real backend microservice in Go, Java, or Node.js:
1. **Pessimistic Concurrency**:
   ```sql
   BEGIN;
   -- Lock source stock row
   SELECT quantity FROM warehouse_balances 
   WHERE warehouse_id = $1 AND item_id = $2 
   FOR UPDATE;
   
   -- Verify sufficient stock
   -- Deduct stock
   UPDATE warehouse_balances SET quantity = quantity - $3 
   WHERE warehouse_id = $1 AND item_id = $2;
   
   -- Write ledger voucher
   INSERT INTO stock_ledger (...) VALUES (...);
   COMMIT;
   ```
2. **Idempotency Cache**:
   Store `Idempotency-Key` headers in Redis for 24 hours. If a request arrives with an existing key in progress, return HTTP 409 Conflict.
3. **Cross-Module Event Emission**:
   When Inward is finalized, emit `inventory.grn.received` via Kafka/RabbitMQ so Procurement can mark the PO as fulfilled without tight coupling.

