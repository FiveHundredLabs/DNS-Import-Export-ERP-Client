# Payment Collection & Sales Collection Tracking Documentation

## 1. Executive Summary & Purpose

The **Sales Collection Tracking** system provides visibility and accountability for monetary collections performed by field personnel (Sales Representatives and Area Managers) before and independently of the Finance department's official verification, settlement, and bank reconciliation processes.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SALES COLLECTION DOMAIN                         │
│  (Sales Reps, Area Managers, Sales Managers, Managers, Directors)      │
│                                                                        │
│  Customer Payment Recorded ────────► Invoice: COLLECTED / PARTIALLY    │
│  Collector holds Cash / Cheque ─────► Field Float / Held Custody       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                     Physical Submission to Finance
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FINANCE SETTLEMENT DOMAIN                       │
│              (Finance Officers, Finance Managers, Directors)           │
│                                                                        │
│  Finance Accepts & Banks Money ────► Payment: APPROVED                 │
│  Ledger Settlement Applied ────────► Invoice: PAID / PARTIALLY_PAID    │
│                                                                        │
│  Finance Rejects Without Money ───► Payment: REJECTED                  │
│  Money remains in field float ─────► Collector STILL holds funds       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Confirmed Business Requirements & Rules Contract

### Rule 1: Separation of Sales Collection Status vs. Finance Settlement Status
- **Sales Collection Statuses** (`COLLECTED`, `PARTIALLY_COLLECTED`):
  - Reflect that field personnel have received payment from the customer against an issued invoice.
  - Calculated based on `collectedAmount` on the Invoice.
  - If `paidAmount + collectedAmount >= totalAmount`, invoice transitions to `COLLECTED`.
  - If `0 < paidAmount + collectedAmount < totalAmount`, invoice transitions to `PARTIALLY_COLLECTED`.
- **Finance Payment Statuses** (`PAID`, `PARTIALLY_PAID`):
  - Reflect official receipt, verification, and deposit of revenue by the Head Office / Finance department into corporate bank accounts.
  - Updated **only** when Finance explicitly issues `APPROVED` status on payments or handovers.
  - Sales collection tracking does **not** alter Finance settlement logic.

### Rule 2: Tracking Field Cash Held and Cheques Held Separately
- Field collectors hold physical instruments (currency notes or bank cheques) until they physically hand them over to Finance.
- **Both Cash and Cheques** must be tracked in field custody, but **displayed separately**:
  - `Cash in Hand`: Physical currency currently in custody.
  - `Cheques Held`: Post-dated or current physical cheques in custody.
  - `Total Pending Handover`: Sum of Cash in Hand + Cheques Held.

### Rule 3: Handling Finance Rejections Without Physical Custody Transfer
- If a Sales Representative or Area Manager collects money from a customer and submits a payment/handover, but the Finance department **rejects** the payment without accepting or taking physical possession of the collected funds:
  - That amount **strictly remains recorded as money currently held by that collector**.
  - The amount is **not** wiped from field float or custody summaries.
  - Held balance calculation formula:
    $$\text{Held Balance} = \sum (\text{Amount of payments where } \text{status} \in \{\text{PENDING}, \text{REJECTED}\} \land \text{status} \neq \text{APPROVED})$$

### Rule 4: Separation of Area Manager Personal vs. Team Collections
- An Area Manager may personally collect payments from key customer accounts as well as oversee assigned Sales Representatives.
- The system **strictly separates**:
  - **Area Manager Personal Collections**: Displayed in dedicated cards/rows showing only what the Area Manager collected directly.
  - **Assigned Sales Representatives**: Displayed in separate individual rows for each representative.
  - **Territory Summary**: Consolidated total of personal collections + team collections for the managed territory.
- Area Managers are strictly restricted to their assigned territory and cannot view collectors or collections from other territories.

### Rule 5: Date-Wise Collection Reporting via `collectedAt`
- All date-wise collection grouping and reports group strictly by the **`collectedAt`** timestamp (the date and time when the sales representative actually collected the funds from the customer).
- The Finance handover date is **not** used for collection reporting, as handovers belong to the separate Finance custody transfer workflow.
- Standard date presets supported:
  - `Today`
  - `Yesterday`
  - `This Week`
  - `This Month`
  - `All Time`
  - `Custom Date Range` (`startDate` to `endDate`)

---

## 3. Role-Based Access Control (RBAC) Matrix

Access to the Sales Collection Report and its underlying APIs is restricted to authorized roles with territory-based data scoping:

