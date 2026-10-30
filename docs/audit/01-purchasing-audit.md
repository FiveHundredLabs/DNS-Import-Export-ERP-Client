# ERP UI/UX Consistency Audit — Module 1: Purchasing & Procurement

**Document ID:** `AUDIT-01-PURCHASING`  
**Module:** Purchasing & Procurement  
**Audit Stage:** Stage B — Batch 1  
**Status:** Completed  
**Inspected Date:** October 2026  
**Auditor:** UI Consistency Sentinel  

---

## 1. Executive Summary

This report delivers a comprehensive, evidence-based UI/UX consistency audit of the **Purchasing & Procurement** module of the DNS Import & Export ERP application.

The audit inspected all **12 route endpoints** and supporting components across the module. The purchasing module features robust multi-page A4 printing specifications, multi-currency support, and strict role-based access control (RBAC). However, it exhibits significant architectural and visual inconsistencies:
1. **Financial Multi-Currency Calculation Corruption (P0):** The Purchasing Dashboard and Procurement Reports directly sum foreign currency values (USD, CNY, EUR) with Sri Lankan Rupees (LKR) without conversion, producing corrupted aggregate procurement totals and mislabeling foreign amounts with `Rs.`.
2. **Currency-Agnostic Approval Threshold (P0):** The 500,000 delegation threshold for Executive Director authorization evaluates nominal currency amounts, failing to escalate high-value foreign orders (e.g. $2,000 USD is ~Rs. 600,000 LKR but evaluates as 2,000).
3. **Duplicated Master Data Management (P1):** Two competing supplier management pages exist (`/purchasing/suppliers` and `/finance/suppliers`) with diverging tables, action sets, and layouts.
4. **Isolated Approval Interface (P1):** PO approvals bypass the centralized `ApprovalActionDialog` and omit the `ApprovalTimeline` audit log.
5. **Selector & Control Drift (P1/P2):** Forms rely on raw, unsearchable HTML `<select>` elements rather than the canonical `ProductSelector` or Radix `Select` primitives; pagination relies on ad-hoc buttons rather than `PaginationControls`.

A total of **16 findings** were identified: **2 Critical (P0)**, **4 High (P1)**, **7 Medium (P2)**, and **3 Low (P3)**.

---

## 2. In-Scope Routes & Screen Inventory

| Route Path | Page Component | Primary User Task | Container Layout | Inspection Status |
| :--- | :--- | :--- | :--- | :--- |
| `/purchasing` | `PurchasingDashboard.tsx` | Procurement KPIs, PO activity, quick actions | `StandardLayout` | **Inspected (UI & Code)** |
| `/purchasing/dashboard` | `PurchasingDashboard.tsx` | Alias to purchasing dashboard | `StandardLayout` | **Inspected (UI & Code)** |
| `/purchasing/suppliers` | `PurchasingSuppliersPage.tsx` | Vendor directory, terms, PO initiation | `StandardLayout` | **Inspected (UI & Code)** |
| `/purchasing/orders` | `PurchaseOrderListPage.tsx` | Filter, search, and manage PO lifecycle | `StandardLayout` | **Inspected (UI & Code)** |
| `/purchasing/orders/new` | `PurchaseOrderCreateEditPage.tsx` | Draft PO creation with line-item pricing | `StandardLayout` | **Inspected (UI & Code)** |
| `/purchasing/orders/:id` | `PurchaseOrderDetailPage.tsx` | PO review, approval actions, status transitions | `StandardLayout` | **Inspected (UI & Code)** |
| `/purchasing/orders/:id/edit` | `PurchaseOrderCreateEditPage.tsx` | PO amendment (Draft/Rejected only) | `StandardLayout` | **Inspected (UI & Code)** |
| `/purchasing/orders/:id/print` | `PurchaseOrderPrintPage.tsx` | Multi-page A4 document preview and print | `StandardLayout` | **Inspected (UI & Code)** |
| `/purchasing/grn` | `PurchasingGRNListPage.tsx` | Read-only inward goods receipt register | `StandardLayout` | **Inspected (UI & Code)** |
| `/purchasing/grn/:id` | `PurchasingGRNDetailPage.tsx` | Read-only delivery verification detail | `StandardLayout` | **Inspected (UI & Code)** |
| `/purchasing/reports` | `PurchasingReportsPage.tsx` | Procurement spend, supplier & product reports | `StandardLayout` | **Inspected (UI & Code)** |
| `/purchasing/returns` | `PurchaseReturnsPlaceholderPage.tsx` | Scheduled vendor RMA blueprint | `StandardLayout` | **Inspected (UI & Code)** |

---

## 3. Detailed Audit Findings

```
Severity Breakdown:
┌──────────────┬───────┐
│ P0 Critical  │   2   │
│ P1 High      │   4   │
│ P2 Medium    │   7   │
│ P3 Low       │   3   │
│ Total        │  16   │
└──────────────┴───────┘
```

---

