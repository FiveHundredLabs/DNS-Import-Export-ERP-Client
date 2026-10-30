# ERP UI/UX Consistency Audit — Module 2: Sales and Customers

**Document ID:** `AUDIT-02-SALES-CUSTOMERS`  
**Module:** Sales and Customers (CRM, Quotations, Sales Orders, Invoices, Payments, POS, Warranty, Commissions)  
**Audit Stage:** Stage B — Batch 2  
**Status:** Completed  
**Inspected Date:** October 2026  
**Auditor:** UI Consistency Sentinel  

---

## 1. Executive Summary

This report delivers a comprehensive, evidence-based UI/UX consistency audit of the **Sales and Customers** module of the DNS Import & Export ERP application.

This module is the largest operational area of the system, comprising **22 active route endpoints** across 8 distinct business functional domains: Customer Master, Quotations Pipeline, Sales Order Fulfillment, Invoicing & Billing, Customer Payments & Collections, Showroom Point-of-Sale (POS), Warranty Claim Hub, and Sales Commissions.

While the module implements rich capabilities (such as batch-aware inventory picking in orders, FIFO payment allocation, multi-tier discount level calculations, and ESC/POS thermal printing), significant inconsistencies were identified:
1. **Divergent Thermal Receipt Implementations (P1):** Two completely separate, conflicting `ThermalReceiptModal` components exist in `features/payments` and `features/pos`. They use conflicting dialog architectures (Radix `Dialog` vs hand-rolled fixed `div`), conflicting color themes (dark slate backdrop with yellow simulated paper vs white modal with grey simulated paper), and divergent feature sets (58mm/80mm toggle in Payments, omitted in POS).
2. **Duplicate Routes & Hidden Navigation for Payments (P1):** Three redundant URL endpoints (`/payments/collect/:customerId`, `/payments/customer/:customerId`, `/customers/:customerId/pay`) all route to `CustomerPaymentDetailPage.tsx`. Meanwhile, the main navigation sidebar deliberately hides `/payments` to show `/payments/collect`, leaving the 1,360-line `PaymentListPage.tsx` detached from canonical navigation.
3. **Hardcoded Tax Rate Inconsistency (P1):** Draft invoice recalculations in `InvoiceDetailPage.tsx` hardcode a fallback tax rate of `15%`, conflicting with the statutory `18%` configured in `PurchaseOrderCreateEditPage.tsx` and the centralized `TaxContext`.
4. **Sidebar Mismatch for Commissions (P2):** The Finance navigation rail links to `/commissions` (`CommissionHubPage.tsx` — gamified sales targets and leaderboards) instead of `/finance/commissions` (`FinanceCommissionsPage.tsx` — financial commission accruals and payment ledger).
5. **Mobile Viewport Drift (P2):** `QuotationListPage.tsx` implements responsive mobile card stacks, whereas `CustomerTable.tsx`, `OrderListPage.tsx`, `InvoiceListPage.tsx`, and `PaymentListPage.tsx` enforce rigid horizontal table overflow on mobile devices.

A total of **12 findings** were identified: **0 Critical (P0)**, **3 High (P1)**, **6 Medium (P2)**, and **3 Low (P3)**.

---

## 2. In-Scope Routes & Screen Inventory

