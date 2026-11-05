# Canonical Page Composition & Interaction Patterns Specification

**Document ID:** `TRANSFORMATION-05-PAGE-PATTERNS`  
**System:** Antigravity Workshop & POS ERP System (Enterprise UI/UX Modernization)  
**Phase:** Phase 05 — Canonical Page Patterns & Composition Standards  
**Date:** November 2026  
**Status:** Approved & Verified (Canonical Page Composition Suite Standardized)  

---

## 1. Executive Summary & Page Taxonomy

Phase 05 establishes the canonical composition standards for all application screens across the Antigravity Workshop & POS ERP. Rather than allowing each route or view to assemble ad-hoc container divs, unaligned toolbars, divergent table wrappers, and custom drawer overlays, Phase 05 defines seven strict **Page Composition Archetypes**.

These archetypes directly consume:
1. **Design Tokens & Global Manager** (`src/design-system/`)
2. **Global Shared UI Primitives** (`src/components/ui/`)
3. **Application Layout Wrappers** (`src/components/layouts/`)

By encapsulating these archetypes into `src/components/patterns/`, any page in the system (including all 11 screenshot-referenced routes in Phase 06) achieves 100% visual and behavioral consistency with zero boilerplate repetition.

---

## 2. The Seven Canonical Page Composition Archetypes

```
+----------------------------------------------------------------------------------------------------+
|                                    PAGE COMPOSITION ARCHETYPES                                     |
+---------------------+---------------------+---------------------+----------------------------------+
| 5.1 List & Register | 5.2 Executive       | 5.3 Document Engine | 5.4 Inspection Drawer            |
| - PageHeader        | - DashboardLayout   | - DocumentLayout    | - 480px / 600px Slide-Over Sheet |
| - KPI Summary Strip | - HeroKpiCard       | - Stage Banner      | - Esc Key Dismissal              |
| - FilterToolbar     | - Chart Containers  | - 12-Field Matrix   | - Tabbed Navigation              |
| - DataTable Surface | - Histogram/Donut   | - 3 Repair Sections | - Status Audit Timeline          |
| - Pagination Footer | - Activity Feeds    | - Sticky Footer     | - Docked Footer Actions          |
+---------------------+---------------------+---------------------+----------------------------------+
| 5.5 Ledger & Cash   | 5.6 Counter POS     | 5.7 Workshop Board                                     |
| - FinanceLayout     | - POSLayout (65/35) | - BoardLayout (Full Canvas)                            |
| - Waterfall Ribbon  | - Scanner HID Pill  | - Fluid Horizontal Swimlanes                           |
| - Dense Numerals    | - Product Touch Grid| - Live Count Badges                                    |
| - Pinned Totals Row | - Persistent Cart   | - Mechanic Assignment Checklists                       |
| - Debit/Credit Tags | - Split Tender Modal| - Contextual Status Chips                              |
+---------------------+---------------------+--------------------------------------------------------+
```

---

### Archetype 5.1: List & Register Page Pattern (`ListPagePattern.tsx`)
**Primary Use Cases:** Workshop Job Register (`/workshop/jobs`), Catalog Master (`/catalog`), Expense Register (`/finance/expenses`).

* **Header:** Title, subtitle, slash-separated breadcrumb hierarchy trail, and primary action button (e.g. `+ Create Repair Sheet`).
* **KPI Summary Strip:** Optional 2-to-4 column metric summary cards giving immediate overview before diving into rows.
* **Surface Container:** Crisp white elevated card (`rounded-[16px]`, `border border-slate-200/80`, `shadow-xs`) with nested concentric controls.
* **Filter Toolbar:** Integrated search omnibox with instant clear button, status pill tabs with record count chips, category facets, and active filter dismissal pills.
* **Data Table Surface:** Alternating hover highlight rows (`52px` or `40px` compact), monospace tabular IDs and license plates, right-aligned monetary cells with currency symbol prefixes, and stage/status badges.
* **Empty & Loading States:** Contextual empty illustrations (`EmptyState`) or multi-row shimmer skeleton loaders (`LoadingSkeleton variant="table"`).
* **Pagination:** Pinned bottom bar displaying total record count, current index range, and square page buttons.
* **Floating Bulk Action Bar:** Obsidian charcoal pill bar (`bg-slate-900`) sliding in when multiple checkboxes are active.

---

### Archetype 5.2: Executive Dashboard Page Pattern (`DashboardPagePattern.tsx`)
**Primary Use Cases:** Executive Overview (`/` or `/dashboard`), Workshop Manager Telemetry.