### Finding PUR-001: Inconsistent Table Pagination and Navigation Toolbar Anatomy
- **Module & Affected Routes:** Purchasing — `/purchasing/suppliers`, `/purchasing/orders`, `/purchasing/grn`
- **Page Type & Task:** Master Data & Transaction List Pages (Pagination & Grid Navigation)
- **Issue Category:** 3.1 Layout and responsive behavior / 3.5 Tables and line-item presentation
- **Observed Behavior & Evidence:**
  - `PurchasingSuppliersPage.tsx` (lines 381–409) and `PurchaseOrderListPage.tsx` (lines 371–399) implement custom, ad-hoc pagination bars:
    ```tsx
    <div className="flex items-center justify-between p-3.5 border-t border-slate-200 text-xs text-slate-600">
      <div>Showing {(page - 1) * pageSize + 1} to {Math.min(...)} of {filteredOrders.length} orders</div>
      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
      </div>
    </div>
    ```
  - The shared component hub provides `PaginationControls.tsx` (`src/components/common/PaginationControls.tsx`), which supports first/last buttons, numerical page buttons (`1, 2, 3...`), page size selection (`[12, 24, 48, 96]`), and responsive compact collapse.
- **Why It Matters:** Users have no jump-to-page capability, no ability to change page sizes, and experience differing table footers across modules.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/customers`, `/products`, `/finance/accounts`
- **Component Paths:** `src/features/purchasing/PurchasingSuppliersPage.tsx`, `src/features/purchasing/PurchaseOrderListPage.tsx`, `src/components/common/PaginationControls.tsx`
- **Recommended Direction:** Replace ad-hoc pagination blocks in purchasing list pages with `<PaginationControls currentPage={page} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} />`.
- **Scope & Fix Type:** Local usage of shared component.
- **Dependencies & Business Rules:** None.

---

### Finding PUR-002: Clipped Table Columns and Non-Sticky Layout in PO Line-Item Editor
- **Module & Affected Routes:** Purchasing — `/purchasing/orders/new`, `/purchasing/orders/:id/edit`
- **Page Type & Task:** Transaction Creation / Editing Form
- **Issue Category:** 3.1 Layout and responsive behavior / 3.5 Tables and line-item presentation
- **Observed Behavior & Evidence:**
  - In `PurchaseOrderCreateEditPage.tsx` (lines 423–537), the 8-column line items table has rigid widths (`min-w-[260px]`, `w-24`, `w-32`, `w-20`, `w-20`, `w-32`) enclosed in an `overflow-x-auto` wrapper.
  - On viewports below 1280px, horizontal scroll is required to view the line totals and delete buttons.
  - Form action buttons (`Save as Draft`, `Submit for Approval`) are located only at the top of the page (lines 278–298) and scroll out of view when entering 5+ product lines. There is no sticky bottom action bar.
- **Why It Matters:** Operational procurement officers entering multi-line purchase orders lose spatial context of grand totals and must scroll back and forth to save or delete lines.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/orders/new` (`OrderCreateEditPage.tsx`), `/quotations/new` (`QuotationCreateEditPage.tsx`)
- **Component Paths:** `src/features/purchasing/PurchaseOrderCreateEditPage.tsx`
- **Recommended Direction:** Introduce a sticky footer bar for order totals and actions, and allow table columns to flex responsively with compact numeric input wrappers.
- **Scope & Fix Type:** Local page refactoring aligned to canonical form patterns.
- **Dependencies & Business Rules:** Must preserve real-time line total calculations (`calculateTotals`).

---

### Finding PUR-003: Duplicated Master Data Management Screens for Suppliers
- **Module & Affected Routes:** Purchasing & Finance — `/purchasing/suppliers` vs `/finance/suppliers`
- **Page Type & Task:** Master Data Management (Vendor Directory)
- **Issue Category:** 3.2 Workflow and page structure / 3.8 Navigation and branding
- **Observed Behavior & Evidence:**
  - Two distinct pages manage the exact same underlying `Supplier` entity from `useFinanceLedger()`:
    1. `/purchasing/suppliers` (`PurchasingSuppliersPage.tsx`): 583 lines; includes AP balance sort, "Create PO" action button, and custom inspection modal.
    2. `/finance/suppliers` (`src/features/finance/pages/SuppliersPage.tsx`): 337 lines; includes bank account search, category badges, and delete action.
  - Both pages invoke the shared `SupplierModal.tsx` for create/edit.
  - The sidebar displays both: `Supplier Management` under Purchasing, and `Suppliers` under Finance.
- **Why It Matters:** Fragmented supplier management causes user confusion, maintenance overhead, conflicting filter criteria, and double route footprint for a single master data entity.
- **Severity & Confidence:** **P1 (High)** | Confirmed (Code-level inspection)
- **Related Screens:** `/finance/suppliers`, `/customers`
- **Component Paths:** `src/features/purchasing/PurchasingSuppliersPage.tsx`, `src/features/finance/pages/SuppliersPage.tsx`, `src/features/finance/components/SupplierModal.tsx`
- **Recommended Direction:** Establish a canonical Supplier Master screen (either shared under Master Data or unified between Finance and Purchasing) with contextual action tabs (e.g., Procurement Orders tab vs Accounts Payable Ledger tab).
- **Scope & Fix Type:** Shared architectural consolidation across Purchasing and Finance modules.
- **Dependencies & Business Rules:** Ensure permissions (`purchasing:suppliers_view`, `purchasing:suppliers_manage`) are satisfied.