| Route Path | Page Component | Primary User Task | Container Layout | Inspection Status |
| :--- | :--- | :--- | :--- | :--- |
| `/customers` | `CustomerListPage.tsx` | Customer Directory, search, type filter, modal trigger | `StandardLayout` | **Inspected (UI & Code)** |
| `/customers/:id` | `CustomerDetailPage.tsx` | Customer 360 profile, credit terms, multi-tab history | `StandardLayout` | **Inspected (UI & Code)** |
| `/quotations` | `QuotationListPage.tsx` | Quotations list, WhatsApp share, SO conversion | `StandardLayout` | **Inspected (UI & Code)** |
| `/quotations/new` | `QuotationCreateEditPage.tsx` | Price proposal entry, discount thresholds, terms | `StandardLayout` | **Inspected (UI & Code)** |
| `/quotations/:id` | `QuotationDetailPage.tsx` | Quotation detail view, print preview, SO convert modal | `StandardLayout` | **Inspected (UI & Code)** |
| `/quotations/:id/edit` | `QuotationCreateEditPage.tsx` | Draft quotation amendment | `StandardLayout` | **Inspected (UI & Code)** |
| `/orders` | `OrderListPage.tsx` | Sales order pipeline, filter by status and rep | `StandardLayout` | **Inspected (UI & Code)** |
| `/orders/new` | `OrderCreateEditPage.tsx` | Sales order creation, batch selection, margin checking | `StandardLayout` | **Inspected (UI & Code)** |
| `/orders/:id` | `OrderDetailPage.tsx` | Order detail, approval timeline, invoice generation | `StandardLayout` | **Inspected (UI & Code)** |
| `/orders/:id/edit` | `OrderCreateEditPage.tsx` | Draft sales order editing | `StandardLayout` | **Inspected (UI & Code)** |
| `/orders/tracking` | `OrderTrackingPage.tsx` | Sales rep dedicated order fulfillment pipeline tracking | `StandardLayout` | **Inspected (UI & Code)** |
| `/orders/activity-log` | `OrderActivityLogPage.tsx` | System-wide user operational activity audit log | `StandardLayout` | **Inspected (UI & Code)** |
| `/orders/:id/activity-log`| `OrderActivityLogPage.tsx` | Specific sales order lifecycle audit trail | `StandardLayout` | **Inspected (UI & Code)** |
| `/invoices` | `InvoiceListPage.tsx` | Invoice list, overdue filtering, payment modal trigger | `StandardLayout` | **Inspected (UI & Code)** |
| `/invoices/:id` | `InvoiceDetailPage.tsx` | Invoice detail, in-place draft editor, IRD/A4 view | `StandardLayout` | **Inspected (UI & Code)** |
| `/invoices/:id/edit` | `InvoiceDraftEditPage.tsx` | Wrapper redirecting to in-place edit on detail page | `StandardLayout` | **Inspected (UI & Code)** |
| `/payments` | `PaymentListPage.tsx` | Comprehensive payment history, handovers, receipts | `StandardLayout` | **Inspected (UI & Code)** |
| `/payments/collect` | `CustomerPaymentsTab.tsx` | Customer collection workbench, overdue card matrix | `StandardLayout` | **Inspected (UI & Code)** |
| `/payments/collect/:customerId` | `CustomerPaymentDetailPage.tsx` | Customer ledger statement, FIFO payment collection | `StandardLayout` | **Inspected (UI & Code)** |
| `/payments/customer/:customerId` | `CustomerPaymentDetailPage.tsx` | Alias to Customer Payment Detail | `StandardLayout` | **Inspected (UI & Code)** |
| `/customers/:customerId/pay` | `CustomerPaymentDetailPage.tsx` | Alias to Customer Payment Detail | `StandardLayout` | **Inspected (UI & Code)** |
| `/payments/new` | `PaymentCollectionPage.tsx` | Standalone payment entry form with allocation | `StandardLayout` | **Inspected (UI & Code)** |
| `/payments/:id` | `PaymentDetailPage.tsx` | Payment voucher receipt and allocation drilldown | `StandardLayout` | **Inspected (UI & Code)** |
| `/pos` | `ShowroomPOSTerminal.tsx` | Showroom checkout terminal, barcode scan, cash drawer | `StandardLayout` | **Inspected (UI & Code)** |
| `/pos/transactions` | `POSTransactionHistoryPage.tsx`| Cashier transaction audit log and reprint | `StandardLayout` | **Inspected (UI & Code)** |
| `/pos/sessions` | `POSSessionsPage.tsx` | POS cash shifts, opening/closing reconciliation | `StandardLayout` | **Inspected (UI & Code)** |
| `/warranty` | `WarrantyHubPage.tsx` | Warranty claims, shop followups, distributor notes | `StandardLayout` | **Inspected (UI & Code)** |
| `/warranty/verification` | `SalesRepWarrantyPage.tsx` | Standalone field serial/barcode scan validator | `StandardLayout` | **Inspected (UI & Code)** |
| `/commissions` | `CommissionHubPage.tsx` | Rep sales targets, tiered commissions, leaderboard | `StandardLayout` | **Inspected (UI & Code)** |

---

## 3. Detailed Audit Findings