| Role | Access Level | Data Visibility Scope | Can Filter by Territory? | Can View Other Reps? |
|---|---|---|---|---|
| `SALES_REP` | Read Only | **Own collections only** (`collectedBy = actor.userId`) | No | No |
| `AREA_MANAGER` | Read Only | **Own collections + assigned sales reps in territory** | No (locked to assigned area) | Only assigned area reps |
| `SALES_MANAGER` | Full Read | All sales representatives and area managers | Yes (all territories) | Yes |
| `MANAGER` | Full Read | Enterprise-wide collections | Yes (all territories) | Yes |
| `DIRECTOR` | Full Read | Enterprise-wide collections | Yes (all territories) | Yes |
| `FINANCE_OFFICER` | Full Read | Enterprise-wide collections for audit & verification | Yes (all territories) | Yes |
| `FINANCE_MANAGER` | Full Read | Enterprise-wide collections for treasury & verification | Yes (all territories) | Yes |
| *Other Roles* | Denied | `403 Forbidden` (`Access denied`) | N/A | N/A |

---

## 4. Backend Architecture & API Specifications

### 4.1 Endpoint: `GET /api/v1/invoice-payments/collection-summary`

Provides comprehensive collection aggregations, date-wise breakdowns, per-collector totals, and server-side paginated detailed records.

#### Query Parameters (`CollectionSummaryQueryDto`):
| Parameter | Type | Required | Description |
|---|---|---|---|
| `startDate` | string (YYYY-MM-DD) | Optional | Beginning of collection date range (inclusive, UTC start of day) |
| `endDate` | string (YYYY-MM-DD) | Optional | End of collection date range (inclusive, UTC end of day) |
| `collectedBy` | UUID | Optional | Specific collector user ID |
| `areaId` | UUID | Optional | Filter all collections by users in this area |
| `page` | integer | Optional (default: 1) | Page index for detailed payments |
| `pageSize` | integer | Optional (default: 25) | Items per page (max: 100) |

#### Response Schema:
```json
{
  "kpi": {
    "totalCollected": 1250000.00,
    "totalApproved": 900000.00,
    "cashTotal": 500000.00,
    "chequeTotal": 450000.00,
    "bankTransferTotal": 300000.00,
    "pendingCount": 12,
    "approvedCount": 38,
    "rejectedCount": 2,
    "totalReceipts": 52
  },
  "perCollectorSummary": [
    {
      "collectorId": "4a71b123-...",
      "collectorName": "Ruwan Perera",
      "collectorRole": "AREA_MANAGER",
      "areaId": "9c12a...",
      "areaName": "Kelaniya",
      "totalCollected": 450000.00,
      "totalApproved": 300000.00,
      "cashCollected": 200000.00,
      "chequeCollected": 150000.00,
      "bankTransferCollected": 100000.00,
      "cashHeld": 50000.00,
      "chequeHeld": 100000.00,
      "totalHeld": 150000.00,
      "receiptCount": 14
    },
    {
      "collectorId": "5b82c345-...",
      "collectorName": "Kasun Jayawardena",
      "collectorRole": "SALES_REP",
      "areaId": "9c12a...",
      "areaName": "Kelaniya",
      "totalCollected": 800000.00,
      "totalApproved": 600000.00,
      "cashCollected": 300000.00,
      "chequeCollected": 300000.00,
      "bankTransferCollected": 200000.00,
      "cashHeld": 100000.00,
      "chequeHeld": 100000.00,
      "totalHeld": 200000.00,
      "receiptCount": 38
    }
  ],
  "dateWiseSummary": [
    {
      "date": "2026-11-16",
      "collectorId": "5b82c345-...",
      "collectorName": "Kasun Jayawardena",
      "collectorRole": "SALES_REP",
      "areaName": "Kelaniya",
      "totalCollected": 150000.00,
      "cashAmount": 100000.00,
      "chequeAmount": 50000.00,
      "bankTransferAmount": 0.00,
      "receiptCount": 4
    }
  ],
  "detailedPayments": {
    "data": [
      {
        "id": "7f12...",
        "paymentNumber": "REC-2026-0042",
        "collectionDate": "2026-11-16T09:45:00.000Z",
        "amount": 50000.00,
        "paymentMethod": "CASH",
        "status": "PENDING",
        "referenceNumber": "SLIP-091",
        "notes": "Cash collected from shop",
        "rejectionReason": null,
        "collector": {
          "id": "5b82c345-...",
          "fullName": "Kasun Jayawardena",
          "roleCode": "SALES_REP",
          "areaName": "Kelaniya"
        },
        "invoice": {
          "id": "99b1...",
          "invoiceNumber": "INV-2026-0112",
          "customerId": "88a0...",
          "customerName": "Metro Electricals",
          "totalAmount": 120000.00,
          "balanceAmount": 70000.00
        }
      }
    ],
    "meta": {
      "page": 1,
      "pageSize": 25,
      "total": 52,
      "totalPages": 3
    }
  }
}
```

---

### 4.2 Endpoint: `GET /api/v1/invoice-payments/cash-held`

Returns real-time Cash in Hand and Cheques Held currently in physical custody across field collectors.

