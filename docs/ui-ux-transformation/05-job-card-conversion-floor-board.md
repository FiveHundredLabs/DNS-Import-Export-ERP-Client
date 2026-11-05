# Phase 05: Job Card Conversion, Floor Board & Redacted Print Specification

**Document ID:** `TRANSFORMATION-05-JOB-CARD-FLOOR-BOARD`  
**System:** Antigravity Workshop & POS ERP System (Enterprise UI/UX Modernization)  
**Phase:** Phase 05 — Job Card Stage Conversion, Workshop Floor Board & Price-Redacted Print  
**Date:** November 2026  
**Status:** Approved & Verified (30 / 30 Tests Passing)  

---

## 1. Executive Summary & Architectural Scope

Phase 05 establishes the end-to-end operational transition from initial estimation (`ESTIMATE`) to active garage floor repair (`JOB_CARD`), visual floor bay allocation (`/workshop/board`), and strict physical job card print privacy.

### Core Objectives Delivered:
1. **1-Click Stage Conversion & Immutable Baseline Snapshot:**  
   Transitioning an Estimate to a Job Card freezes the original scope, quantities, and financials (`originalEstimateSnapshot`) into an immutable snapshot. Any subsequent line item added on the garage floor is automatically badged as `[Supplementary]`.
2. **100% Price Redaction for Garage Floor & Technicians:**  
   Mechanics and floor technicians never see customer selling prices, markup margins, or internal buying costs on board cards, compact floor ledgers, or physical job card prints.
3. **Workshop Floor Status Board (`/workshop/board` — Screenshot 02):**  
   Modernized multi-bay kanban board with 7 operational stages, compact vehicle floor cards, 1-click stage advancement, live task completion checklists, and quick A4 job card printing.
4. **Physical A4 Price-Redacted Job Card (`A4PriceRedactedJobCardPrint.tsx`):**  
   Floor-ready document layout stripping all `Rs.` amounts, replacing them with technician assignment, parts issued `[ ]`, task completed `[ ]`, and supervisor/lead signature blocks.

---

## 2. 1-Click Conversion & Immutable Snapshot Mechanics

```
+-----------------------------------------------------------------------------------------+
|                               STAGE CONVERSION WORKFLOW                                  |
+-----------------------------------------------------------------------------------------+
|  [ ESTIMATE (Job #JOB-0042) ]                                                           |
|  - Grand Total: Rs. 85,000.00                                                           |
|  - 6 Line Items (R&R, Repair, Replacement)                                              |
|                                                                                         |
|       │                                                                                 |
|       ▼  Click "[ Convert to Job Card ]"                                                |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | 1. Freeze snapshot JSON: { lines, financials, grandTotalSalesRs: 85000, frozenAt } |  |
|  | 2. Set docStage = 'JOB_CARD'                                                      |  |
|  | 3. Set floorStatus = 'APPROVED_IN_PROGRESS'                                        |  |
|  | 4. Record Audit Log: STAGE_CONVERSION (ESTIMATE -> JOB_CARD) by Active Actor        |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
|       │                                                                                 |
|       ▼                                                                                 |
|  [ JOB CARD ACTIVE ON FLOOR ]                                                           |
|  - Frozen Baseline Banner: "Baseline Total: Rs. 85,000.00 (Frozen on Nov 04)"           |
|  - All newly appended lines -> automatically flagged `isSupplementary = true`           |
|  - Supplementary badge rendered in sheet, ledger, and prints                           |
+-----------------------------------------------------------------------------------------+
```

### Immutable Snapshot Guarantee
When an estimate is converted:
- `originalEstimateSnapshot` is serialized and persisted to storage.
- Adding supplementary parts or labor never modifies or overwrites `originalEstimateSnapshot`.
- Comparison drawers and insurance audits can always contrast original approved scope against supplemental additions.

---

## 3. Floor Board Architecture (`WorkshopBoardPage.tsx` — Screenshot 02)

The Workshop Floor Board serves as the mission control for workshop supervisors and mechanics.