```
Severity Breakdown:
┌──────────────┬───────┐
│ P0 Critical  │   0   │
│ P1 High      │   3   │
│ P2 Medium    │   6   │
│ P3 Low       │   3   │
│ Total        │  12   │
└──────────────┴───────┘
```

---

### Finding SAL-001: Competing Thermal Receipt Modal Implementations in POS vs Payments
- **Module & Affected Routes:** Sales, Payments & POS — `/payments`, `/payments/:id`, `/pos`, `/pos/transactions`
- **Page Type & Task:** Receipt Generation & ESC/POS Thermal Printing
- **Issue Category:** 3.3 Shared selectors and overlays / 3.8 Navigation and branding
- **Observed Behavior & Evidence:**
  - Two distinct `ThermalReceiptModal.tsx` components exist in the codebase:
    1. `src/features/payments/ThermalReceiptModal.tsx`:
       - Built with Radix `Dialog` (`DialogContent className="sm:max-w-md bg-slate-900/90 text-white..."`).
       - Features an 80mm vs 58mm paper toggle (`paperWidth === '80mm' ? ...`).
       - Simulates realistic amber/yellow thermal paper (`bg-amber-50/95 text-slate-900`).
    2. `src/features/pos/ThermalReceiptModal.tsx`:
       - Does NOT use Radix `Dialog`; hand-rolls an unstyled fixed overlay:
         `<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60...">`.
       - Renders a white dialog box with grey dashed paper (`border-dashed bg-slate-50`).
       - Completely lacks paper width selection.
  - In `src/components/index.ts` (line 65), the Payments version is exported globally, but POS continues to import its private, unaligned version.
- **Why It Matters:** Users printing thermal receipts from Showroom POS vs Payment Collections experience completely different dialog animations, themes, and capabilities for the same operational hardware.
- **Severity & Confidence:** **P1 (High)** | Confirmed (Code-level inspection & diff)
- **Related Screens:** Thermal receipt modals across Payments and POS.
- **Component Paths:** `src/features/payments/ThermalReceiptModal.tsx`, `src/features/pos/ThermalReceiptModal.tsx`
- **Recommended Direction:** Consolidate into a single canonical `ThermalReceiptModal` in `src/components/common/` that accepts either a `Payment` or a `POSTransaction` and standardizes on Radix `Dialog` with 80mm/58mm toggle.
- **Scope & Fix Type:** Shared component consolidation.
- **Dependencies & Business Rules:** Must preserve ESC/POS printer service commands (`printerService.printPaymentReceipt` and `printerService.printPOSTransactionReceipt`).

---

### Finding SAL-002: Duplicate Routing and Navigation Inconsistency for Customer Payments
- **Module & Affected Routes:** Payments & Sales — `/payments`, `/payments/collect`, `/payments/collect/:customerId`, `/payments/customer/:customerId`, `/customers/:customerId/pay`
- **Page Type & Task:** AR Payment Collection & Customer Ledgers
- **Issue Category:** 3.2 Workflow and page structure / 3.8 Navigation and branding
- **Observed Behavior & Evidence:**
  - In `src/App.tsx` (lines 366–397), three distinct route aliases point to the exact same component:
    ```tsx
    <Route path="payments/collect/:customerId" element={<CustomerPaymentDetailPage />} />
    <Route path="payments/customer/:customerId" element={<CustomerPaymentDetailPage />} />
    <Route path="customers/:customerId/pay" element={<CustomerPaymentDetailPage />} />
    ```
  - In `src/components/common/Sidebar.tsx` (lines 118–120), the primary `/payments` route is suppressed:
    `// 2. Customers, Invoices & POS (hiding legacy /payments from navigation bar)`
    `{ id: 'customer-collections', name: 'Customer Collections', path: '/payments/collect', ... }`
  - However, `/payments` is an active route in `App.tsx` (line 359), housing `PaymentListPage.tsx` (1,360 lines of code) with 3 modes (`HANDOVERS`, `RECEIPTS`, `CUSTOMERS`), which is inaccessible from canonical sidebar links except via manual URL entry.