---

### Finding PUR-004: Duplicated GRN Views Between Purchasing and Warehouse Inventory
- **Module & Affected Routes:** Purchasing & Inventory — `/purchasing/grn`, `/purchasing/grn/:id` vs `/inventory/grn`, `/inventory/grn/:id`
- **Page Type & Task:** Warehouse Inward Goods Receipt Inspection
- **Issue Category:** 3.2 Workflow and page structure
- **Observed Behavior & Evidence:**
  - `PurchasingGRNListPage.tsx` and `PurchasingGRNDetailPage.tsx` duplicate the dataset of `useGRN()`, providing an identical list of records to `/inventory/grn` but stripped of action buttons and charts.
  - `PurchasingGRNListPage` creates its own inline status badge logic (`getStatusBadge`, lines 75–103), while `Inventory/GRNListPage` has a Recharts bar chart and stat cards.
- **Why It Matters:** Maintaining two separate page implementations for the same document type doubles QA surface area and creates UX divergence whenever warehouse features are updated.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/inventory/grn`, `/inventory/grn/:id`
- **Component Paths:** `src/features/purchasing/PurchasingGRNListPage.tsx`, `src/features/purchasing/PurchasingGRNDetailPage.tsx`, `src/features/inventory/GRNListPage.tsx`
- **Recommended Direction:** Unify `/inventory/grn` and `/purchasing/grn` into a single canonical GRN component that conditionally hides creation and adjustment controls based on user role (`isStockKeeper` vs `isPurchasingOfficer`).
- **Scope & Fix Type:** Cross-module component unification.
- **Dependencies & Business Rules:** Preserve RBAC constraint: `PURCHASING_OFFICER` must NEVER have `inventory:grn_create` or `inventory:grn_approve` permissions.

---

### Finding PUR-005: Ad-Hoc Template for Development Placeholder vs Shared Component
- **Module & Affected Routes:** Purchasing — `/purchasing/returns`
- **Page Type & Task:** Placeholder / Under Development Notice
- **Issue Category:** 3.2 Workflow and page structure / 3.11 Text quality
- **Observed Behavior & Evidence:**
  - `PurchaseReturnsPlaceholderPage.tsx` contains 142 lines of custom layout, including construction icons, custom alert blocks, and hardcoded roadmap paragraphs.
  - The application already provides a standard `ModulePlaceholder.tsx` (`src/components/common/ModulePlaceholder.tsx`), which accepts `title`, `modulePhase`, `description`, `icon`, and `features[]`.
- **Why It Matters:** Inconsistent design for placeholder/in-progress features across routes; unnecessary code duplication.
- **Severity & Confidence:** **P3 (Low)** | Confirmed (Code-level inspection)
- **Related Screens:** Other placeholder views using `ModulePlaceholder`
- **Component Paths:** `src/features/purchasing/PurchaseReturnsPlaceholderPage.tsx`, `src/components/common/ModulePlaceholder.tsx`
- **Recommended Direction:** Refactor `PurchaseReturnsPlaceholderPage` to utilize `<ModulePlaceholder title="Purchase Returns & Vendor RMA" modulePhase="Phase 2 Procurement" isUnderDevelopment ... />`.
- **Scope & Fix Type:** Local page cleanup.
- **Dependencies & Business Rules:** None.

---

### Finding PUR-006: Unsearchable Native Selects for Supplier and Product Selection
- **Module & Affected Routes:** Purchasing — `/purchasing/orders/new`, `/purchasing/orders/:id/edit`, `/purchasing/orders`
- **Page Type & Task:** Transaction Entry Form & List Filtering
- **Issue Category:** 3.3 Shared selectors and overlays / 3.4 Forms and input anatomy
- **Observed Behavior & Evidence:**
  - In `PurchaseOrderCreateEditPage.tsx` (lines 316–327):
    ```tsx
    <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="w-full h-9 text-xs rounded-md border border-slate-300 bg-white px-3 text-slate-900...">
      <option value="">Select Registered Supplier...</option>
      {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name} ({sup.code})</option>)}
    </select>
    ```
  - In line items (lines 449–460), every table row renders a raw `<select>` mapping `MOCK_PRODUCTS`.
  - In `PurchaseOrderListPage.tsx` (lines 233–247), supplier filtering uses a raw `<select>`.
  - In `PurchasingReportsPage.tsx` (lines 349–361), supplier selection uses raw `<select>`.
  - Bypasses the canonical `ProductSelector` (`src/components/selectors/ProductSelector.tsx`) and Radix UI `Select` primitive, violating `UI_DEVELOPER_GUIDE.md` section 3.C.
- **Why It Matters:** Raw `<select>` dropdowns are not searchable. In an enterprise system with 50+ suppliers and 200+ products, scrolling through unsearchable HTML dropdowns causes severe operational friction.
- **Severity & Confidence:** **P1 (High)** | Confirmed (Code-level inspection)
- **Related Screens:** `/orders/new` (`OrderCreateEditPage.tsx`), `/quotations/new` (`QuotationCreateEditPage.tsx`)
- **Component Paths:** `src/features/purchasing/PurchaseOrderCreateEditPage.tsx`, `src/components/selectors/ProductSelector.tsx`, `src/components/ui/select.tsx`
- **Recommended Direction:**
  1. Build and export a canonical `SupplierSelector` (combobox with search and VAT number display) following the pattern of `CustomerSelector`.
  2. Replace raw line-item product select with the shared `ProductSelector` or a compact popover combobox.
- **Scope & Fix Type:** Shared component adoption.
- **Dependencies & Business Rules:** Must auto-populate agreed supplier payment terms and historical pricing upon selection.

---

### Finding PUR-007: Native Browser `window.confirm` for Destructive Draft Deletion
- **Module & Affected Routes:** Purchasing — `/purchasing/orders`
- **Page Type & Task:** Transaction List (Draft Record Deletion)
- **Issue Category:** 3.3 Shared selectors and overlays / 3.7 Actions, statuses, and permissions
- **Observed Behavior & Evidence:**
  - In `PurchaseOrderListPage.tsx` (lines 90–95):
    ```tsx
    const handleDeleteDraft = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm('Are you sure you want to delete this draft Purchase Order?')) {
        await deletePO(id);
      }
    };
    ```
- **Why It Matters:** Native browser blocking dialogs (`window.confirm`) violate modern accessible UI standards, cannot be styled or themed, disrupt keyboard focus, and clash with the rest of the application.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** Customer deletion, invoice draft discard dialogs.
- **Component Paths:** `src/features/purchasing/PurchaseOrderListPage.tsx`, `src/components/ui/dialog.tsx`
- **Recommended Direction:** Replace `window.confirm` with a standardized confirmation modal using Radix `Dialog` or an `AlertDialog` confirmation pattern.
- **Scope & Fix Type:** Local page enhancement using shared UI primitive.
- **Dependencies & Business Rules:** Must only permit deletion when `po.status === 'DRAFT'`.

---

### Finding PUR-008: Inconsistent Form Control Radii and Raw HTML Form Elements
- **Module & Affected Routes:** Purchasing — `/purchasing/orders`, `/purchasing/orders/new`, `/purchasing/reports`, `/purchasing/suppliers`
- **Page Type & Task:** General UI Presentation across all purchasing views
- **Issue Category:** 3.4 Forms and input anatomy
- **Observed Behavior & Evidence:**
  - `PurchaseOrderListPage.tsx` line 125 applies `rounded-lg` to the primary "New Purchase Order" button, while all other primary buttons in the module use default `rounded-md`.
  - Filter pills in `PurchasingSuppliersPage.tsx` (lines 229–247) use `rounded-md` inside a `rounded-lg` wrapper, whereas `PurchaseOrderListPage.tsx` (lines 187–213) uses `rounded-xl` cards with `ring-2` active states.
  - Textarea notes inputs (`PurchaseOrderCreateEditPage.tsx` line 558) omit explicit form labels and helper hierarchy.
- **Why It Matters:** Visual fragmentation and micro-spacing drift between sibling routes in the same module.
- **Severity & Confidence:** **P3 (Low)** | Confirmed (Code-level inspection)
- **Related Screens:** Master data forms across the ERP.
- **Component Paths:** `src/features/purchasing/PurchaseOrderListPage.tsx`, `src/features/purchasing/PurchasingSuppliersPage.tsx`
- **Recommended Direction:** Enforce `rounded-md` for all buttons and inputs $\le 40$px height as specified in `UI_DEVELOPER_GUIDE.md` section 3.A.
- **Scope & Fix Type:** Minor style alignment.
- **Dependencies & Business Rules:** None.

---

### Finding PUR-009: Missing Order Lifecycle Actions and Receiving Progression on PO Detail
- **Module & Affected Routes:** Purchasing — `/purchasing/orders/:id`
- **Page Type & Task:** Transaction Detail View
- **Issue Category:** 3.5 Tables and line-item presentation / 3.7 Actions, statuses, and permissions
- **Observed Behavior & Evidence:**
  - On `PurchaseOrderDetailPage.tsx` (lines 362–415), the order items table only displays `Ordered Qty`. When an order is in `PARTIALLY_RECEIVED` or `COMPLETED` status, there is no column showing `Received Qty`, `Pending Qty`, or `Damaged Qty`.
  - There is no link or tab to view related Goods Received Notes (GRNs) generated against this PO.
  - The `CANCELLED` status is supported in `types/purchasing.ts` and `PurchaseOrderStatusBadge.tsx`, but no "Cancel Order" action exists in the UI for drafts or unfulfilled orders.
- **Why It Matters:** Buyers cannot track fulfillment progress against open POs and cannot cancel stalled or rejected procurement orders.
- **Severity & Confidence:** **P1 (High)** | Confirmed (Code-level inspection)
- **Related Screens:** `/orders/:id` (`OrderDetailPage.tsx`), which includes fulfillment and activity log tabs.
- **Component Paths:** `src/features/purchasing/PurchaseOrderDetailPage.tsx`, `src/services/PurchaseOrderService.ts`
- **Recommended Direction:** Add fulfillment columns (`Received` vs `Ordered`), a related GRN reference section, and a guarded "Cancel Order" action.
- **Scope & Fix Type:** Workflow completion on PO Detail view.
- **Dependencies & Business Rules:** Orders already associated with completed GRNs cannot be cancelled without finance reversal.

---

### Finding PUR-010: CRITICAL — Multi-Currency Aggregation Corruption in Dashboards and Reports
- **Module & Affected Routes:** Purchasing — `/purchasing` (`PurchasingDashboard.tsx`), `/purchasing/reports` (`PurchasingReportsPage.tsx`)
- **Page Type & Task:** Executive Dashboard & Analytical Reporting
- **Issue Category:** 3.6 Pricing, costing, and discounts / 3.10 Reports
- **Observed Behavior & Evidence:**
  - In `PurchasingDashboard.tsx` (lines 40–43):
    ```ts
    const totalSpend = purchaseOrders
      .filter((po) => po.status !== 'REJECTED' && po.status !== 'CANCELLED')
      .reduce((sum, po) => sum + (po.grandTotal || 0), 0);
    ```
    and in line 115:
    ```tsx
    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
      {formatCurrency(metrics.totalSpend)}
    </p>
    ```
    `formatCurrency(amount)` defaults to `currencyCode = 'LKR'`.
  - In `PurchasingReportsPage.tsx` (lines 149–151):
    ```ts
    const totalSpend = filteredOrders.reduce((sum, po) => sum + (po.grandTotal || 0), 0);
    ```
    and in line 255: `{formatCurrency(overallTotals.totalSpend)}`.
  - In `PurchasingReportsPage.tsx` (lines 484, 528):
    Supplier-wise and product-wise spend aggregations directly sum `po.grandTotal` across all orders and display as `{formatCurrency(row.totalSpend)}`.
  - In `PurchasingDashboard.tsx` (line 378), pending approval cards display `{formatCurrency(po.grandTotal)}`, omitting `po.currency`.
- **Why It Matters:** The ERP fully supports international procurement currencies (`LKR`, `USD`, `CNY`, `EUR`, `SGD`, `GBP`, `JPY`). If a company issues PO #1 for $10,000 USD and PO #2 for Rs. 500,000 LKR, the dashboard calculates $10,000 + 500,000 = 510,000$ and renders it as **`Rs. 510,000`**! In reality, $10,000 USD $\approx$ Rs. 3,000,000 LKR, so the true procurement spend is ~Rs. 3,500,000. This is a severe financial reporting defect that misleads executives and procurement managers.
- **Severity & Confidence:** **P0 (Critical)** | Confirmed (Code-level inspection)
- **Related Screens:** `/finance/reports`, `/dashboard`
- **Component Paths:** `src/features/purchasing/PurchasingDashboard.tsx`, `src/features/purchasing/PurchasingReportsPage.tsx`, `src/utils/formatters.ts`
- **Recommended Direction:**
  1. Multi-currency aggregation must either:
     - Convert all foreign currency POs to LKR using the transaction exchange rate before summing, OR
     - Group spend metrics by currency tab/card (e.g. `Total Spend: Rs. 45.2M + $120.5K USD + ¥85K CNY`).
  2. Always pass `po.currency` to `formatCurrency(po.grandTotal, po.currency)`.
- **Scope & Fix Type:** Financial calculation & formatting overhaul in purchasing dashboard and reports.
- **Dependencies & Business Rules:** Must align with `SUPPORTED_CURRENCIES` and finance exchange rates.

---

### Finding PUR-011: CRITICAL — Currency-Agnostic Threshold Check for Executive Director Authorization
- **Module & Affected Routes:** Purchasing — `/purchasing/orders/new` (`PurchaseOrderCreateEditPage.tsx`, line 603) and `src/services/PurchaseOrderService.ts` (line 173)
- **Page Type & Task:** PO Creation & Financial Governance Boundary
- **Issue Category:** 3.6 Pricing, costing, and discounts / 3.7 Actions, statuses, and permissions
- **Observed Behavior & Evidence:**
  - In `PurchaseOrderService.ts` (lines 172–174):
    ```ts
    // Above 500,000 LKR requires DIRECTOR; otherwise MANAGER approval
    const targetApproverRole: UserRole = calculated.grandTotal > 500000 ? 'DIRECTOR' : 'MANAGER';
    ```
  - In `PurchaseOrderCreateEditPage.tsx` (lines 603–610):
    ```tsx
    {calculation.grandTotal > 500000 && (
      <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <span>
          Orders exceeding {currency} 500,000 equivalent require executive <strong>Director Authorization</strong> under ERP financial delegation rules.
        </span>
      </div>
    )}
    ```
- **Why It Matters:**
  - If a user creates a PO in USD for $2,000 USD (equivalent to ~Rs. 600,000 LKR), `grandTotal` is 2000. Because $2000 < 500000$, the system routes this high-value order to a **MANAGER** instead of a **DIRECTOR**, bypassing the company's financial governance threshold!
  - In the UI, if currency is USD, the warning message claims: `Orders exceeding USD 500,000 equivalent require executive Director Authorization...` — $500,000 USD is over 150 Million LKR!
- **Severity & Confidence:** **P0 (Critical)** | Confirmed (Code-level inspection)
- **Related Screens:** `/orders/new` (Sales order commercial credit and discount limits).
- **Component Paths:** `src/features/purchasing/PurchaseOrderCreateEditPage.tsx`, `src/services/PurchaseOrderService.ts`
- **Recommended Direction:**
  1. Base the approval threshold calculation on the base LKR equivalent (e.g. `convertCurrency(grandTotal, currency, 'LKR') > 500000`).
  2. In the UI warning banner, display the threshold converted into the active currency or explicitly state `Rs. 500,000 LKR equivalent (approx. $1,650 USD)`.
- **Scope & Fix Type:** Business rule & UI notification fix.
- **Dependencies & Business Rules:** Financial delegation rule: all commitments $> \text{Rs. } 500,000$ must require Director authorization.

---

### Finding PUR-012: Fragmented and Competing Status Badge Implementations
- **Module & Affected Routes:** Purchasing — Across all purchasing screens (`PurchaseOrderStatusBadge.tsx`, `PurchasingGRNListPage.tsx`, `PurchasingDashboard.tsx`)
- **Page Type & Task:** Status Display across Lists, Details, and Cards
- **Issue Category:** 3.7 Actions, statuses, and permissions
- **Observed Behavior & Evidence:**
  - `PurchaseOrderStatusBadge.tsx` uses custom `rounded-full` styling, animated pulses (`animate-pulse`), and Lucide icons.
  - `PurchasingGRNListPage.tsx` defines a private local helper `getStatusBadge()` using `rounded-md` and arbitrary colors.
  - In contrast, the global approval engine uses `ApprovalBadge.tsx` with standard Shadcn variants.
  - In `PurchasingDashboard.tsx` (lines 85–87), role indicator badges use `font-mono text-xs rounded-md`.
- **Why It Matters:** Competing status tokens cause visual drift and inconsistent status labeling across routes.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/invoices`, `/orders`, `/approvals`
- **Component Paths:** `src/features/purchasing/components/PurchaseOrderStatusBadge.tsx`, `src/features/purchasing/PurchasingGRNListPage.tsx`, `src/components/approval/ApprovalBadge.tsx`
- **Recommended Direction:** Unify all document status badges to use consistent semantic tokens, standard radii (`rounded-md` or subtle pill), and standard icon sizes.
- **Scope & Fix Type:** Design token and component standard.
- **Dependencies & Business Rules:** Must map accurately to `PurchaseOrderStatus` enum.

