# Phase 06: Workshop Final Invoicing & Insurance Split Settlement Specification

**Document ID:** `TRANSFORMATION-06-INVOICING-SPLIT-SETTLEMENT`  
**System:** Antigravity Workshop & POS ERP System (Enterprise UI/UX Modernization)  
**Phase:** Phase 06 — Workshop Final Invoicing, Insurance Split Billing & Collections Studio  
**Date:** November 2026  
**Status:** Approved & Verified (32 / 32 Tests Passing)  

---

## 1. Executive Summary & Domain Scope

Phase 06 establishes the financial settlement and tax invoicing engine of the Antigravity Workshop & POS ERP (`/workshop/invoice/:id`). Prior to Phase 06, collision garages faced complex manual calculations to separate **Insurance Approved Payables** from **Customer Excess**, handle partial advance deposits, track insurance company cheques, and generate compliant A4 invoices.

Phase 06 resolves this by providing an enterprise two-column Invoicing Studio with a live step-down split billing engine, multi-method payment receipt collection, and dual-format print previews (A4 Tax Invoice & 80mm Cashier Thermal Slip).

---

## 2. Split Billing Step-Down Engine & Financial Formulas

The engine operates on exact rupee calculations with zero rounding drift:

```
+-----------------------------------------------------------------------------------------+
|                               FINANCIAL STEP-DOWN ENGINE                                |
+-----------------------------------------------------------------------------------------+
|  1. Section 1 (Remove & Reassemble) Subtotal                                            |
|  +  Section 2 (Repair Labor & Sublet) Subtotal                                          |
|  +  Section 3 (Replacement Spare Parts) Subtotal                                        |
|  ─────────────────────────────────────────────────────────────────                      |
|  =  Gross Invoice Total (Rs.)                                                           |
|                                                                                         |
|  -  Negotiated / Flat Discount (Rs.)                                                    |
|  +  Applicable VAT / Workshop Service Tax (Rs.)                                         |
|  ─────────────────────────────────────────────────────────────────                      |
|  =  Grand Total Net Sales (Rs.)                                                         |
|                                                                                         |
|       │                                                                                 |
|       ├── Insurance Approved Liability (Rs.) ──► Billed to Insurer Ledger (A/R)         |
|       │                                                                                 |
|       └── Customer Excess Payable (Rs.)      ──► Billed to Vehicle Owner               |
|            - Customer Advance Deposit (Rs.)                                             |
|            ───────────────────────────────────────────────────────                      |
|            = Customer Balance Due Today (Rs.)                                           |
+-----------------------------------------------------------------------------------------+
```

### Formula Precision Standards
$$\text{Gross Total} = \sum \text{RemoveReassemble} + \sum \text{Repair} + \sum \text{Replacement}$$
$$\text{Net Total} = \max(0, \text{Gross Total} - \text{Discount}) + \text{Tax}$$
$$\text{Customer Payable} = \max(0, \text{Net Total} - \text{Insurance Approved})$$
$$\text{Customer Balance Due} = \max(0, \text{Customer Payable} - \text{Advance Paid})$$
$$\text{Insurance Balance Due} = \max(0, \text{Insurance Approved} - \text{Insurance Settled})$$

---

## 3. Dynamic Payment Status State Machine

The document's payment status transitions automatically as partial receipts are logged:

```
        ┌─────────────────────────────────────────────────────────────┐
        │                          UNPAID                             │
        │      (Zero advance collected and Balance Due > 0)           │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
                        Advance / Deposit Collected
                                       │
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                      PARTIALLY_PAID                         │
        │       (Partial payment logged, Balance Due > 0)             │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
                 Final Customer Excess + Insurance Settled
                                       │
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                           PAID                              │
        │    (Customer Balance Due = 0 AND Insurance Balance = 0)     │
        └─────────────────────────────────────────────────────────────┘
```

---

## 4. Invoicing Studio Layout (`/workshop/invoice/:id`)

The Invoicing Studio is structured as an ergonomic split workspace:

