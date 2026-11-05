# Phase 07: High-Speed Counter POS & Register Shift Management Specification

**Document ID:** `TRANSFORMATION-07-POS-TERMINAL-SHIFT`  
**System:** Antigravity Workshop & POS ERP System (Enterprise UI/UX Modernization)  
**Phase:** Phase 07 — High-Speed Counter POS Terminal & Register Shift Management  
**Date:** November 2026  
**Status:** Approved & Verified (28 / 28 Tests Passing)  

---

## 1. Executive Summary & Domain Scope

Phase 07 transforms the showroom and parts sales operations of the Antigravity Workshop & POS ERP. It encompasses two primary screens from the acceptance blueprint:
* **Screenshot 08:** Counter POS Terminal (`/pos`) — A high-velocity split-screen retail and spare parts workspace.
* **Screenshot 11:** Shift & Drawer Management (`/pos/shift`) — Start-of-day float, petty cash payouts, and drawer closing reconciliation.

---

## 2. Counter POS Terminal Architecture (`/pos` — Screenshot 08)

```
+----------------------------------------------------------------------------------------------------+
| [🟢 Scanner Ready]  Cashier: Kamal Perera · Shift: 04h 12m   [Walk-in Customer v] [Held Bills (2)] |
+----------------------------------------------------+-----------------------------------------------+
| LEFT PANE (65%): Product Catalog & Touch Grid      | RIGHT PANE (35%): Persistent Checkout Cart    |
+----------------------------------------------------+-----------------------------------------------+
| [Search SKU, Name, Barcode...] [Category Pills v]  | [Walk-in Counter Sale · 07X XXX XXXX] [Edit]  |
|                                                    +-----------------------------------------------+
| +------------------------------------------------+ | [+] Add On-The-Fly Item [Name] [Qty] [Price]  |
| | [+] On-the-fly custom part / walk-in item bar  | +-----------------------------------------------+
| +------------------------------------------------+ | Cart Lines:                                   |
| Catalog Touch Cards Grid:                          | 1. Mobil 1 5W-30 Synthetic Motor Oil (4L)     |
| +--------------------+ +-------------------------+ |    Rs. 18,500.00   [-] [ 2 ] [+]    Rs. 37,000|
| | Mobil 1 5W-30 (4L) | | Bosch Oil Filter (NZE)  | | 2. Denso Iridium Spark Plugs (Set of 4)       |
| | Stock: 24 · Rs18.5k| | Stock: 42 · Rs. 3,200   | |    Rs. 12,000.00   [-] [ 1 ] [+]    Rs. 12,000|
| | Category: Lubricant| | Category: Spare Part    | +-----------------------------------------------+
| | [+ Add to Cart]    | | [+ Add to Cart]         | Subtotal:                         Rs. 49,000.00 |
| +--------------------+ +-------------------------+ | Overall Discount:                - Rs.  2,000.00 |
| +--------------------+ +-------------------------+ | Net Total Due:                    Rs. 47,000.00 |
| | Brake Pads Front   | | NGK Spark Plugs Set     | +-----------------------------------------------+
| | Stock: 8 (Low) ⚠️  | | Stock: 15 · Rs. 6,800   | Primary Tender Action Grid:                     |
| | [+ Add to Cart]    | | [+ Add to Cart]         | [Hold Cart]  [Quick Cash & Print]  [Tender (F4)]|
+----------------------------------------------------+-----------------------------------------------+
```

### 2.1 Core Terminal Features
1. **Hardware HID Barcode Scanner Integration:**
   - Intercepts raw keystrokes at `<16ms` intervals via `PosBarcodeScannerStatusPill`.
   - Automatically increments item quantity if already present in active cart.
   - Suppresses background scanner capture when modals or slide-over drawers are open.
2. **On-the-Fly Custom Item Adder (`PosOnTheFlyCustomItemBar`):**
   - Allows instant entry of walk-in or uncataloged parts without leaving the cart.
   - Captures buying cost behind the scenes for authorized roles (`OWNER`, `MANAGER`), but completely suppresses cost input for `CASHIER`.
3. **Touchscreen Numeric Keypad (`PosTouchNumericKeypad`):**
   - Ergonomic `3 × 4` tactile grid (`1–9`, `.`, `0`, `⌫`) with instant clear and backspace support.
4. **Multi-Method Tender Modal (`PosCollectPaymentModal`):**
   - Instant denomination chips (`Rs. 1,000`, `Rs. 5,000`, `Exact Cash`).
   - Live change calculator banner.
   - Multi-tender split allocation (`Cash` + `Card` + `Bank QR`).
5. **Held Carts & Parked Bills (`PosHeldBillsDrawer`):**
   - Park current checkout session to attend to the next customer; resume with 1 click.

---

## 3. Register Shift & Drawer Cockpit (`/pos/shift` — Screenshot 11)