---

### Finding PUR-013: Hardcoded Role Banners and Title Desynchronization
- **Module & Affected Routes:** Purchasing — `/purchasing` (`PurchasingDashboard.tsx`), `/purchasing/grn/:id` (`PurchasingGRNDetailPage.tsx`)
- **Page Type & Task:** Page Headers & Informational Banners
- **Issue Category:** 3.8 Navigation and branding / 3.11 Text quality
- **Observed Behavior & Evidence:**
  - In `PurchasingDashboard.tsx` (lines 85–87):
    ```tsx
    <Badge variant="outline" className="bg-primary-light text-primary border-primary-border text-xs font-mono">
      ROLE: PURCHASING_OFFICER
    </Badge>
    ```
    This badge is hardcoded. When a Director or Manager navigates to the purchasing dashboard, the UI still displays `ROLE: PURCHASING_OFFICER`.
  - In `PurchasingGRNDetailPage.tsx` (lines 88–98):
    ```tsx
    <div className="p-3.5 bg-primary text-primary-foreground rounded-xl shadow-xs flex items-center justify-between text-xs">
      <span>
        <strong>Read-Only Inspection Mode:</strong> As a Purchasing Officer, you have viewing authorization for inward deliveries...
      </span>
    </div>
    ```
    This banner occupies prominent visual space with primary background and hardcodes "As a Purchasing Officer...", even if viewed by a Director or Stock Keeper.
  - In `Header.tsx`, `ROUTE_TITLES` defines `/purchasing/orders/new` as `Create Purchase Order`, but editing `/purchasing/orders/:id/edit` falls back to `Purchase Order Details`.