```
+---------------------------------------------------------------------------------------------------------+
|  Workshop Floor Status Board                            [Kanban Board | Compact Floor List]             |
|  [Search plate, customer, model...]   [All Technicians v]   [⚠️ Blocked / Delayed Only]                  |
+---------------------------------------------------------------------------------------------------------+
|  Intake & Est.  |  Insurance Pend.  |  Active Bay Repair  |  Waiting Parts  |  Ready for Delivery       |
|  (2 Vehicles)   |  (1 Vehicle)      |  (4 Vehicles)       |  (2 Vehicles)   |  (3 Vehicles)             |
+-----------------+-------------------+---------------------+-----------------+---------------------------+
| +-------------+ | +---------------+ | +-----------------+ | +-------------+ | +-----------------------+ |
| | WP CAB-4521 | | | CBA-8822      | | | CP CAH-1234     | | | WP CAC-9901 | | | WP CAD-5544           | |
| | 3 Days Tgt  | | | 5 Days Tgt    | | | OVERDUE ⚠️      | | | 7 Days Tgt  | | | Ready for Pickup      | |
| | Toyota Axio | | | Nissan Leaf   | | | Mitsubishi L200 | | | Honda Vezel | | | Suzuki WagonR         | |
| | Body Tink.  | | | Front Bumper  | | | Engine Rebuild  | | | Waiting Rad | | | Full Polish           | |
| | Tech: Kamal | | | Tech: Unass.  | | | Tech: Nimal     | | | Tech: Sunil | | | Tech: Kamal           | |
| | [==== ] 60% | | [==   ] 30%     | | [======] 100%     | | [=    ] 20%   | | [========] 100%         | |
| | [Approve >] | | [Move to Bay >] | | [Send to QC >]    | | [Parts In >]  | | [Deliver & Invoice >]   | |
| +-------------+ | +---------------+ | +-----------------+ | +-------------+ | +-----------------------+ |
+---------------------------------------------------------------------------------------------------------+
```

### 3.1 Seven Standard Operational Stages
1. `DRAFT`: Vehicle logged, awaiting formal estimate completion.
2. `PENDING_INSURANCE_APPROVAL`: Estimate submitted to insurance assessor.
3. `APPROVED_IN_PROGRESS`: Claim approved, vehicle positioned in active repair bay.
4. `WAITING_FOR_PARTS`: Blocked waiting for ordered spare parts from catalog/supplier.
5. `QUALITY_CHECK`: Repair completed, undergoing supervisor road test & diagnostic scan.
6. `READY_FOR_DELIVERY`: Vehicle cleaned, washed, and customer notified.
7. `COMPLETED_DELIVERED`: Vehicle handed over, final invoice settled.

### 3.2 Dual View Operation
* **Kanban Board View:** Standard 5-column responsive layout with fixed `215px` card heights, visual progress bars, and 1-click status advancement.
* **Compact Floor List View:** High-density table tracking vehicle plate, model, repair nature, countdown days, technician name, task completion percentage, and action triggers.

---

## 4. Privacy Guards & Price Redaction

| Context | Owner / Manager View | Technician Role View (`TECHNICIAN`) |
| :--- | :--- | :--- |
| **Kanban Card Face** | Total Selling Price (screen-reader accessible) | Price completely stripped from DOM |
| **Compact Floor List** | Selling Price column visible (`Rs. 85,000.00`) | Selling Price column removed |
| **Repair Sheet Tables** | Selling Price, Subtotals, and Buying Cost toggles | Prices replaced with Tech Assignment & Checkboxes |
| **Settlement Card** | Advance, Insurance Payable, Excess Due | Replaced with "Technician Work Order Progress" |
| **Physical Printout** | A4 Customer Invoice / Estimate with totals | `A4PriceRedactedJobCardPrint` with 100% redacted prices |

---

## 5. Physical Job Card Print (`A4PriceRedactedJobCardPrint.tsx`)

The physical job card printed for the workshop floor strictly complies with operational workshop requirements:
* **Suppressed:** All `Rs.` currency figures, line prices, section subtotals, discounts, tax figures, advance payments, and customer balance due.
* **Added Columns:**
  - `Assigned Technician` (Lead mechanic responsible for line item)
  - `Part Issued [ ]` (Parts counter clerk physical issuance checkbox)
  - `Task Completed [ ]` (Mechanic sign-off checkbox upon task completion)
* **Signature Grid:**
  - `Floor Supervisor Signature`
  - `Technician Lead Signature`
* **Footer Disclaimer:**
  `"Workshop Floor Physical Job Card. Return signed document to service desk upon task completion."`

---

## 6. Verification Results

| Test Category | Suite / Test File | Result |
| :--- | :--- | :--- |
| **1-Click Stage Conversion** | `tests/workshop-board-jobcard.test.tsx` | **3 / 3 Passed** |
| **Supplementary Badging** | `tests/workshop-board-jobcard.test.tsx` | **2 / 2 Passed** |
| **Price Redaction & Privacy** | `tests/workshop-board-jobcard.test.tsx` | **3 / 3 Passed** |
| **Floor Board & Kanban Columns** | `tests/workshop-board-jobcard.test.tsx` | **12 / 12 Passed** |
| **View Modes & Print Verification**| `tests/workshop-board-jobcard.test.tsx` | **10 / 10 Passed** |
| **Subtotal for Phase 5** | **`tests/workshop-board-jobcard.test.tsx`** | **30 / 30 Passed (100%)** |
| **Full Repository Test Suite** | **All 28 Test Suites** | **508 / 508 Passed (100%)** |
| **TypeScript Compilation** | `npx tsc --noEmit` | **0 Errors** |
| **Vite Production Build** | `npm run build` | **Clean Build (726ms)** |