#### Response Schema:
```json
{
  "summary": [
    {
      "collectorId": "5b82c345-...",
      "collectorName": "Kasun Jayawardena",
      "collectorRole": "SALES_REP",
      "areaId": "9c12a...",
      "areaName": "Kelaniya",
      "cashHeld": 100000.00,
      "chequeHeld": 100000.00,
      "totalHeld": 200000.00,
      "receiptCount": 6
    }
  ],
  "overall": {
    "cashHeld": 100000.00,
    "chequeHeld": 100000.00,
    "totalHeld": 200000.00
  }
}
```

---

## 5. Performance, Database & PgBouncer Strategy

### 5.1 Complete Summary Accuracy Independent of Pagination
- KPI aggregations (`totalCollected`, `cashCollected`, `cashHeld`, `chequeHeld`) and per-collector summaries are computed via SQL `SUM` and `GROUP BY` across the **entire filtered dataset**.
- Pagination parameters (`page`, `pageSize`) **strictly constrain only the detailed payment list (`detailedPayments`)**, preventing high memory overhead while guaranteeing exact summary figures.

### 5.2 N+1 Query Elimination
- Collector profile metadata (name, role code, area name) is resolved via a single bulk `findMany({ where: { id: { in: collectorIds } } })` query.
- Detailed payment rows eager-load invoice and collector snapshots in single indexed joins.

### 5.3 PgBouncer & Connection Pool Utilization
- All aggregation queries execute within read operations without holding long-lived transaction locks.
- Queries run in parallel using `Promise.all` over small roundtrips, allowing PgBouncer transaction-mode pooling to reuse pool connections efficiently and return them to the idle pool in less than 30ms.

### 5.4 Database Indexes Utilized
The queries leverage the following existing indexes on `"invoice_payments"`:
- `@@index([collectionDate])`: Facilitates rapid range scans (`gte`, `lte`).
- `@@index([collectedBy])`: Enables fast filtering and grouping by collector.
- `@@index([status])`: Accelerates filtering for `PENDING` and `REJECTED` payments.
- `@@index([paymentMethod])`: Speeds up payment method breakdown.

---

## 6. Frontend Architecture & Component Structure

### 6.1 Service Layer: `CollectionSummaryService.ts`
- Located at `src/services/CollectionSummaryService.ts`.
- Manages date preset calculations (`today`, `yesterday`, `this_week`, `this_month`).
- Enforces client-side authorization and territory scoping.
- Separates Area Manager personal collections from team representative collections.
- Computes separate Cash Held and Cheques Held totals.

### 6.2 Page Component: `SalesCollectionReportPage.tsx`
- Located at `src/features/reports/sales/SalesCollectionReportPage.tsx`.
- Route: `/reports/sales/collections` (guarded by `ProtectedRoute`).
- Accessible to: `SALES_REP`, `AREA_MANAGER`, `SALES_MANAGER`, `MANAGER`, `DIRECTOR`, `FINANCE_OFFICER`, `FINANCE_MANAGER`.
- Structure:
  1. **Breadcrumbs & Header**: Quick navigation, refresh button, and link to record new collections.
  2. **Filter Toolbar**: Presets (Today, Yesterday, This Week, This Month, All Time, Custom Range), territory picker, collector picker, search input.
  3. **7 KPI Summary Cards**: Total Collected, Cash In, Cheques In, Bank Transfers, Cash Held, Cheques Held, Total Held.
  4. **Tabs Interface**:
     - **Tab 1: Date-Wise Collection Summary**: Collections grouped by `collectedAt` date.
     - **Tab 2: Representative & Area Balances**:
       - Area Manager personal collection card (when logged in as Area Manager).
       - Assigned Sales Representatives table showing individual Cash Held, Cheques Held, and Total Held.
     - **Tab 3: Receipts Ledger**: Paginated table with receipt numbers, customer codes, collector roles, payment methods, and status badges.

---

## 7. Verification & Testing

### 7.1 Backend Unit Tests
- Test file: `src/modules/invoice-payments/invoice-payments.collection-summary.spec.ts`
- Coverage:
  - Role enforcement: Disallowed roles (e.g., `STOCK_KEEPER`) throw `ForbiddenException`.
  - Scoping: `SALES_REP` is restricted to own collections.
  - Area Manager scoping: `AREA_MANAGER` can access area team, but blocked from querying outside territory.
  - Cash & Cheque Held tracking: Verifies separate calculations and inclusion of `PENDING` and `REJECTED` payments.
  - Aggregations: Verifies overall KPI sums, per-collector sums, and date-wise groupings.
- Execution command:
  ```bash
  npx.cmd jest src/modules/invoice-payments/invoice-payments.collection-summary.spec.ts
  ```
  Result: **5 of 5 tests passing cleanly**.

### 7.2 Production Build Verification
- Backend NestJS compilation:
  ```bash
  npm.cmd run build
  ```
  Result: **Exit code 0 (clean)**.
- Frontend Vite compilation:
  ```bash
  npm.cmd --prefix "d:\dns erp" run build
  ```
  Result: **Exit code 0 (built in 24.15s, clean)**.