- **Why It Matters:** Hardcoded role labels confuse users with multi-role permissions and violate dynamic role rendering standards.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** Global header and role dashboards.
- **Component Paths:** `src/features/purchasing/PurchasingDashboard.tsx`, `src/features/purchasing/PurchasingGRNDetailPage.tsx`, `src/components/common/Header.tsx`
- **Recommended Direction:**
  1. Remove hardcoded role badges or replace with dynamic `{currentUser.role}` display.
  2. Replace conversational role banners with concise alert pills: `<Badge variant="outline">Read-Only View</Badge>`.
- **Scope & Fix Type:** Local template cleanup.
- **Dependencies & Business Rules:** Preserves view-only access for purchasing officer on GRNs.

---

### Finding PUR-014: Isolated Approval Implementation Bypassing Shared Approval Engine
- **Module & Affected Routes:** Purchasing — `/purchasing/orders/:id` (`PurchaseOrderDetailPage.tsx`) vs `/approvals` (`ApprovalsPage.tsx`)
- **Page Type & Task:** Approval Workflow & Document Review
- **Issue Category:** 3.9 Approvals and cross-workflow context
- **Observed Behavior & Evidence:**
  - On `PurchaseOrderDetailPage.tsx` (lines 244–288), approval and rejection actions are rendered as an inline card directly inside the page body:
    ```tsx
    {canApprove && (
      <Card className="border-amber-300 bg-amber-50/50 shadow-sm">
        <Textarea placeholder="Enter approval verification notes..." value={approvalComment} ... />
        <Button variant="destructive" onClick={handleManagerReject}>Reject Order</Button>
        <Button variant="default" onClick={handleManagerApprove}>Approve Purchase Order</Button>
      </Card>
    )}
    ```
  - Bypasses the canonical `ApprovalActionDialog.tsx` (`src/components/approval/ApprovalActionDialog.tsx`).
  - Does NOT render `ApprovalTimeline.tsx` (`src/components/approval/ApprovalTimeline.tsx`), denying approvers access to the history of who created the PO, prior rejections, or comments.