* **Header:** Contextual title, subtitle, date/period dropdown (`Today`, `This Week`, `This Month`), and instant intake shortcuts.
* **Urgent Alert Banners:** Highlight critical operational blockers (e.g., parts delayed > 7 days, overdue insurance claims).
* **Metric Grid:** 4-column responsive grid combining `HeroKpiCardObsidian` (Obsidian `#0F172A` with white typography) and `PastelTintedKpiCard` (Emerald, Amber, Cobalt, Crimson).
* **Primary Visual Analytics:** Dual-series smoothed Bezier area chart (Gross Sales vs Gross Profit) and hero bar histograms with peak coral highlight bars.
* **Secondary Streams:** Split-pane cards showing recent garage intakes, technician repair velocity, and ranked fast-moving inventory items.

---

### Archetype 5.3: Document Creation Page Pattern (`DocumentPagePattern.tsx`)
**Primary Use Cases:** Repair Sheet Studio (`/workshop/sheet/:id`, `/workshop/sheet/new`, `/workshop/sheet/demo`).

* **Stage Progression Banner:** Visual control bar indicating document lifecycle (`QUOTATION` -> `ESTIMATE` -> `JOB_CARD` -> `INVOICE`) with one-click conversion trigger and frozen snapshot warnings.
* **12-Field Vehicle Header Matrix:** Official 7-row matrix containing:
  - Registration plate (`SmartPlateAutocompleteInput` with non-blocking past job lookup)
  - Date, time, promise completion days counter
  - Vehicle make, model, chassis / VIN, odometer reading
  - Customer contact details (Zero-CRM direct block)
  - Insurance company & assessor name
  - Nature of repair (Accident, Mechanical, Electrical, Paint)
* **3-Section Repair Scope Tables:**
  - Section 1: Remove & Reassemble (Labor)
  - Section 2: Repair (Labor & Sublet)
  - Section 3: Replacement (Parts with hybrid catalog or freeform typing)
  - Automatic row renumbering (`01`, `02`, `03`)
  - Inline cost and profit visibility strictly guarded by `RolePermissionGateWrapper`
* **Financial Summary Block:** Live subtotals, configurable discounts, tax calculations, and Sri Lankan Insurance split settlement calculator (`Customer Excess = Grand Total - Advance - Insurance Approved`).
* **Sticky Bottom Action Footer:** Docked elevated bar (`bg-white/95 backdrop-blur-md`) providing persistent totals, Save Draft, WhatsApp preview share, and A4 print triggers.

---

### Archetype 5.4: Record Inspection Drawer Pattern (`RecordDetailDrawerPattern.tsx`)
**Primary Use Cases:** Fast job sheet inspection, catalog item quick editor, historical repair review.

* **Ergonomics:** 480px (standard) or 640px (wide) right slide-over drawer over an acrylic backdrop blur (`backdrop-blur-sm`).
* **Keyboard Navigation:** Instant dismissal on `Escape` key press; autofocus trap prevention.
* **Header:** High-contrast title, plate tag, tonal status badge, and close button.
* **Tab Switcher:** Horizontal underline tabs for cycling between `Details`, `Financials`, and `Audit Log`.
* **Audit Trail Timeline:** Chronological timeline showing actor name, timestamp, and state transition badges (`ESTIMATE -> JOB_CARD`).
* **Docked Footer:** Primary actions (e.g. `Print Job Card`, `Edit Full Sheet`, `Void Document`).

---

### Archetype 5.5: Financial Ledger Page Pattern (`LedgerPagePattern.tsx`)
**Primary Use Cases:** Profit Ledger (`/finance/profit-ledger`), Daily Cash Reconciliation.

* **Waterfall Ribbon:** Visual cashflow summary bridging `Gross Sales` -> `Discounts` -> `Direct Costs` -> `Expenses` -> `Net Profit`.
* **Dense Tabular Structure:** High-density 40px rows with strictly right-aligned `font-mono tabular-nums` amounts.
* **Debit/Credit Visual Indicators:** Emerald text with `+` glyph for positive cash/profit; crimson text with `-` glyph for costs/payouts.
* **Pinned Totals Row:** Sticky bottom row calculating exact column totals to the rupee.

---

### Archetype 5.6: Counter POS Page Pattern (`POSPagePattern.tsx`)
**Primary Use Cases:** High-speed Counter POS Terminal (`/pos`).

