# Component Inconsistency Matrix & Canonical Standardization

**Document ID:** `TRANSFORMATION-02-COMPONENT-INCONSISTENCY-MATRIX`  
**System:** Antigravity Workshop & POS ERP System (Enterprise UI/UX Modernization)  
**Phase:** Phase 01 — Complete System Discovery & Visual Baseline  
**Date:** November 2026  
**Status:** Component Architecture Review Finalized  

---

## 1. Executive Summary

This inconsistency matrix provides a rigorous pairwise and cross-functional comparison of equivalent user interface patterns across all operational areas of the system.

Even within an internally cohesive ERP, individual pages developed across different sprints frequently evolve ad-hoc button variations, differing card paddings, desynchronized status pill colors, redundant header actions, and fragmented filter toolbars.

This document identifies **12 Primary Component Inconsistency Categories**, provides direct code-level comparisons of competing implementations, analyzes the operational impact, and establishes the **Canonical Standard Component Candidate** to be consolidated in Phase 03.

---

## 2. Master Component Inconsistency Matrix

| Matrix ID | Component Pattern Domain | Competing Implementation A | Competing Implementation B | Affected Routes | Operational Impact & Usability Defect | Canonical Target Candidate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CIM-01** | **Page Headers & Titles** | `RoleDashboardPage` & `ReportsPage`: Custom `h1` with hardcoded tracking and separate right-hand utility cluster. | `ExpensesPage` & `WorkshopJobsPage`: Custom banner container with local subtitle paragraph and duplicated CTA buttons. | `/`, `/reports`, `/workshop/jobs`, `/finance/expenses`, `/catalog` | Header heights vary between 56px and 96px; breadcrumbs duplicated between global header and page body. | Canonical `PageHeader`: Standardized title, breadcrumb, subtitle, contextual status, and aligned primary/secondary action slot. |
| **CIM-02** | **KPI & Metric Summary Cards** | `ProfitLedgerPage` & `RoleDashboardPage`: `HeroKpiCardObsidian` with dark `#0F172A` background, white display numbers, and status dot. | `CatalogListPage` & `ExpensesPage`: Standard white card with local borders, small label, and colored text. | `/`, `/finance/profit-ledger`, `/catalog`, `/finance/expenses`, `/pos/shift` | Inconsistent card paddings (`p-4` vs `p-5` vs `p-6`), divergent font sizes for monetary figures, lack of visual hierarchy. | Canonical `KpiCard` Suite: `HeroKpiCard` (dark obsidian for primary KPI), `MetricCard` (white surface with status indicator), and `SummaryCard` (aligned label/value). |
| **CIM-03** | **Data Tables & Data Grids** | `WorkshopJobsPage` & `CatalogListPage`: High-density tabular layout with compact row heights (~48px) and monospace numbers. | `ExpensesPage` & `ReportsPage`: Standard HTML `<table>` with looser row padding, inconsistent cell alignments, and variable borders. | `/workshop/jobs`, `/catalog`, `/finance/expenses`, `/reports`, `/finance/profit-ledger` | Right-alignment of financial columns is inconsistent; row hover states vary; pagination controls differ between views. | Canonical `DataTable`: Standardized row height (48px compact / 52px default), mandatory right-aligned `tabular-nums` for currency, unified hover/selected states. |
| **CIM-04** | **Status Badges & Pills** | `WorkshopJobsPage`: Discrete stage pills (`QUOTATION`, `ESTIMATE`, `JOB_CARD`, `INVOICE`) with custom pastel fills. | `PosShiftManagementPage` & `ExpensesPage`: Ad-hoc inline Tailwind badges with varying border radii and solid fills. | All routes across Workshop, POS, and Finance | Badge heights diverge (20px to 28px); radii vary (`rounded-md` vs `rounded-full`); semantic colors for `Pending` and `Draft` conflict. | Canonical `StatusBadge`: Unified semantic pill primitive (`rounded-full`, 22px height, 10% translucent pastel fill, 20% border, uppercase bold text). |
| **CIM-05** | **Form Inputs & Field Controls** | `RepairSheetPage`: 12-field vehicle matrix using standard inputs with focus ring `ring-orange-500/10` and uppercase labels. | `DailyShopExpenseEntryForm`: Ad-hoc form with raw inputs, differing placeholder colors, and custom border classes. | `/workshop/sheet/:id`, `/finance/expenses`, `/pos`, `/catalog` | Inconsistent input heights (36px vs 40px vs 44px); validation error messages appear in differing locations and colors. | Canonical `FormField` & `InputLuxury`: Standard 40px height, consistent label typography, required asterisk indicator, uniform focus ring, and inline error text. |
| **CIM-06** | **Search & Combobox Selectors** | `VehicleLookupInput`: Debounced license plate input with floating history popover and auto-fill button. | `CatalogCombobox`: Virtualized dropdown with stock indicators, keyboard navigation, and instant price extraction. | `/workshop/sheet/:id`, `/catalog`, `/pos` | Different keyboard navigation shortcuts (`Enter` vs `Tab` vs Arrow keys); search dropdowns have inconsistent elevation and widths. | Canonical `SearchableCombobox`: Universal combobox primitive with keyboard navigation, clear action, stock indicators, and loading skeletons. |
| **CIM-07** | **Modal Dialogs & Drawers** | `PosPaymentModal` & `CatalogItemDialog`: Fixed-size centered modal with acrylic backdrop blur (`backdrop-blur-md`). | `PaymentCollectionModal`: Centered modal with differing corner radius (`rounded-lg` vs `rounded-[22px]`) and button placement. | `/pos`, `/catalog`, `/workshop/sheet/:id`, `/finance/expenses` | Close buttons (`X`) positioned differently; header and footer paddings vary; mobile full-screen handling is uncoordinated. | Canonical `Dialog` & `Drawer` System: `rounded-[22px]` modal with consistent header/footer spacing, acrylic blur backdrop, and standardized `SideDrawer` for record inspection. |
| **CIM-08** | **Category & Stage Filter Bars** | `CatalogListPage`: Category filter pills (`All 21`, `Spare Parts 7`, `Lubricants 5`) with active coral fill. | `WorkshopJobsPage`: Segmented stage filter tabs with differing underline and count badge styling. | `/catalog`, `/workshop/jobs`, `/finance/profit-ledger`, `/reports` | Inconsistent count badge placement; active indicator styling conflicts between solid pill fill and bottom underline bar. | Canonical `FilterToolbar` & `SegmentedPills`: Standardized filter toolbar supporting search input, category pills with count badges, and date pickers. |
| **CIM-09** | **Primary & Secondary Action Triggers** | `Header.tsx`: Terracotta `#F95700` primary buttons with `rounded-full` and height `38px`. | `RepairSheetPage` & `ExpensesPage`: Primary buttons with `rounded-md` or `rounded-[10px]` and height `40px` or `44px`. | Application-wide across all views | Primary action buttons lack standardized heights, corner radii, and tactile active compression across pages. | Canonical `Button` Hierarchy: Primary (`#F95700`, 10px radius, active scale 0.98), Secondary Hairline, Obsidian Executive, Destructive Soft, Ghost. |
| **CIM-10** | **Monetary & Currency Display** | `formatRs(amt)` from `currency.ts` outputs `Rs. #,##0.00` with `font-mono tabular-nums`. | Local string concatenations (`"Rs. " + val`) without enforced tabular numerals or decimal zero-padding. | `/reports`, `/pos`, `/finance/profit-ledger`, `/workshop/sheet` | Currency symbols drift between `Rs.` and `Rs. `; decimals misalign vertically in data tables; comma thousand-separators omitted in raw inputs. | Canonical `AmountDisplay` & `formatRs`: Mandatory tabular numeral enforcement (`font-mono tabular-nums`) with standardized thousand-separators. |
| **CIM-11** | **Print Layouts & Document Engines** | `A4WorkshopPrint.tsx`: Formal 210×297mm portrait document engine with 100% cost/margin redaction and Job Card price stripping. | `ThermalReceiptPrint.tsx`: High-contrast 80mm continuous monospace thermal slip with tender and change breakdown. | `/workshop/sheet/demo`, `/workshop/invoice/:id`, `/pos` | Print triggers have inconsistent confirmation dialogs; preview layouts lack a unified modal frame before triggering browser print. | Canonical Print Abstractions: `PrintDocumentPreviewDialog` with explicit format switcher (A4 Portrait vs 80mm Thermal) and verified privacy redaction. |
| **CIM-12** | **Charts & Analytical Visualizations** | `DateRangeSalesProfitTab`: Smoothed bezier area chart with custom orange/green gradients and floating dark tooltips. | `RoleDashboardPage`: Vertical bar chart with single-color peak highlight and circular donut gauge. | `/`, `/reports` | Chart legends and axes use inconsistent font sizes (11px vs 12px vs 13px); tooltip designs vary between dark obsidian and white card. | Canonical `ChartCard` Suite: Reusable chart containers with standardized titles, period selectors, interactive legends, and high-contrast dark tooltips. |