- **Why It Matters:** Inconsistent approval UX across modules. Approvers on Sales Orders use a modal dialog with full historical timeline, while Purchasing approvers use an ad-hoc inline form with zero timeline context.
- **Severity & Confidence:** **P1 (High)** | Confirmed (Code-level inspection)
- **Related Screens:** `/approvals`, `/approvals/orders/:id`
- **Component Paths:** `src/features/purchasing/PurchaseOrderDetailPage.tsx`, `src/components/approval/ApprovalActionDialog.tsx`, `src/components/approval/ApprovalTimeline.tsx`
- **Recommended Direction:** Standardize PO approvals by integrating `ApprovalActionDialog` and embedding `ApprovalTimeline` in `PurchaseOrderDetailPage`.
- **Scope & Fix Type:** Adoption of shared approval components.
- **Dependencies & Business Rules:** Must invoke `approvalService.processAction()` with minimum 3-character comment validation.

---

### Finding PUR-015: Inconsistent Report Date Filter Anatomy and Fragile CSV Generation
- **Module & Affected Routes:** Purchasing — `/purchasing/reports` (`PurchasingReportsPage.tsx`)
- **Page Type & Task:** Analytical Reporting & Data Export
- **Issue Category:** 3.10 Reports
- **Observed Behavior & Evidence:**
  - In `PurchasingReportsPage.tsx` (lines 363–382), date filters are basic HTML date inputs labeled with plain text `From:` / `To:`:
    ```tsx
    <div className="flex items-center gap-1.5"><span className="text-[11px] text-slate-400 font-medium">From:</span><Input type="date" value={startDate} ... /></div>
    ```
  - In Finance reports (`src/features/finance/pages/reports/ReportDateFilterBar.tsx`) and General reports (`src/features/reports/ReportsFilterToolbar.tsx`), date filtering uses preset buttons (Today, This Month, Last Month, YTD) and standardized button toolbars.
  - In `PurchasingReportsPage.tsx` (lines 165–192), CSV export constructs a raw CSV data URI using `encodeURI("data:text/csv...")` and creates a temporary `<a>` element, instead of using `exportToCSV` (`src/utils/exportUtils.ts`).