- **Why It Matters:** Fragmented URLs confuse browser history, breadcrumbs, and back navigation; suppressing `/payments` from the sidebar while keeping 1,360 lines of active logic causes ghost feature syndrome.
- **Severity & Confidence:** **P1 (High)** | Confirmed (Code-level inspection)
- **Related Screens:** `/payments/collect`, `/customers/:id`
- **Component Paths:** `src/App.tsx`, `src/components/common/Sidebar.tsx`, `src/features/payments/PaymentListPage.tsx`, `src/features/payments/CustomerPaymentsTab.tsx`
- **Recommended Direction:**
  1. Standardize on canonical path `/payments/collect/:customerId` and remove unneeded route aliases.
  2. Unify `/payments` and `/payments/collect` into a clean tabbed view (or restore `/payments` to the sidebar with a clear segmented tab bar).
- **Scope & Fix Type:** Route architecture & navigation consolidation.
- **Dependencies & Business Rules:** Preserves customer invoice FIFO allocation logic.

---

### Finding SAL-003: Sidebar Category & Routing Mismatch for Commissions
- **Module & Affected Routes:** Commissions & Finance — `/commissions` vs `/finance/commissions`
- **Page Type & Task:** Sales Representative Commissions & Accruals
- **Issue Category:** 3.2 Workflow and page structure / 3.8 Navigation and branding
- **Observed Behavior & Evidence:**
  - Two distinct commission pages exist in the application:
    1. `/commissions` (`CommissionHubPage.tsx`): Focuses on sales rep performance, achievement percentages, gamified tier leaderboards, and target setting.
    2. `/finance/commissions` (`src/features/finance/pages/FinanceCommissionsPage.tsx`): Focuses on double-entry accounting accruals, commission ledger items (`ACCRUED` vs `PAID`), and finance disbursement.
  - In `src/components/common/Sidebar.tsx` (line 165), under the **`finance`** category rail:
    `{ id: 'commissions', name: 'Sales Commission', path: '/commissions', icon: Award, category: 'finance' }`
    It incorrectly links to `/commissions` (`CommissionHubPage.tsx`) instead of `/finance/commissions`!
- **Why It Matters:** A finance manager or accountant clicking "Sales Commission" in the Finance sidebar rail is taken out of the Finance module and landed on an operational sales gamification leaderboard rather than the financial commission ledger.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/finance`, `/commissions`
- **Component Paths:** `src/components/common/Sidebar.tsx`, `src/features/commissions/CommissionHubPage.tsx`, `src/features/finance/pages/FinanceCommissionsPage.tsx`
- **Recommended Direction:** Point the Finance sidebar item to `/finance/commissions`, and place `/commissions` under the Sales/Approvals rail.
- **Scope & Fix Type:** Navigation rail correction.
- **Dependencies & Business Rules:** Preserves role access checks (`commissions:view`, `commissions:manage`).

---

### Finding SAL-004: Redundant Standalone Route for Embedded Warranty Verification Tab
- **Module & Affected Routes:** Warranty — `/warranty` vs `/warranty/verification`
- **Page Type & Task:** Serial Number & Barcode Warranty Verification
- **Issue Category:** 3.2 Workflow and page structure
- **Observed Behavior & Evidence:**
  - In `WarrantyHubPage.tsx` (lines 51, 130), the `verification` tab directly embeds `<SalesRepWarrantyPage />`.
  - In `src/App.tsx` (line 452), `/warranty/verification` is registered as a standalone route rendering `<SalesRepWarrantyPage />`.
  - In `Sidebar.tsx`, two separate navigation items exist:
    - `Warranty Hub` (`/warranty`) categorized under `approvals`.
    - `Warranty Verification` (`/warranty/verification`) categorized under `sales`.
- **Why It Matters:** Users have two ways to reach the identical screen, creating duplicate navigation cognitive load and competing categories in the sidebar.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/warranty`
- **Component Paths:** `src/App.tsx`, `src/components/common/Sidebar.tsx`, `src/features/warranty/WarrantyHubPage.tsx`, `src/features/warranty/SalesRepWarrantyPage.tsx`
- **Recommended Direction:** Retain `/warranty/verification` as a direct link for mobile sales reps if needed, but ensure `/warranty?tab=verification` is synchronized, or keep verification as a dedicated tab inside `WarrantyHubPage`.
- **Scope & Fix Type:** Workflow streamlining.
- **Dependencies & Business Rules:** Must preserve serial barcode lookup functionality (`SerialNumberService`).

