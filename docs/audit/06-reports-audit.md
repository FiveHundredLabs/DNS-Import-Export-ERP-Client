# Module Audit: Reports & Analytics Hub

**Audit Target:** `src/features/reports/` and Cross-Module Analytical Surfaces  
**Inspected Routes & Tabs:**
- `/reports` (`ReportsPage.tsx`)
- All 7 analytical tabs:
  1. `ExecutiveOverviewTab.tsx`
  2. `SalesAnalyticsTab.tsx`
  3. `InventoryAnalyticsTab.tsx`
  4. `FinanceCollectionsTab.tsx`
  5. `CommissionAnalyticsTab.tsx`
  6. `PosAnalyticsTab.tsx`
  7. `AreaPerformanceTab.tsx`
- Supporting components: `ReportsFilterToolbar.tsx`, `exportUtils.ts`
- Cross-module comparisons with `/purchasing/reports` (`PurchasingReportsPage.tsx`) and `/finance/reports/*` (Statutory Financial Reports).  
**Status:** Audit Completed  
**Finding Count:** 13 Findings (`REP-001` through `REP-013`)  
**Severity Breakdown:** 2 Critical (P0) | 5 High (P1) | 5 Medium (P2) | 1 Low (P3)  

---

## 1. Executive Summary

The Reports & Analytics module (`/reports`) is presented as the centralized executive intelligence and Business Intelligence (BI) command center for the DNS Import & Export ERP, claiming to provide a *"Single Source of Truth cross-functional business intelligence across sales, stock, and collections."*

While the UI offers an attractive suite of Recharts visualizations, territory drill-downs, and aging breakdowns, **the audit revealed fundamental data pipeline fractures, deep cross-module reconcilability conflicts, and severe performance antipatterns**:

1. **Decoupled Operational Analytics vs Statutory Accounting (P0):**
   - The entire reporting engine computes Gross Revenue, Collections, and Inventory Valuation from operational frontend services (`InvoiceService`, `PaymentService`, `ProductService`), completely bypassed by the statutory General Ledger (`financeRepository`). An invoice created in `/invoices/new` impacts `/reports` immediately, but never touches the statutory P&L or Balance Sheet in `/finance/reports`.
   - **Three Conflicting Accounts Receivable Figures:**
     - BI Reports (`FinanceCollectionsTab.tsx`) reports debt from `invoiceService.getAllInvoices()`.
     - Finance AR (`ReceiptApprovalQueuePage.tsx`) reports debt from `arService.ts`'s hardcoded `MOCK_OPEN_INVOICES`.
     - Statutory Finance (`BalanceSheetPage.tsx`) reports debt from GL Account `1020`.
     None of these three reconcile with one another.

2. **Heavyweight 20-Query Waterfall on Mount (P1):**
   - `useReports.ts` fires a monolithic `Promise.all` executing **20 simultaneous reporting queries** across `ReportService` and `AdvancedReportService` on initial mount and on every single filter change, regardless of which tab the user is viewing.

3. **Systemic Currency Formatting Divergence (P1):**
   - All reporting tabs format currency via `formatCurrencyLKR` from `exportUtils.ts` (outputting `LKR 1,234.56`), whereas the entire operational application (Invoices, Orders, POs, POS, and GL) formats currency via `formatCurrency` from `formatters.ts` (outputting `Rs. 1,234.56`).

4. **Procurement Blindness & Reporting Silos (P1):**
   - In an enterprise whose primary business is Import & Export, the central `/reports` hub has **zero** procurement or purchasing analytics. Purchasing reports are marooned in an isolated silo at `/purchasing/reports`.

5. **Crude Print Architecture (P1):**
   - The global toolbar's "Print" button simply triggers raw `window.print()`, sending interactive web buttons, tabs, and unpaginated tables directly to the browser printer without corporate headers, tax credentials, or page-break rules.

---

## 2. In-Depth Audit Findings

