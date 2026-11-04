# Phase 08: Embedded Finance & Unified Gross Profit Center Specification

**Document ID:** `TRANSFORMATION-08-FINANCE-GROSS-PROFIT`  
**System:** Antigravity Workshop & POS ERP System (Enterprise UI/UX Modernization)  
**Phase:** Phase 08 — Embedded Finance, Sales, Cost & Unified Gross Profit Center  
**Date:** November 2026  
**Status:** Approved & Verified (41 / 41 Tests Passing)  

---

## 1. Executive Summary & Financial Architecture

Phase 08 unites all financial streams across the enterprise into a consolidated **Gross Profit Center**:
* **Screenshot 05:** Profit & Financial Ledger (`/finance/profit-ledger`) — Interleaved financial journal combining Workshop Invoices, Counter POS Sales, and Shop Overhead Expenses.
* **Screenshot 09:** Shop Expenses Register (`/finance/expenses`) — Garage operating expenses (rent, electricity, welding gas, consumables).

---

## 2. Core Financial Mathematical Engine

$$\text{Workshop Gross Profit} = \text{Invoiced Workshop Revenue} - \text{Workshop Direct Buying Costs}$$
$$\text{POS Gross Profit} = \text{Counter POS Sales Revenue} - \text{POS Direct Buying Costs}$$
$$\text{Combined Gross Profit} = \text{Workshop Gross Profit} + \text{POS Gross Profit}$$
$$\text{Net Operating Profit} = \text{Combined Gross Profit} - \text{Daily Operating Expenses}$$
$$\text{Gross Margin \%} = \left(\frac{\text{Combined Gross Profit}}{\text{Total Net Sales}}\right) \times 100$$
$$\text{Total Receivables} = \text{Pending Insurance Claims} + \text{Customer Balances Due}$$

---

## 3. Profit & Loss Ledger Architecture (`/finance/profit-ledger` — Screenshot 05)

```
+----------------------------------------------------------------------------------------------------+
|  Profit & Financial Ledger                             [Today] [This Week] [This Month] [All Time] |
|  Unified gross revenue, direct part/sublet costs, and net operating profit.  [👁️ Privacy] [Export]|
+----------------------------------------------------------------------------------------------------+
| Consolidated Executive Financial Cockpit (5 High-Density Cards):                                   |
| +-------------------+ +-------------------+ +-------------------+ +-----------------+ +------------+ |
| | Total Net Sales   | | Direct Costs      | | Combined Gross Pft| | Gross Margin %  | | Net Profit | |
| | Rs. 445,000.00    | | Rs. 265,000.00    | | + Rs. 180,000.00  | | 40.4% Optimal   | | Rs. 142k   | |
| +-------------------+ +-------------------+ +-------------------+ +-----------------+ +------------+ |
+----------------------------------------------------------------------------------------------------+
| Filter Ribbon: [All Types (34)]  [Workshop Invoices (18)]  [POS Sales (12)]  [Shop Expenses (4)]    |
| Search: [Search plate, invoice #, receipt #, voucher #, customer...]                               |
+----------------------------------------------------------------------------------------------------+
| Interleaved Financial Journal Table:                                                               |
| Date & Time    | Type     | Reference #    | Entity / Description         | Sales (Rs.) | Margin %  |
| 2026-11-04 10:15| INVOICE  | JOB-2026-0042  | WP CBA-9988 (Premio F-EX)    |  145,000.00 |  38.2% 🟢 |
| 2026-11-04 11:30| POS_SALE | POS-2026-0014  | Walk-in Customer (Mobil 1)   |   18,500.00 |  28.5% 🟡 |
| 2026-11-04 12:45| EXPENSE  | EXP-2026-0008  | Workshop Welding Gas Refill  |   -6,500.00 |   N/A     |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. Shop Operating Expenses (`/finance/expenses` — Screenshot 09)

* **Overhead Recording (`DailyExpenseModal.tsx`):** Logs workshop rent, electricity, mechanic tools, courier charges, and consumables.
* **Payment Source Routing:**
  - `POS_DRAWER`: Automatically creates a `PETTY_CASH_OUT` entry in the active register shift, deducting drawer cash and tracking the voucher ID.
  - `BANK_TRANSFER` / `PETTY_CASH` / `DIRECT_CASH`: Handled via standard company accounting.
* **Deletion Protection:**
  - Deleting an expense paid from `POS_DRAWER` reverses the cash-out if the shift is `OPEN`.
  - Blocks deletion if the linked POS shift is already `CLOSED` (immutable financial audit trail).

---

## 5. Shared-Screen Privacy Mode & Cost Security

```
+-----------------------------------------------------------------------------------------+
|                               COST PRIVACY INVARIANTS                                   |
+-----------------------------------------------------------------------------------------+
| 1. Role-Based Permission Gate (`RolePermissionGateWrapper`):                            |
|    - Allowed: `OWNER`, `WORKSHOP_MANAGER`                                               |
|    - Blocked: `SERVICE_ADVISOR`, `CASHIER`, `TECHNICIAN`                                |
|    - Unauthorized roles receive a clear "Access Restricted" alert and cannot access DOM |
|                                                                                         |
| 2. Shared-Screen Presentation Mode (`toggle-privacy-btn`):                              |
|    - 1-click toggle when showing screen to customer or outside insurance assessor       |
|    - Direct buying costs and line profits convert to `Rs. ••••••`                       |
|    - Margin percentages and sparklines are masked                                       |
|                                                                                         |
| 3. Customer Export Sanitization:                                                        |
|    - CSV / Excel exports generated in privacy mode strip direct costs and gross profit  |
|    - Table elements enforce `cost-column`, `cost-cell`, and `print-hidden` classes       |
+-----------------------------------------------------------------------------------------+
```

---

## 6. Verification & Quality Gates

| Verification Gate | Result | Notes |
| :--- | :--- | :--- |
| **Mathematical Formulas & Aggregations** | **6 / 6 Passed (100%)** | Gross profit, net profit, margin %, receivables |
| **Shop Expenses CRUD & Shift Sync** | **8 / 8 Passed (100%)** | Expense logging, drawer cash-out, delete reversal |
| **Date Range Filtering Logic** | **2 / 2 Passed (100%)** | Today, week, month, all-time, leap years |
| **Strict Role Permission Guards** | **5 / 5 Passed (100%)** | Owner/Manager allowed, Cashier/Tech blocked |
| **Unified Profit Ledger UI & Journal** | **9 / 9 Passed (100%)** | Ledger table, type filtering, receipts reprint |
| **Confidency OS Cockpit & Privacy Bounds** | **11 / 11 Passed (100%)**| 5-card cockpit, cipher placeholders, print rules |
| **Total Phase 08 Test Coverage** | **41 / 41 Passed (100%)** | Complete passing test suite |
| **Full Regression Test Suite** | **508 / 508 Passed (100%)** | All 28 test suites passing cleanly |
| **TypeScript Strict Compilation** | **0 Errors** | Strict type definitions |
| **Vite Production Build** | **Success (575ms)** | Clean production bundle |

---

## 7. Deliverable Documentation
* Specifications recorded in [`docs/ui-ux-transformation/08-embedded-finance-gross-profit-center.md`](file:///Users/chandupa/vehicle-repair/docs/ui-ux-transformation/08-embedded-finance-gross-profit-center.md).