```
+----------------------------------------------------------------------------------------------------+
|  [< Back to Jobs]  Workshop Invoicing Studio / JOB-0042        [Cost Mode] [Baseline Audit] [Print]|
|  WP CBA-9988 · Toyota Premio F-EX                              [INVOICE] [PARTIALLY PAID]          |
+--------------------------------------------------+-------------------------------------------------+
| LEFT COLUMN (60%): Document Scope & Parts Ledger | RIGHT COLUMN (40%): Settlement & Split Terminal |
+--------------------------------------------------+-------------------------------------------------+
| 1. Vehicle & Customer Dossier Card               | 1. Live Gross Profit & Margin Ribbon (Admin)    |
|    - Plate: WP CBA-9988 | NZE141-889922          |    - Revenue: Rs. 145,000 | Profit: Rs. 45,000  |
|    - Owner: Rohan Wickramasinghe · 077 123 4567  |    - Health: Optimal Margin (38.2%)             |
|    - Insurer: Sri Lanka Insurance Corp (SLIC)    |                                                 |
|                                                  | 2. Insurance Split Billing Calculator           |
| 2. Three-Section Itemized Repair Scope           |    - Total Invoice: Rs. 145,000.00              |
|    - Section 1: R&R Labor (2 Items)              |    - Insurance Approved: [ Rs. 100,000.00 ]     |
|    - Section 2: Repair Labor (3 Items)           |    - Customer Excess: Rs. 45,000.00             |
|    - Section 3: Replacement Parts (4 Items)      |    - Advance Paid: [ Rs. 20,000.00 ]            |
|      * Supplementary lines badged [SUPPLEMENTARY]|    - Customer Balance Due: Rs. 25,000.00        |
|                                                  |                                                 |
| 3. Payment Receipt Collection History            | 3. Quick Payment Action Matrix                  |
|    - RCP-001 | Nov 02 | Advance | Rs. 20,000    |    - [Record Advance Deposit]                   |
|    - RCP-002 | Nov 04 | Card    | Rs. 25,000    |    - [Collect Customer Excess]                  |
|    - View Receipt / Thermal Reprint Button       |    - [Receive Insurance Cheque / Bank Transfer] |
+--------------------------------------------------+-------------------------------------------------+
```

---

## 5. Dual Format Print Output

### 5.1 Official A4 Vehicle Repair Tax Invoice (`A4WorkshopPrint.tsx`)
* **Company Brand Header:** Workshop title, branch address, telephone, and business registration.
* **12-Field Vehicle Dossier Grid:** Registration plate, chassis number, make, model, year, and insurer.
* **Itemized Repair Sections:** Clean 3-section tables with item descriptions, supplementary badges, and selling prices.
* **Itemized Payment History Table:**
  Displays all recorded advance deposits and installment receipts (`Receipt #`, `Date`, `Category`, `Method`, `Ref #`, `Amount Paid`, `Balance`).
* **Financial Totals Summary Block:**
  Displays Gross Total, Discounts, Tax, Insurance Approved, Customer Payable, Advance Credited, and Balance Due.
* **Privacy Assurance:** Buying costs and profit margins are **100% stripped** from the print DOM.

### 5.2 80mm Thermal Cashier Slip (`WorkshopPaymentThermalReceipt.tsx`)
* Designed for POS counter receipt printers (80mm width).
* Monospace receipt typography displaying branch header, vehicle plate, receipt number, cashier name, payment category, amount tendered, and remaining customer balance.

---

## 6. Verification & Quality Gates

| Verification Gate | Result | Notes |
| :--- | :--- | :--- |
| **Split Billing & State Machine (`tests/workshop-invoicing-payments.test.tsx`)** | **16 / 16 Passed (100%)** | Mathematical formulas, payment transitions, print layouts |
| **Invoicing Terminal Studio (`tests/workshop-invoice-terminal.test.tsx`)** | **16 / 16 Passed (100%)** | Two-column layout, quick deposits, modal payments, role privacy |
| **Total Phase 06 Test Coverage** | **32 / 32 Passed (100%)** | Zero failures or regressions |
| **Full Repository Regression Suite** | **508 / 508 Passed (100%)** | All 28 test suites passing cleanly |
| **TypeScript Strict Compilation** | **0 Errors** | Strict type definitions enforced |
| **Vite Production Build** | **Success (~720ms)** | Production bundle ready |

---

## 7. Deliverable Documentation
* Specifications recorded in [`docs/ui-ux-transformation/06-workshop-final-invoicing-split-settlement.md`](file:///Users/chandupa/vehicle-repair/docs/ui-ux-transformation/06-workshop-final-invoicing-split-settlement.md).