---

## 3. Deep-Dive Pattern Comparisons

### 3.1 Page Headers: Workshop vs. Finance vs. POS
- **Workshop Jobs (`WorkshopJobsPage.tsx`):**
  - Renders title with `text-xl font-bold` + descriptive subtitle.
  - Houses `[Reset Seeds]` and `[+ New Repair Sheet]` on the right.
  - Directly above the table, renders a second toolbar with stage tabs and a search input.
- **Shop Expenses (`ExpensesPage.tsx`):**
  - Renders title with `text-xl font-bold` + subtitle.
  - Houses `[Refresh]`, `[Profit Ledger]`, and `[+ Record Expense Voucher]` on the right.
  - Directly below, renders four KPI cards followed by an inline entry form and then the voucher table.
- **Counter POS (`PosTerminalPage.tsx`):**
  - No traditional page title; uses the global top header breadcrumbs to establish context.
  - Immediately presents the barcode scanner bar and catalog grid.
- **Canonical Synthesis:**
  The `PageHeader` component must provide a structured hierarchy:
  1. Breadcrumb trail (`Finance / Expenses` or `Workshop / Jobs`).
  2. Large title (`text-2xl font-bold tracking-tight text-slate-900`).
  3. Optional concise one-sentence description (`text-sm text-slate-500`).
  4. Contextual status badge (if inspecting a single record).
  5. Primary CTA slot (anchored top right on desktop).
  6. Optional secondary action buttons (Export, Print, Refresh).