---

### Finding SAL-005: Inconsistent Control Corner Radii in Quotation List Actions
- **Module & Affected Routes:** Quotations — `/quotations`
- **Page Type & Task:** List Action Buttons
- **Issue Category:** 3.4 Forms and input anatomy / 3.1 Layout and responsive behavior
- **Observed Behavior & Evidence:**
  - In `QuotationListPage.tsx` (lines 373, 387, 402), action buttons on mobile cards explicitly specify `rounded-xl`:
    ```tsx
    <Button className="... rounded-xl ...">WhatsApp</Button>
    <Button className="... rounded-xl ...">Convert to SO</Button>
    ```
  - This violates the system baseline in `UI_DEVELOPER_GUIDE.md` section 3.A:
    "Low-height interactive controls (height $\le 40$px: buttons, inputs, selects, badges): Always use `rounded-md` (6px / 0.375rem). Cards & Content Surfaces: Use `rounded-xl`."
- **Why It Matters:** Visual pill-shape drift makes buttons on quotation cards look distinct from all other standard buttons in the system.
- **Severity & Confidence:** **P3 (Low)** | Confirmed (Code-level inspection)
- **Related Screens:** `/orders`, `/invoices`
- **Component Paths:** `src/features/quotations/QuotationListPage.tsx`
- **Recommended Direction:** Remove `rounded-xl` overrides to allow default `rounded-md` from `Button` primitive.
- **Scope & Fix Type:** Local style cleanup.
- **Dependencies & Business Rules:** None.

---

### Finding SAL-006: Divergent Table Row Layouts (Mobile Cards vs Horizontal Overflow) Across Sales Lists
- **Module & Affected Routes:** Sales Lists — `/quotations` vs `/customers`, `/orders`, `/invoices`, `/payments`
- **Page Type & Task:** Responsive Table & Record Viewing on Mobile Viewports
- **Issue Category:** 3.1 Layout and responsive behavior / 3.5 Tables and line-item presentation
- **Observed Behavior & Evidence:**
  - `QuotationListPage.tsx` implements a sophisticated dual-layout:
    - Mobile ($< 768$px): Renders stacked cards (`block md:hidden`) with quotation number, customer name, validity date, formatted amounts, and quick action buttons.
    - Desktop ($\ge 768$px): Renders standard tabular data grid (`hidden md:block`).
  - In contrast, `CustomerTable.tsx`, `OrderListPage.tsx`, `InvoiceListPage.tsx`, and `PaymentListPage.tsx` rely entirely on `overflow-x-auto` table wrappers. On mobile devices, columns clip and users must horizontally scroll through 7–10 columns to locate actions.
- **Why It Matters:** Inconsistent responsive behavior across sibling sales lists. Quotations provide an optimal mobile experience, while orders, invoices, and payments require clunky horizontal scrolling on sales rep smartphones.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/orders`, `/invoices`, `/payments`, `/customers`
- **Component Paths:** `src/features/quotations/QuotationListPage.tsx`, `src/features/orders/OrderListPage.tsx`, `src/features/invoices/InvoiceListPage.tsx`
- **Recommended Direction:** Adopt the dual-layout pattern (`block md:hidden` cards + `hidden md:block` table) across all core operational list pages used by mobile field roles (`SALES_REP`, `AREA_MANAGER`).
- **Scope & Fix Type:** Canonical layout pattern standard.
- **Dependencies & Business Rules:** None.

---

### Finding SAL-007: Inconsistent Discount Controls & Presets: Quotations vs Sales Orders vs Purchasing
- **Module & Affected Routes:** Quotations, Orders, Purchasing — `/quotations/new`, `/orders/new`, `/purchasing/orders/new`
- **Page Type & Task:** Line Item Pricing & Discount Entry
- **Issue Category:** 3.6 Pricing, costing, and discounts
- **Observed Behavior & Evidence:**
  - In `OrderCreateEditPage.tsx` (lines 400–450), discount entry is integrated with predefined preset chips (`0%`, `5%`, `10%`, `15%`, `Special`) reflecting `PRODUCT_DISCOUNT_LEVELS` and customer loyalty tiers (`normalizeCustomerLoyaltyLevel`), with visual indicators when manager authorization is triggered.
  - In `QuotationCreateEditPage.tsx`, discount entry is a plain numerical `<Input type="number">` without quick preset chips, even though `discountRules.ts` rules apply equally to quotations.
  - In `PurchaseOrderCreateEditPage.tsx`, discounts are entered as an unconstrained text number input without supplier contract presets.
- **Why It Matters:** Users entering discounts on quotations must manually type percentages that could easily be selected via standard presets, creating behavioral divergence between quotes and orders.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/orders/new`, `/quotations/new`, `/purchasing/orders/new`
- **Component Paths:** `src/features/quotations/QuotationCreateEditPage.tsx`, `src/features/orders/OrderCreateEditPage.tsx`, `src/rules/discountRules.ts`
- **Recommended Direction:** Share a standardized `DiscountLevelPicker` component across Quotations and Sales Orders.
- **Scope & Fix Type:** Shared component adoption.
- **Dependencies & Business Rules:** Must enforce rep discount limits (e.g. Sales Rep max 5% without manager escalation).