### REP-001: Decoupled Operational Analytics and Statutory General Ledger
- **Finding ID:** `REP-001`
- **Module & Route:** Reports (`/reports`) vs Finance (`/finance/reports/*`)
- **Page Type & Task:** Business Intelligence / Single Source of Truth Integrity
- **Issue Category:** 3.10 Reports / Financial Truth Divergence
- **Severity:** **P0 (Critical)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/reports/ReportsPage.tsx`
  - `src/services/ReportService.ts` (lines 1–40)
  - `src/features/reports/ExecutiveOverviewTab.tsx` (lines 45–80)
  - `src/features/finance/pages/reports/ProfitLossPage.tsx`
  - `src/features/finance/pages/reports/BalanceSheetPage.tsx`
- **Observed Behavior / Code Evidence:**
  In `ReportService.ts`:
  ```typescript
  export class ReportService {
    constructor(
      private productSvc: ProductService = productService,
      private customerSvc: CustomerService = customerService,
      private orderSvc: OrderService = orderService,
      private invoiceSvc: InvoiceService = invoiceService,
      private paymentSvc: PaymentService = paymentService,
      private inventorySvc: InventoryService = inventoryService,
      private posSvc: POSService = posService,
      private commissionSvc: CommissionService = commissionService
    ) {}
  ```
  `ReportService` calculates company-wide Gross Revenue, Total Collected, Total Outstanding, and Inventory Valuation purely by iterating in-memory mock datasets in `invoiceService`, `paymentService`, and `inventoryService`.
  It does **not** connect to `financeRepository` or query General Ledger accounts.
  Meanwhile, in `/finance/reports/pnl` and `/finance/reports/balance-sheet`, statutory revenue and inventory balances are computed from GL Accounts `4010` and `1100` in `MockFinanceRepository`.
- **Why It Matters:**
  The application claims to provide a "Single Source of Truth", but displays contradictory revenue, gross profit, and stock valuation numbers depending on whether an executive looks at `/reports` or `/finance/reports`. Operational transactions never post to the general ledger, creating an illusion of business health that has no backing in financial accounting records.
- **Recommended Direction:**
  Architect an accounting synchronization bridge. Ensure operational invoices and payments post double-entry vouchers to the General Ledger, and provide a reconciliation card in the Executive Overview tab highlighting any variance between operational sub-ledgers and the statutory general ledger.

---

### REP-002: Triple Desynchronization of Accounts Receivable Debt Figures
- **Finding ID:** `REP-002`
- **Module & Route:** Reports (`/reports`), Finance AR (`/finance/ar/*`), Statutory Finance (`/finance/reports/balance-sheet`)
- **Page Type & Task:** Debt Monitoring & Credit Risk / Multi-Ledger Reconciliation
- **Issue Category:** 3.10 Reports / Data Consistency
- **Severity:** **P0 (Critical)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/reports/FinanceCollectionsTab.tsx` (lines 25–90)
  - `src/features/finance/pages/ar/ReceiptApprovalQueuePage.tsx`
  - `src/features/finance/services/arService.ts` (lines 280–295)
  - `src/features/finance/pages/reports/BalanceSheetPage.tsx`
- **Observed Behavior / Code Evidence:**
  Three completely different Accounts Receivable debt balances exist simultaneously across the application:
  1. **Operational A/R Aging (`/reports` -> Finance & Collections):**
     Computed in `ReportService.getFinanceReport()` by summing `balanceDue` from `invoiceService.getAllInvoices()`.
  2. **Collector / Cashier A/R (`/finance/ar/approvals`, `/finance/ar/allocate`):**
     Computed in `arService.ts` from hardcoded static `MOCK_OPEN_INVOICES`.
  3. **Statutory General Ledger A/R (`/finance/reports/balance-sheet`):**
     Computed from debits minus credits in GL Account `1020` (Accounts Receivable Control Account) inside `MockFinanceRepository`.
- **Why It Matters:**
  When credit recovery teams, cash collectors, and the CFO look at the ERP, all three see different overdue debts, aging buckets, and customer outstanding balances. Collections applied in `/finance/ar/allocate` do not update the aging buckets in `/reports`.
- **Recommended Direction:**
  Deprecate `MOCK_OPEN_INVOICES` in `arService.ts`. Bind all debt tracking to a unified Accounts Receivable sub-ledger service that reconciles directly with GL Account `1020`.

---

### REP-003: Monolithic 20-Query Heavy Request Waterfall on Initial Page Load
- **Finding ID:** `REP-003`
- **Module & Route:** Reports (`/reports`)
- **Page Type & Task:** Data Fetching / Performance & Responsiveness
- **Issue Category:** 3.1 Layout and Responsive Behavior / Performance Antipattern
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/hooks/useReports.ts` (lines 48–71)
- **Observed Behavior / Code Evidence:**
  In `useReports.ts`:
  ```typescript
  const [
    kpiRes, salesRes, invRes, finRes,
    creditExceptionsRes, commSalesRes, perfCommRes,
    tillRecRes, dailyShowroomRes, oldStockRes,
    slowMovingRes, commAdjRes, weeklyPerfRes,
    posChequeRes, posAuditRes, grnSummaryRes,
    batchExpRes, stockVarRes, stockMovRes, chequeAgingRes
  ] = await Promise.all([
    reportService.getExecutiveKpis(user, filter),
    reportService.getSalesReport(user, filter),
    reportService.getInventoryReport(user, filter),
    reportService.getFinanceReport(user, filter),
    advancedReportService.getCreditExceptions(user, filter),
    advancedReportService.getCommissionLinkedSales(user, filter),
    advancedReportService.getPerformanceBasedCommission(user, filter),
    advancedReportService.getCashierTillReconciliation(user, filter),
    advancedReportService.getDailyShowroomSummary(user, filter),
    advancedReportService.getOldStockTracking(user, filter),
    advancedReportService.getSlowMovingProducts(user, filter),
    advancedReportService.getCommissionAdjustments(user, filter),
    advancedReportService.getWeeklySalesPerformance(user, filter),
    advancedReportService.getPosChequeRegister(user, filter),
    advancedReportService.getPosAuditLog(user, filter),
    advancedReportService.getGrnSummary(user, filter),
    advancedReportService.getBatchExpiration(user, filter),
    advancedReportService.getStockVariance(user, filter),
    advancedReportService.getStockMovement(user, filter),
    advancedReportService.getChequeRealizationAndAging(user, filter),
  ]);
  ```
- **Why It Matters:**
  Even if an executive merely opens `/reports` to check the 6 KPI cards on the Executive Overview tab, the client triggers **20 parallel heavy analytical computations** (including serial movement logs, batch expiration dates, till reconciliation, and POS audit logs). This causes UI stutter, high memory consumption, and unnecessary CPU load.
- **Recommended Direction:**
  Implement lazy tab-level data fetching. Only query `getExecutiveKpis` and `getSalesReport` on mount. Load `advancedReports` queries dynamically when the respective tab (Inventory, Commission, POS) is actively selected.

---

### REP-004: Systemic Currency Formatting Divergence (`LKR` vs `Rs.`)
- **Finding ID:** `REP-004`
- **Module & Route:** Reports (`/reports` all tabs) vs Operational Modules
- **Page Type & Task:** Data Formatting / Numerical Display Consistency
- **Issue Category:** 3.4 Forms and Input Anatomy / Formatting Standards
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/utils/exportUtils.ts` (line 58)
  - `src/utils/formatters.ts` (line 4)
  - `src/features/reports/ExecutiveOverviewTab.tsx` (line 17)
  - `src/features/reports/SalesAnalyticsTab.tsx` (line 5)
  - `src/features/reports/InventoryAnalyticsTab.tsx` (line 5)
  - `src/features/reports/FinanceCollectionsTab.tsx` (line 5)
  - `src/features/reports/AreaPerformanceTab.tsx` (line 14)
- **Observed Behavior / Code Evidence:**
  In `exportUtils.ts`:
  ```typescript
  export function formatCurrencyLKR(amount: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }
  ```
  This outputs `LKR 1,234.56` (or `SLRs 1,234.56` depending on browser/OS locale).
  Meanwhile, `src/utils/formatters.ts` defines:
  ```typescript
  export function formatCurrency(amount: number): string {
    return `Rs. ${Number(amount).toLocaleString('en-US', { ... })}`;
  }
  ```
  Every single reporting tab imports and uses `formatCurrencyLKR`, while all other screens (Invoicing, Orders, POs, POS, Payments, Ledgers) use `formatCurrency`.
- **Why It Matters:**
  A user navigating from Sales Invoices to the Reports Hub sees currency prefixes jump arbitrarily between `Rs. 50,000.00` and `LKR 50,000.00`, conveying a disjointed, multi-author feel.
- **Recommended Direction:**
  Consolidate onto a single canonical currency formatter in `src/utils/formatters.ts`. Enforce consistent currency representation throughout the application.

---

### REP-005: Complete Exclusion of Procurement & Purchasing from Enterprise Reporting Hub
- **Finding ID:** `REP-005`
- **Module & Route:** Reports (`/reports`) vs Purchasing (`/purchasing/reports`)
- **Page Type & Task:** Analytical Navigation / Domain Completeness
- **Issue Category:** 3.8 Navigation and Branding / Architectural Silos
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/reports/ReportsPage.tsx` (lines 23–28, 49–57)
  - `src/features/purchasing/PurchasingReportsPage.tsx`
- **Observed Behavior / Code Evidence:**
  The main reporting hub offers tabs for:
  - Executive Overview
  - Sales Analytics
  - Inventory Analytics
  - Finance & Collections
  - Commission Analytics
  - POS Analytics
  - Area Performance
  It provides **zero procurement or purchasing metrics**.
  Purchasing reports (supplier spend, PO volume, multi-currency purchasing) are stranded in a separate screen at `/purchasing/reports`.
- **Why It Matters:**
  For an import/export business, procurement spend, overseas container lead times, and supplier performance are central executive concerns. Executives cannot access purchasing intelligence from the central reporting portal.
- **Recommended Direction:**
  Add a dedicated `Purchasing & Procurement Analytics` tab to `/reports`, or provide a unified tab switcher linking to `/purchasing/reports`.

---

### REP-006: Complete Lack of Print Layout & Export Architecture
- **Finding ID:** `REP-006`
- **Module & Route:** Reports (`/reports`)
- **Page Type & Task:** Reporting Output / Printable Documents
- **Issue Category:** 3.10 Reports / Print & Export Ergonomics
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/reports/ReportsFilterToolbar.tsx` (lines 73–82)
  - `src/utils/exportUtils.ts` (lines 49–53)
  - `src/features/finance/components/CorporateReportHeader.tsx`
- **Observed Behavior / Code Evidence:**
  Clicking the "Print" button on `ReportsFilterToolbar` calls `triggerPrintReport()`, which directly invokes:
  ```typescript
  export function triggerPrintReport(): void {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }
  ```
  This prints the raw browser DOM as-is. Tab bars, interactive buttons, filter inputs, and scrollable container borders are sent straight to the printer without corporate letterheads, audit stamps, company registration details, or CSS `@media print` table formatting.
  In contrast, `/finance/reports/*` uses `reportPdfService.printReportHtml()` with formal `CorporateReportHeader` and `CorporateSignatureBlock`.
- **Why It Matters:**
  Executives attempting to print executive or inventory summaries receive unprofessional, unpaginated browser printouts with visible UI buttons and truncated tables.
- **Recommended Direction:**
  Implement a shared printable report template using `CorporateReportHeader` and clean `@media print` styles that strip UI chrome, navigation tabs, and buttons.

---

### REP-007: Complete Type Erosion and Loss of Numeric Formatting in Specialized Tabs
- **Finding ID:** `REP-007`
- **Module & Route:** Reports (`CommissionAnalyticsTab.tsx`, `PosAnalyticsTab.tsx`)
- **Page Type & Task:** Tab Presentation / Code Quality & Type Safety
- **Issue Category:** 3.5 Tables and Line-Item Presentation / Formatting Loss
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/reports/CommissionAnalyticsTab.tsx` (lines 6–10, 57–67)
  - `src/features/reports/PosAnalyticsTab.tsx` (lines 6–10, 56–66)
- **Observed Behavior / Code Evidence:**
  In `CommissionAnalyticsTab.tsx`:
  ```typescript
  interface CommissionAnalyticsTabProps {
    advancedReports: any;
  }
  // ...
  <td className="px-4 py-3">{item.targetAmount.toLocaleString()}</td>
  <td className="px-4 py-3">{item.achievedAmount.toLocaleString()}</td>
  <td className="px-4 py-3 font-bold text-slate-900">{item.totalPayout.toLocaleString()}</td>
  ```
  In `PosAnalyticsTab.tsx`:
  ```typescript
  interface PosAnalyticsTabProps {
    advancedReports: any;
  }
  // ...
  <td className="px-4 py-3 font-bold text-slate-900">{item.totalSales.toLocaleString()}</td>
  <td className="px-4 py-3">{item.cashSales.toLocaleString()}</td>
  ```
  Both tabs abandon TypeScript types (`any`) and abandon both `formatCurrency` and `formatCurrencyLKR`. Monetary amounts are formatted with raw `.toLocaleString()`, omitting currency symbols entirely (`Rs.` or `LKR`) and losing trailing zeros (`.00`).
- **Why It Matters:**
  Type safety is lost, and numbers in Commission and POS tables look bare and unstyled compared to the professional currency displays in the other 5 tabs.
- **Recommended Direction:**
  Define strict TypeScript interfaces for `AdvancedReportsPayload`. Standardize all monetary columns on the canonical currency formatter.

---

### REP-008: Stacked Duplicate Territory Selectors in Area Performance Tab
- **Finding ID:** `REP-008`
- **Module & Route:** Reports (`AreaPerformanceTab.tsx`, `ReportsFilterToolbar.tsx`)
- **Page Type & Task:** Filter Controls / Territory Scoping
- **Issue Category:** 3.3 Shared Selectors and Overlays / UI Redundancy
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/reports/AreaPerformanceTab.tsx` (lines 61–79)
  - `src/features/reports/ReportsFilterToolbar.tsx` (lines 112–135)
- **Observed Behavior / Code Evidence:**
  When a Director or Sales Manager opens the "Area Performance" tab, the screen renders two identical territory dropdown selectors within inches of each other:
  1. In `ReportsFilterToolbar.tsx`: A `"Territory / Area"` dropdown selector.
  2. In `AreaPerformanceTab.tsx`: A `"Switch Territory:"` dropdown selector with the exact same list of `MOCK_AREAS`.
- **Why It Matters:**
  Duplicate interactive controls confuse users about which selector governs the active scope.
- **Recommended Direction:**
  Remove the redundant local selector from `AreaPerformanceTab.tsx` and rely solely on the global toolbar selector, or hide the global territory selector when viewing Area Performance.

---

### REP-009: Conflicting Date Filter Mechanics Between Enterprise BI and Finance Reports
- **Finding ID:** `REP-009`
- **Module & Route:** Reports (`ReportsFilterToolbar.tsx`) vs Finance (`ReportDateFilterBar.tsx`)
- **Page Type & Task:** Date Filtering / Ergonomic Consistency
- **Issue Category:** 3.10 Reports / Filter Inconsistency
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/reports/ReportsFilterToolbar.tsx` (lines 86–108)
  - `src/features/finance/pages/reports/ReportDateFilterBar.tsx` (lines 26–47)
- **Observed Behavior / Code Evidence:**
  In `ReportsFilterToolbar.tsx` (`/reports`), date filtering requires users to manually click HTML date picker inputs for Start Date and End Date. There are zero quick preset buttons.
  In `ReportDateFilterBar.tsx` (`/finance/reports/*`), date filtering provides quick preset buttons: `Today`, `This Month`, `This Quarter`, `This Year`, `Custom`.
- **Why It Matters:**
  Inconsistent user ergonomics. An executive quickly checking quarterly numbers in `/reports` must manually look up quarter start and end dates on a calendar, while `/finance/reports` provides one-click presets.
- **Recommended Direction:**
  Standardize on a single shared `DateFilterToolbar` component featuring quick presets (`Today`, `Month`, `Quarter`, `Year`, `Custom`) across both general reporting and financial reporting.

---

### REP-010: Reused and Ambiguous Icons Across Navigation Tabs
- **Finding ID:** `REP-010`
- **Module & Route:** Reports (`ReportsPage.tsx`)
- **Page Type & Task:** Navigation Tabs / Visual Hierarchy
- **Issue Category:** 3.8 Navigation and Branding / Icon Inconsistency
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/reports/ReportsPage.tsx` (lines 112, 148, 160, 173)
- **Observed Behavior / Code Evidence:**
  In `ReportsPage.tsx`:
  - `Sales Analytics` uses `<BarChart3 className="w-4 h-4" />` (line 112).
  - `Commission Analytics` also uses `<BarChart3 className="w-4 h-4" />` (line 148).
  - `POS Analytics` uses `<MapPin className="w-4 h-4" />` (line 160).
  - `Area Performance` also uses `<MapPin className="w-4 h-4" />` (line 173).
- **Why It Matters:**
  Using the identical icon for two different tabs within the same horizontal tab strip degrades visual differentiation. In particular, using `MapPin` (a geographical location icon) for Point-of-Sale (POS) counter retail analytics makes little semantic sense.
- **Recommended Direction:**
  Assign semantically distinct icons: `Store` or `Receipt` for POS Analytics, `Award` or `Trophy` for Commission Analytics, and retain `MapPin` for Area Performance.

---

### REP-011: Till Reconciliation Metric Mismatch Between POS and Analytics
- **Finding ID:** `REP-011`
- **Module & Route:** Reports (`PosAnalyticsTab.tsx`) vs POS (`POSSessionsPage.tsx`)
- **Page Type & Task:** Cashier Auditing / Data Presentation
- **Issue Category:** 3.2 Workflow and Page Structure / Metric Alignment
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/reports/PosAnalyticsTab.tsx` (lines 98–105)
  - `src/features/pos/POSSessionsPage.tsx`
- **Observed Behavior / Code Evidence:**
  In `PosAnalyticsTab.tsx`, the Cashier Till Reconciliation table displays columns:
  `Date | Cashier | Expected Cash | Expected Card | Status`.
  In `POSSessionsPage.tsx` (`/pos/sessions`), shift managers audit sessions with:
  `Opening Float | Total Cash Sales | Cash In / Out | Counted Cash | Variance / Difference | Discrepancy Note`.
- **Why It Matters:**
  The analytics tab presents a dumbed-down reconciliation view that omits the core metric required by retail controllers: actual physical counted cash and cash variance.
- **Recommended Direction:**
  Align the Cashier Till Reconciliation table with the operational session audit model in `POSSessionsPage.tsx`.

---

### REP-012: Disconnected Commission Metrics Across Three Distinct Sub-Systems
- **Finding ID:** `REP-012`
- **Module & Route:** Reports (`CommissionAnalyticsTab.tsx`), Sales (`/sales/commissions`), Finance (`/finance/commissions`)
- **Page Type & Task:** Commission Auditing / Sub-System Alignment
- **Issue Category:** 3.9 Approvals and Cross-Workflow Context / Sub-System Triplication
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/reports/CommissionAnalyticsTab.tsx`
  - `src/features/sales/commissions/CommissionManagementPage.tsx`
  - `src/features/finance/pages/FinanceCommissionsPage.tsx`
- **Observed Behavior / Code Evidence:**
  Sales representative commission calculations exist in three disconnected places:
  1. `/sales/commissions` calculates tier-based sales commission from active orders.
  2. `/finance/commissions` displays static mock accruals in `MOCK_COMMISSION_ACCRUALS`.
  3. `/reports` (Commission Analytics) calculates commission metrics via `advancedReportService`.
- **Why It Matters:**
  A sales rep or manager reviewing commissions sees different numbers and tier calculations across three separate routes.
- **Recommended Direction:**
  Consolidate commission calculations into a single canonical `CommissionService` source, and render the analytical view in `/reports` using this unified dataset.

---

### REP-013: Fragmented CSV Download Controls Without Bulk Export
- **Finding ID:** `REP-013`
- **Module & Route:** Reports (`/reports` across all tabs)
- **Page Type & Task:** Data Export / Export Usability
- **Issue Category:** 3.10 Reports / Export Architecture
- **Severity:** **P3 (Low)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/reports/ExecutiveOverviewTab.tsx`
  - `src/features/reports/SalesAnalyticsTab.tsx`
  - `src/features/reports/InventoryAnalyticsTab.tsx`
  - `src/features/reports/FinanceCollectionsTab.tsx`
  - `src/features/reports/CommissionAnalyticsTab.tsx`
  - `src/features/reports/PosAnalyticsTab.tsx`
  - `src/features/reports/AreaPerformanceTab.tsx`
- **Observed Behavior / Code Evidence:**
  There are over **12 separate, micro-scoped CSV export buttons** attached to individual card headers (e.g. "Export Top Products", "Export Top Reps", "Export Aging Buckets", "Export Damaged Stock").
  There is no bulk "Export Tab Data (CSV / Excel)" button in the global toolbar.
- **Why It Matters:**
  An analyst wanting the full monthly performance summary must click 6 to 8 separate download buttons on different cards.
- **Recommended Direction:**
  Add a global "Export Consolidated Dataset (Excel / Multi-CSV)" button in `ReportsFilterToolbar`.

---

## 3. Summary Assessment of Reports Module

| Tab / View | Analytical Scope | Data Source | Type Safety | Formatting Standard | Critical Disconnect |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Executive Overview** | Cross-channel KPIs & revenue split | `ReportService` (in-memory) | High | `formatCurrencyLKR` | Decoupled from GL P&L |
| **Sales Analytics** | Top reps, categories, products | `ReportService` (orders) | High | `formatCurrencyLKR` | B2B orders vs POS sales split |
| **Inventory Analytics**| Valuation, warehouse/showroom split | `ReportService` (stock) | High | `formatCurrencyLKR` | Valuation ≠ GL Account 1100 |
| **Finance & Collections**| A/R aging buckets, debtor lists | `ReportService` (invoices) | High | `formatCurrencyLKR` | Debt ≠ AR Queue ≠ Balance Sheet |
| **Commission Analytics**| Performance tiers & linked sales | `AdvancedReportService` | **Lost (`any`)** | **Raw `.toLocaleString()`** | Disconnected from Finance commissions |
| **POS Analytics** | Showroom daily sales & till audits | `AdvancedReportService` | **Lost (`any`)** | **Raw `.toLocaleString()`** | Discrepancy metrics ≠ POS sessions |
| **Area Performance** | Regional target vs achievement | `ReportService` (areas) | High | `formatCurrencyLKR` | Duplicate stacked territory pickers |
| **Purchasing Reports** | Vendor spend & PO fulfillment | **Omitted from `/reports`** | N/A | N/A | **Siloed in `/purchasing/reports`** |
| **Statutory Reports** | Audited P&L, BS, Trial Balance, VAT | **Omitted from `/reports`** | High | `formatCurrency` | **Siloed in `/finance/reports/*`** |