---

### 3.2 Tables & Ledgers: Repair Section vs. Profit Ledger vs. Catalog List
- **Workshop 3-Section Table (`WorkshopTable.tsx`):**
  - Section headers use dark slate `#0F172A` with inline subtotal badge.
  - Line items support inline cell editing and keyboard append via `Enter`.
  - Admin mode conditionally injects Buying Cost and Margin columns with soft emerald background `#F0FDF4`.
- **Profit Ledger Table (`UnifiedProfitLedgerTable.tsx`):**
  - High-density accounting register.
  - 8 columns with tabular currency values.
  - Row hover uses subtle slate `#F8FAFC`.
- **Catalog List Table (`CatalogListPage.tsx`):**
  - 10 columns including SKU badges, stock quantity pills, active toggles, and action icons.
- **Canonical Synthesis:**
  All data tables must share the `DataTable` primitive:
  - Header row: Warm sand `#FFF7ED` or neutral cool slate `#F8FAFC` with 11px uppercase tracking labels.
  - Standard row height: 48px (dense) or 52px (standard).
  - Column alignment rules: Text left-aligned, status badges centered/left, numerical amounts right-aligned with `tabular-nums`.
  - Action column: Anchored right with fixed width and consistent `•••` popover menu.

---

### 3.3 Status Badges & Lifecycle Indicators
- **Current Divergence:**
  - `QUOTATION`: Blue in some places (`#EFF6FF`), Slate in others.
  - `ESTIMATE`: Indigo (`#EEF2FF`) with purple border.
  - `JOB_CARD`: Amber (`#FFFBEB`) with yellow border.
  - `INVOICE`: Emerald (`#ECFDF5`) with green border.
  - `PAID`: Solid green badge in POS vs pastel emerald in Workshop.
  - `UNPAID` / `OVERDUE`: Crimson in Workshop vs Amber in Finance.
- **Canonical Synthesis:**
  A single `StatusBadge` component with strict semantic mappings:
  - **Emerald:** `Completed`, `Paid`, `Optimal Margin (> 35%)`, `Approved`.
  - **Amber:** `Waiting Parts`, `Pending Insurance`, `Warning Margin (20–35%)`, `Partially Paid`.
  - **Cobalt:** `In Progress`, `Active Bay`, `Quotation`, `Submitted`.
  - **Crimson:** `Cancelled`, `Overdue`, `Deficit / Loss (< 0%)`, `Rejected`.
  - **Neutral Slate:** `Draft`, `Unassigned`, `Closed Shift`.

---

## 4. Component Consolidation Plan for Phase 03

The following components are marked for consolidation and canonical standardization during Phase 03:

1. **Button Suite:** Replace ad-hoc button classes with unified `Button` variants (`luxury-primary`, `obsidian-executive`, `secondary-hairline`, `destructive-soft`, `ghost`).
2. **PageHeader:** Replace local page title divs with universal `PageHeader`.
3. **DataTable:** Unify table wrappers, headers, rows, and pagination across Workshop, Finance, Catalog, and POS.
4. **StatusBadge:** Eliminate local badge styling; enforce semantic color and typography contracts.
5. **KpiCard Suite:** Standardize KPI card layouts with consistent padding, display figures, and trend indicators.
6. **FilterToolbar:** Merge local search bars and filter pills into a unified toolbar primitive.
7. **Dialog & Drawer:** Standardize modal geometry (`rounded-[22px]`), backdrop blur, and responsive mobile drawers.

---

## 5. Verification & Architectural Sign-off

- **Inconsistency Categories Documented:** 12 primary domains.
- **Pairwise Comparisons Completed:** 100% of conflicting patterns identified.
- **Canonical Standards Defined:** Every conflicting component has an assigned target architecture.
- **Business Process Safety:** Zero business logic or calculation alterations required for component standardization.