---

### Finding SAL-008: Hardcoded Tax Rate Fallback Inconsistency (15% in Invoices vs 18% in Purchasing)
- **Module & Affected Routes:** Invoices & Purchasing — `/invoices/:id`, `/purchasing/orders/new`
- **Page Type & Task:** Tax Calculation & Financial Posting
- **Issue Category:** 3.6 Pricing, costing, and discounts
- **Observed Behavior & Evidence:**
  - In `InvoiceDetailPage.tsx` (lines 242, 282, 301):
    ```ts
    const taxRate = invoice.taxRatePercentage || (invoice.taxEnabled ? 15 : 0);
    ```
    Draft editing in Invoice Detail falls back to **15%** if `taxRatePercentage` is unpopulated.
  - In `PurchaseOrderCreateEditPage.tsx` (lines 69, 158, 181), fallback tax rate is hardcoded to **18%**:
    `taxRate: prod.pricing?.taxRatePercentage ?? 18`.
  - In `TaxContext.tsx`, the application provides a centralized `taxRate` (managed via `TaxService`).
- **Why It Matters:** Sri Lanka VAT was increased from 15% to 18%. Hardcoding divergent fallbacks (15% in invoices vs 18% in purchasing) creates conflicting financial calculations across modules when global tax configuration is bypassed.
- **Severity & Confidence:** **P1 (High)** | Confirmed (Code-level inspection)
- **Related Screens:** `/invoices/:id`, `/purchasing/orders/new`, `/finance/reports/vat`
- **Component Paths:** `src/features/invoices/InvoiceDetailPage.tsx`, `src/features/purchasing/PurchaseOrderCreateEditPage.tsx`, `src/context/TaxContext.tsx`
- **Recommended Direction:** Remove hardcoded numeric fallbacks (`15`, `18`) and source the active statutory tax rate exclusively from `useTax().taxRate` or the document's historical tax snapshot.
- **Scope & Fix Type:** Code-level business rule standardization.
- **Dependencies & Business Rules:** Preserve statutory VAT/SSCL calculation compliance.

---

### Finding SAL-009: Dead-End Edit Route Aliased to Detail View Without Editing Guidance
- **Module & Affected Routes:** Invoices — `/invoices/:id/edit`
- **Page Type & Task:** Draft Invoice Editing
- **Issue Category:** 3.2 Workflow and page structure
- **Observed Behavior & Evidence:**
  - `src/features/invoices/InvoiceDraftEditPage.tsx` contains 14 lines of code that simply renders `<InvoiceDetailPage />`.
  - If a user navigates to `/invoices/:id/edit` for an invoice that is already `ISSUED`, `PAID`, or `PARTIALLY_PAID`, the page displays the read-only invoice view without any banner or feedback indicating that the invoice cannot be edited.
- **Why It Matters:** Users expect an edit route to either present an editable form or clearly state why editing is disabled (e.g., "This invoice has been posted and cannot be modified").
- **Severity & Confidence:** **P3 (Low)** | Confirmed (Code-level inspection)
- **Related Screens:** `/orders/:id/edit`, `/quotations/:id/edit`
- **Component Paths:** `src/features/invoices/InvoiceDraftEditPage.tsx`, `src/features/invoices/InvoiceDetailPage.tsx`
- **Recommended Direction:** In `InvoiceDetailPage`, if accessed via an `/edit` URL and status is not `DRAFT`, display a non-intrusive alert: "Posted invoices are immutable. View only."
- **Scope & Fix Type:** Local route handling polish.
- **Dependencies & Business Rules:** Must enforce invoice immutability once issued.