* **Header Utility Bar:** Hardware barcode scanner status (`🟢 Scanner Ready`), active register shift timer, walk-in customer selector, and held carts drawer button.
* **Split Workspace Layout:**
  - **Left Pane (60–65%):** Instant search, category ribbon (Lubricants, Filters, Batteries, Electrical), and touch-friendly product tiles with low-stock badges.
  - **Right Pane (35–40%):** Persistent checkout cart, quantity steppers, on-the-fly custom item adder, discount slider, tender payment action buttons (`Quick Cash & Print`, `Tender Payment`).
* **Mobile & Tablet Drawer:** Bottom floating cart pill with live count bubble morphing into a full-height touch checkout sheet.

---

### Archetype 5.7: Workshop Board Page Pattern (`BoardPagePattern.tsx`)
**Primary Use Cases:** Workshop Floor Board (`/workshop/board`).

* **Horizontal Canvas:** Full-viewport fluid horizontal scrolling layout with styled micro-scrollbars.
* **Swimlane Columns:** Standardized operational lanes (`Draft & Intake`, `Pending Insurance`, `Approved in Progress`, `Waiting for Parts`, `Quality Check`, `Ready for Delivery`, `Completed / Delivered`).
* **Lane Counter Badges:** High-contrast pill badges showing live vehicle count per bay/stage.
* **Interactive Job Cards:** Vehicle plate tag, model, assigned mechanic avatar, aging days pill, and task completion checklists.

---

## 3. Interaction & Usability Standards

| Interaction | Standard Specification | Implementation Guard |
| :--- | :--- | :--- |
| **Search Debounce** | local state updates immediately; upstream queries debounced at 250ms | Prevent jank during rapid typing |
| **Keyboard Row Append** | Pressing `Enter` on the last table cell automatically inserts a new row | Instant continuous invoice entry |
| **Dialog / Drawer Dismiss** | Pressing `Escape` closes any open modal, drawer, or dropdown menu | Consistent dismiss behavior |
| **Tabbed Switchers** | Left/Right arrow keys navigate tabs with roving tabindex | Full keyboard accessibility |
| **Tabular Numbers** | All currency, quantities, plates, and phone numbers enforce `font-mono tabular-nums` | Pixel-perfect vertical alignment |
| **Cost Privacy Guard** | Buying costs and profit margins are completely stripped for non-admin roles and all print DOMs | Strict privacy invariant enforcement |

---

## 4. Verification & Quality Gates

| Verification Gate | Result | Notes |
| :--- | :--- | :--- |
| **Unit Test Suite (`tests/phase05-page-patterns.test.tsx`)** | **12 / 12 Passing** | Covers all 7 patterns, props, events, and a11y roles |
| **Total Test Suite Regression** | **28 / 28 Suites Passing (508 tests)** | 100% passing across the entire repository |
| **TypeScript Strict Compilation (`tsc --noEmit`)** | **0 Errors** | Strict type safety across all pattern interfaces |
| **Production Vite Build (`npm run build`)** | **Success (~720ms)** | Production bundle generated cleanly |

---

## 5. Next Steps — Transition to Phase 06

With the 7 canonical page composition patterns established and tested:
- **Phase 06** will transform each of the 11 screenshot-referenced pages by consuming these standardized patterns:
  - **Screen 01:** Workshop Jobs (`WorkshopJobsPage.tsx`) consuming `ListPagePattern`
  - **Screen 02:** Floor Status Board (`WorkshopBoardPage.tsx`) consuming `BoardPagePattern`
  - **Screen 03:** Repair Sheet (`RepairSheetPage.tsx`) consuming `DocumentPagePattern`
  - **Screen 04:** Catalog Master (`CatalogListPage.tsx`) consuming `ListPagePattern`
  - **Screen 05:** Profit Ledger (`ProfitLedgerPage.tsx`) consuming `LedgerPagePattern`
  - **Screen 06:** Interactive Test Bench (`InteractiveBenchPage.tsx`) consuming `DocumentPagePattern`
  - **Screen 07:** Executive Dashboard (`RoleDashboardPage.tsx`) consuming `DashboardPagePattern`
  - **Screen 08:** Counter POS (`PosTerminalPage.tsx`) consuming `POSPagePattern`
  - **Screen 09:** Shop Expenses (`ExpensesPage.tsx`) consuming `ListPagePattern`
  - **Screen 10:** Reports & Analytics (`ReportsPage.tsx`) consuming `DashboardPagePattern`
  - **Screen 11:** Shift & Drawer (`PosShiftManagementPage.tsx`) consuming `LedgerPagePattern`