- **Why It Matters:** The manual CSV encoder fails to properly escape complex string characters (e.g. products with quotes or commas in descriptions) and can fail on large datasets. The date filter lacks quick-select presets found elsewhere in the application.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/finance/reports`, `/reports`
- **Component Paths:** `src/features/purchasing/PurchasingReportsPage.tsx`, `src/utils/exportUtils.ts`, `src/features/finance/pages/reports/ReportDateFilterBar.tsx`
- **Recommended Direction:**
  1. Replace manual CSV generation with `exportToCSV(filename, headers, rows)` from `src/utils/exportUtils.ts`.
  2. Standardize report date range filtering to adopt the canonical date preset component.
- **Scope & Fix Type:** Local refactor to consume shared utilities.
- **Dependencies & Business Rules:** Preserves filtered dataset criteria.

---

### Finding PUR-016: Conversational and Redundant Explanatory Copy
- **Module & Affected Routes:** Purchasing — `/purchasing/returns`, `/purchasing/grn/:id`
- **Page Type & Task:** Placeholder and Detail Views
- **Issue Category:** 3.11 Text quality and production readiness
- **Observed Behavior & Evidence:**
  - In `PurchaseReturnsPlaceholderPage.tsx` (lines 65–90):
    "To guarantee enterprise data safety, no transactional side-effects are active in this section: Zero inventory balance write-offs, Zero supplier credit note generation..."
  - In `PurchasingGRNDetailPage.tsx` (lines 92–93):
    "As a Purchasing Officer, you have viewing authorization for inward deliveries. Modifications, stock adjustments, and approval actions are restricted to Stock Keeper and Finance roles."
- **Why It Matters:** Overly conversational, narrative, or developer-facing copy clutters the UI and reduces operational efficiency.
- **Severity & Confidence:** **P3 (Low)** | Confirmed (Code-level inspection)
- **Related Screens:** System-wide banners and placeholder cards.
- **Component Paths:** `src/features/purchasing/PurchaseReturnsPlaceholderPage.tsx`, `src/features/purchasing/PurchasingGRNDetailPage.tsx`
- **Recommended Direction:** Replace conversational paragraphs with crisp, task-oriented ERP labels (e.g., `Read-Only Audit Mode`, `Feature Scheduled for Phase 2`).
- **Scope & Fix Type:** Copy polish.
- **Dependencies & Business Rules:** None.

---

## 4. Purchasing Module Inconsistency Summary Matrix

| Finding ID | Route(s) | Category | Severity | Confidence | Root Cause | Recommended Canonical Pattern |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **PUR-001** | `/purchasing/suppliers`, `/purchasing/orders` | Layout & Tables | **P2** | Confirmed | Custom pagination re-implementation | Canonical `PaginationControls.tsx` |
| **PUR-002** | `/purchasing/orders/new`, `/orders/:id/edit` | Layout & Forms | **P2** | Confirmed | Overcrowded 8-column table with scrolled actions | Responsive grid + sticky bottom action bar |
| **PUR-003** | `/purchasing/suppliers` vs `/finance/suppliers` | Workflow & Structure | **P1** | Confirmed | Competing supplier management screens | Unified Supplier Master with contextual tabs |
| **PUR-004** | `/purchasing/grn` vs `/inventory/grn` | Workflow & Structure | **P2** | Confirmed | Forked view-only GRN page | Role-guarded canonical GRN screen |
| **PUR-005** | `/purchasing/returns` | Workflow & Structure | **P3** | Confirmed | Custom placeholder design | Shared `ModulePlaceholder.tsx` |
| **PUR-006** | `/purchasing/orders/new`, `/orders` | Selectors & Overlays | **P1** | Confirmed | Raw unsearchable `<select>` elements | Canonical `ProductSelector` & `SupplierSelector` |
| **PUR-007** | `/purchasing/orders` | Selectors & Overlays | **P2** | Confirmed | Native `window.confirm` | Standard Radix `Dialog` confirmation |
| **PUR-008** | Across purchasing forms | Form Anatomy | **P3** | Confirmed | Inconsistent control border radii | Standard `rounded-md` for controls $\le 40$px |
| **PUR-009** | `/purchasing/orders/:id` | Tables & Actions | **P1** | Confirmed | Missing fulfillment progression & cancel action | Ordered vs Received quantities + Cancel action |
| **PUR-010** | `/purchasing`, `/purchasing/reports` | Pricing & Costing | **P0** | Confirmed | Foreign currency nominal totals summed with LKR | Currency-aware aggregation with FX conversion |
| **PUR-011** | `/purchasing/orders/new`, Service | Pricing & Governance | **P0** | Confirmed | 500k Director threshold checked in nominal terms | Converted base LKR equivalent threshold check |
| **PUR-012** | Across purchasing views | Statuses & Badges | **P2** | Confirmed | Competing `PurchaseOrderStatusBadge` vs `ApprovalBadge` | Standardized semantic status badge token |
| **PUR-013** | `/purchasing`, `/purchasing/grn/:id` | Branding & Navigation | **P2** | Confirmed | Hardcoded role badges & verbose banners | Dynamic role rendering + concise alerts |
| **PUR-014** | `/purchasing/orders/:id` | Approvals Context | **P1** | Confirmed | Ad-hoc inline approval card omitting timeline | Canonical `ApprovalActionDialog` + `ApprovalTimeline` |
| **PUR-015** | `/purchasing/reports` | Reports & Export | **P2** | Confirmed | Fragile raw CSV URI and divergent date filters | Shared `exportToCSV` + preset date filter toolbar |
| **PUR-016** | `/purchasing/returns`, `/grn/:id` | Text Quality | **P3** | Confirmed | Conversational / AI-sounding explanatory copy | Concise task-oriented ERP microcopy |

---

## 5. Verification Status & Remaining Scope

- **Inspected Routes:** 12 of 12 Purchasing routes inspected via source code, component hierarchy, types, test suites, and route definitions.
- **Verification Method:** Static code analysis, TypeScript contract validation, design token cross-referencing against `UI_DEVELOPER_GUIDE.md` and `styles.css`.
- **Status of Batch 1:** **Complete.**
- **Next Batch:** **Batch 2: Sales and Customers Module** (`/customers`, `/quotations`, `/orders`, `/invoices`, `/payments`, `/pos`, `/warranty`, `/commissions`).