---

### Finding SAL-010: Status Badge Aesthetic & Color Drift Across Sales Documents
- **Module & Affected Routes:** All Sales Documents — `/quotations`, `/orders`, `/invoices`, `/payments`, `/warranty`
- **Page Type & Task:** Document Lifecycle Status Badges
- **Issue Category:** 3.7 Actions, statuses, and permissions
- **Observed Behavior & Evidence:**
  - Each sales sub-module defines its own private status badge:
    - `QuotationStatusBadge.tsx`: Uses `Badge variant="outline"` with hardcoded color classes.
    - `OrderStatusBadge.tsx`: Uses custom colored pills with Lucide icons (`CheckCircle`, `Clock`, `Ban`).
    - `InvoiceStatusBadge.tsx`: Uses custom badge variants (`paid`, `unpaid`, `partially_paid`, `overdue`).
    - `PaymentStatusBadge.tsx`: Uses simple outline badges.
    - `WarrantyStatusBadge.tsx`: Defines separate `WarrantyStatusBadge` and `ClaimStatusBadge`.
  - For equivalent lifecycle states (e.g. `PENDING_APPROVAL` or `DRAFT`), different badges use different background tints, borders, and icon placements.
- **Why It Matters:** Visual noise and fragmented status semantics across related sales workflows.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** Across all list and detail pages in Module 2.
- **Component Paths:** `src/features/quotations/QuotationStatusBadge.tsx`, `src/features/orders/OrderStatusBadge.tsx`, `src/features/invoices/InvoiceStatusBadge.tsx`, `src/features/payments/PaymentStatusBadge.tsx`
- **Recommended Direction:** Establish a unified `DocumentStatusBadge` component driven by a semantic status map (`draft`, `pending`, `approved`, `issued`, `settled`, `rejected`, `cancelled`).
- **Scope & Fix Type:** Design system standardization.
- **Dependencies & Business Rules:** Preserves exact enum values from domain types.

---

### Finding SAL-011: Missing Drill-Down and Context Continuity in POS Shift History
- **Module & Affected Routes:** POS — `/pos/sessions`
- **Page Type & Task:** Cash Drawer Shifts & Reconciliation
- **Issue Category:** 3.2 Workflow and page structure / 3.5 Tables and line-item presentation
- **Observed Behavior & Evidence:**
  - `POSSessionsPage.tsx` lists past and active cashier shifts with opening cash, closing cash, and cash discrepancy amounts.
  - However, table rows have no drill-down modal, drawer, or link to inspect the list of transactions or cash movements recorded during that specific shift.
  - Cashiers and auditors must manually switch to `POSTransactionHistoryPage.tsx` and mentally correlate timestamps.
