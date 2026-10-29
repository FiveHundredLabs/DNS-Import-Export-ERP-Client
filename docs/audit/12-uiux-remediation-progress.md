# DNS ERP — UI/UX Remediation Progress Tracker

**Document ID:** `AUDIT-12-PROGRESS`  
**Application:** DNS Import & Export ERP Client  
**Last Updated:** October 2026  
**Baseline Test Status:** 77 Passed, 1 Pre-existing Failure, 751 Tests Passing, 0 Regressions  

---

## 1. Master Remediation Progress Matrix

| Finding ID | Module | Route / Component | Description | Severity | Shared Pattern | Status | Verification Evidence |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| **SAL-005** | Sales | `/quotations/new`, `/quotations/:id/edit` | Asymmetrical 2/3 layout, bulky line item cards, wrapping discount pills, missing batch inventory, permanent 300px list. | Critical | `PageHeader`, `FormSection`, `CustomerSummaryCard`, `DocumentActionBar`, full-width line table | **Verified** | `quotationComponents.test.tsx` (5/5 passed), full build verified. |
| **SAL-006** | Sales | `/orders/new`, `/orders/:id/edit` | Abrupt modal popup on customer select, cramped batch dropdown inside product name, cramped discount table cell, AI copy, duplicate buttons. | Critical | `PageHeader`, `CustomerSummaryCard`, `DocumentActionBar`, dedicated Batch/Stock column | **Verified** | `orderComponents.test.tsx` (8/8 passed), `pricingAndDraftWorkflows.test.tsx` (12/12 passed). |
| **PUR-006** | Purchasing | `/purchasing/orders/new`, `/purchasing/orders/:id/edit` | Creation form used custom card containers and ad-hoc supplier selector. | High | `PageHeader`, `FormSection`, `SupplierSummaryCard`, `DocumentActionBar` | **Verified** | `batch2DataEntryPatterns.test.tsx` (7/7 passed). |
| **APR-001** | Approvals | `/approvals` | Approval cards showed only raw description text with no direct inspection path to detailed UI. | High | `PageHeader`, `StatusBadge`, Inspect Full Document link | **Verified** | `batch3WorkflowConsistency.test.tsx` (4/4 passed). |
| **INV-002** | Inventory | `/inventory/grn/:id` | Loud black banner with verbose AI text; lacked cross-module links to Purchasing and Finance. | High | `StatusBadge`, continuity action buttons, toned down audit notice | **Verified** | `grnBarcodePagination.test.tsx`, `inventoryComponents.test.tsx` (6/6 passed). |
| **PUR-014** | Purchasing | `/purchasing/grn/:id` | Loud blue banner, ad-hoc status pills, lacked continuity links to Warehouse intake and Finance. | High | `StatusBadge`, cross-module action buttons, toned down audit notice | **Verified** | Manual AST & component rendering verified. |
| **INV-001** | Inventory | `/inventory/damaged-stock` | **Orphaned Route:** Sidebar links to `/inventory/damaged-stock`, but route was completely missing in `App.tsx`. | Critical | `App.tsx` routing, `ProtectedRoute`, `StandardLayout`, `PageHeader` | **Verified** | `App.tsx` wired, `damagedStockManagement.test.tsx` (5/5 passed). |
| **INV-006** | Inventory | `/inventory/stock` | Lacks `PageHeader`; warning banner contains AI text: *"Manual adjustments create an immutable audit record"*. | High | `PageHeader`, concise notification alert | **Verified** | `inventoryComponents.test.tsx` (4/4 passed). |
| **INV-007** | Inventory | `/inventory/movements` | Lacks `PageHeader`; footnote note contains AI text: *"Stock movements are immutable audit records"*. | Medium | `PageHeader`, concise table header | **Verified** | `inventoryComponents.test.tsx` passed. |
| **INV-005** | Inventory | `/inventory/delivery-notes/new` | Multi-step dispatch allocation had inconsistent headers and dense instructional text. | High | `PageHeader`, concise enterprise copy | **Verified** | `stockKeeperDeliveryNotes.test.tsx` (12/12 passed). |
| **FIN-007** | Finance | `/finance/ap/debit-notes` | Tabbed debit note form used ad-hoc custom headers and AI copy. | High | `PageHeader`, `Badge`, `Card` | **Verified** | Finance tests verified, zero regressions. |
| **FIN-003** | Finance | `/finance/ar/credit-notes` | Tabbed credit note form used ad-hoc custom headers and verbose AI copy. | High | `PageHeader`, `Badge`, unified tabs | **Verified** | Finance tests verified, zero regressions. |
| **FIN-008** | Finance / Purchasing | `/finance/suppliers`, `/purchasing/suppliers` | Competing implementations of supplier directory with different column typography and styling. | High | Shared supplier list layout and `StatusBadge` | **Verified** | `batch2DataEntryPatterns.test.tsx` (7/7 passed). |
| **SAL-001** | POS | `/pos` | Customer & product selection triggered unstyled fixed modal rather than smooth dialog flow. | High | Shared `Dialog` primitive with accessible focus management | **Verified** | `posComponents.test.tsx` (10/10 passed), `posDomain.test.ts` (19/19 passed). |
| **REP-001** | Reports | `/reports`, `/purchasing/reports` | Custom page titles, unaligned filter headers, and AI text across reporting suites. | High | Canonical `PageHeader`, standardized breadcrumbs & actions | **Verified** | `reportComponents.test.tsx` (6/6 passed), production build clean. |
| **ADM-001** | Admin | `/areas`, `/teams` | Basic tables lacked canonical `PageHeader` and unified breadcrumb navigation. | Medium | Canonical `PageHeader`, breadcrumb navigation | **Verified** | Full production build verified. |

---

## 2. Batch Execution Summary

* **Batch 1: Shared Foundations & Orphaned Route Remediation (`INV-001`, `INV-006`, `INV-007`)** — **Completed & Verified**
* **Batch 2: Inventory & Logistics Alignment (`INV-005`, `DeliveryNoteCreatePage`, `StockBalancePage`)** — **Completed & Verified**
* **Batch 3: Finance AP/AR Data Entry & Entity Selectors (`FIN-007`, `FIN-003`, `FIN-008`)** — **Completed & Verified**
* **Batch 4: POS & Commercial Customer Flow (`SAL-001`, `ShowroomPOSTerminal`)** — **Completed & Verified**
* **Batch 5: Reports & Analytics Unification (`REP-001`, `ReportsPage`, `PurchasingReportsPage`)** — **Completed & Verified**
* **Batch 6: Master Data & System-Wide Final Consistency Sweep (`ADM-001`, final regression check)** — **Completed & Verified**