```
+----------------------------------------------------------------------------------------------------+
|  POS Shift & Drawer Management Cockpit                                [Open Shift] [Close Shift]   |
|  Shift Status: 🟢 ACTIVE · Duration: 05h 28m 14s · Cashier: Kamal Perera                           |
+---------------------+---------------------+---------------------+----------------------------------+
| Opening Cash Float  | Cash Sales Collected| Petty Cash Payouts  | Expected Drawer Balance          |
| Rs. 15,000.00       | Rs. 68,500.00       | - Rs. 3,500.00      | Rs. 80,000.00                    |
+---------------------+---------------------+---------------------+----------------------------------+
| Drawer Activity Ledger:                                                                            |
| Time     | Entry Type        | Description                     | Amount (Rs.)    | Running Balance |
| 08:30 AM | OPENING_FLOAT     | Start-of-day register float     | + 15,000.00     | Rs. 15,000.00   |
| 09:15 AM | CASH_SALE         | POS Receipt #POS-2026-0012      | +  4,500.00     | Rs. 19,500.00   |
| 11:00 AM | PETTY_CASH_OUT    | Workshop welding gas courier    | -  1,200.00     | Rs. 18,300.00   |
| 01:45 PM | CASH_IN           | Cash float replenishment        | +  5,000.00     | Rs. 23,300.00   |
+----------------------------------------------------------------------------------------------------+
```

### 3.1 Shift Reconciliation & Variance Audit (`PosShiftReconciliationSheet`)
When closing the shift register:
$$\text{Expected Drawer Cash} = \text{Opening Float} + \text{Cash Sales} + \text{Cash In} - \text{Petty Cash Out}$$
$$\text{Closing Variance} = \text{Actual Counted Cash} - \text{Expected Drawer Cash}$$
* Zero variance $\rightarrow$ Green balanced badge.
* Negative variance $\rightarrow$ Red shortage alert requiring supervisor sign-off reason.
* Positive variance $\rightarrow$ Amber overage alert.

---

## 4. Cost Privacy & Margin Security

| Capability | Owner / Manager (`OWNER`, `MANAGER`) | Cashier (`CASHIER`) |
| :--- | :--- | :--- |
| **Active Cart Margin Panel** | Visible (`Revenue`, `Direct Cost`, `Margin %`) | Completely unmounted from DOM |
| **On-The-Fly Item Cost Input**| Available (`Buying Cost Rs.`) | Hidden; defaults to Rs. 0 |
| **80mm Thermal Receipt** | Strictly redacted (prices only) | Strictly redacted (prices only) |
| **Shift Reconciliation** | Detailed drawer variance audit | Standard cash count entry |

---

## 5. Thermal 80mm Receipt Print (`ThermalReceiptPrint.tsx`)

* Formatted strictly for standard 80mm thermal point-of-sale receipt printers.
* Monospace receipt typography.
* Includes:
  - Workshop identity, branch address, contact phone, date/time
  - POS Receipt Number (`POS-2026-XXXX`)
  - Cashier name
  - Itemized rows (`Description`, `Qty × Price`, `Total`)
  - Subtotal, Discounts, Net Total
  - Tender Method, Tendered Amount, Change Returned
* **Privacy Guarantee:** Zero buying cost or margin figures are ever rendered to `@media print`.

---

## 6. Verification & Quality Gates

| Verification Gate | Result | Notes |
| :--- | :--- | :--- |
| **Domain Lifecycle (`tests/pos-terminal-shift.test.tsx`)** | **2 / 2 Passed (100%)** | Shift open, cash-in/out, inventory deduction |
| **Counter POS Terminal Workflows** | **4 / 4 Passed (100%)** | Catalog search, barcode scan, on-the-fly items, cart math |
| **Privacy Invariants & Cost Guards** | **2 / 2 Passed (100%)** | Margin panel role gating, thermal receipt cost stripping |
| **Tender Modal & Split Tender** | **2 / 2 Passed (100%)** | Cash change math, denominations, split payments |
| **Shift Reconciliation & Variance** | **1 / 1 Passed (100%)** | Float math, expected cash vs counted variance |
| **Hardware Scanner & Sales History** | **3 / 3 Passed (100%)** | Keystroke scanner listener, reprint receipts |
| **RestroBit Split Workspace & Numpad**| **7 / 7 Passed (100%)** | Touch cards, keypad input, petty cash payouts |
| **Skeptical Audit & Edge Cases** | **7 / 7 Passed (100%)** | Exact cash presets, modal scanner suppression |
| **Total Phase 07 Test Coverage** | **28 / 28 Passed (100%)** | Full passing suite |
| **Full Regression Test Suite** | **508 / 508 Passed (100%)** | All 28 test suites passing cleanly |
| **TypeScript Strict Compilation** | **0 Errors** | Strict type definitions |
| **Vite Production Build** | **Success (575ms)** | Clean production bundle |

---

## 7. Deliverable Documentation
* Specifications recorded in [`docs/ui-ux-transformation/07-high-speed-pos-terminal-shift.md`](file:///Users/chandupa/vehicle-repair/docs/ui-ux-transformation/07-high-speed-pos-terminal-shift.md).