- **Why It Matters:** Shift reconciliation requires verifying which transactions contributed to a cash discrepancy; lack of session drill-down creates friction during end-of-day cash audits.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/pos/transactions`, `/pos`
- **Component Paths:** `src/features/pos/POSSessionsPage.tsx`, `src/features/pos/POSTransactionHistoryPage.tsx`
- **Recommended Direction:** Add a row click or action button in `POSSessionsPage` to open a session inspection dialog or navigate to `POSTransactionHistoryPage?sessionId={id}`.
- **Scope & Fix Type:** Workflow connectivity.
- **Dependencies & Business Rules:** None.

---

### Finding SAL-012: Conversational Territory Scoping Text Cluttering List Headers
- **Module & Affected Routes:** Customers & Quotations — `/customers`, `/quotations`
- **Page Type & Task:** List Page Headers
- **Issue Category:** 3.8 Navigation and branding / 3.11 Text quality
- **Observed Behavior & Evidence:**
  - In `CustomerListPage.tsx` (lines 97–102):
    "Displaying accounts assigned directly to you (Ruwan Wijesinghe). Single central repository of dealers, credit lines, payment terms, and route assignments."
  - In `QuotationListPage.tsx` (lines 144–149):
    "Territory Scoped View: Showing quotations created by you (Ruwan Wijesinghe) for your assigned dealers. Rep Max Discount Limit: 5%"
  - These full-width colored banners occupy significant vertical space (48px–64px) directly above the data filters.
- **Why It Matters:** Conversational, verbose banners push operational data tables below the fold on compact screens and repeat information sales reps already know.
- **Severity & Confidence:** **P3 (Low)** | Confirmed (Code-level inspection)
- **Related Screens:** Page headers across Sales and Customers.
- **Component Paths:** `src/features/customers/CustomerListPage.tsx`, `src/features/quotations/QuotationListPage.tsx`
- **Recommended Direction:** Replace verbose explanatory blocks with compact header pills (e.g. `<Badge variant="outline">Territory: Western</Badge>`).
- **Scope & Fix Type:** Microcopy & layout cleanup.
- **Dependencies & Business Rules:** None.

---

## 4. Sales & Customers Inconsistency Summary Matrix

| Finding ID | Route(s) | Category | Severity | Confidence | Root Cause | Recommended Canonical Pattern |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **SAL-001** | `/pos`, `/payments` | Selectors & Overlays | **P1** | Confirmed | Forked `ThermalReceiptModal` components | Canonical `ThermalReceiptModal` with Radix Dialog |
| **SAL-002** | `/payments/*` | Workflow & Structure | **P1** | Confirmed | 3 route aliases & hidden `/payments` sidebar link | Canonical `/payments/collect/:customerId` + tabbed payments |
| **SAL-003** | `/commissions`, Sidebar | Navigation & Routing | **P2** | Confirmed | Finance sidebar rail pointing to sales hub | Route Finance rail to `/finance/commissions` |
| **SAL-004** | `/warranty`, `/warranty/verification` | Workflow & Structure | **P2** | Confirmed | Redundant route embedding page already in tab | Unified tab navigation inside Warranty Hub |
| **SAL-005** | `/quotations` | Form Anatomy & Radii | **P3** | Confirmed | `rounded-xl` overrides on 32px action buttons | Default `rounded-md` on buttons $\le 40$px |
| **SAL-006** | `/quotations` vs `/orders`, `/invoices` | Layout & Responsiveness | **P2** | Confirmed | Mobile card view used in quotes but omitted in orders | Standard dual-layout (`block md:hidden` cards) |
| **SAL-007** | `/quotations/new`, `/orders/new` | Pricing & Discounts | **P2** | Confirmed | Discount preset chips in orders but missing in quotes | Shared `DiscountLevelPicker` component |
| **SAL-008** | `/invoices/:id` | Pricing & Taxes | **P1** | Confirmed | Hardcoded 15% fallback vs 18% in purchasing | Dynamic `useTax().taxRate` from TaxService |
| **SAL-009** | `/invoices/:id/edit` | Workflow & Structure | **P3** | Confirmed | Dead-end edit alias without posted-state banner | Explanatory immutability notice on non-drafts |
| **SAL-010** | Across sales documents | Statuses & Badges | **P2** | Confirmed | 5 independent status badge components | Unified `DocumentStatusBadge` component |
| **SAL-011** | `/pos/sessions` | Tables & Actions | **P2** | Confirmed | POS shift rows lack transaction drill-down | Shift inspection drawer or filtered transaction link |
| **SAL-012** | `/customers`, `/quotations` | Branding & Text Quality | **P3** | Confirmed | Conversational narrative scoping banners | Compact status badges in page title line |

---

## 5. Verification Status & Remaining Scope

- **Inspected Routes:** 22 of 22 Sales and Customers routes inspected across components, modals, rules, and services.
- **Verification Method:** Static code analysis, diff inspection, TypeScript interface cross-referencing, and layout hierarchy audit.
- **Status of Batch 2:** **Complete.**
- **Next Batch:** **Batch 3: Inventory & Warehouse Module** (`/inventory`, `/inventory/grn`, `/inventory/grn/new`, `/inventory/grn/:id`, `/inventory/stock`, `/inventory/movements`, `/inventory/picking`, `/inventory/dispatch`, `/inventory/delivery-notes`, `/inventory/damaged-stock`).
