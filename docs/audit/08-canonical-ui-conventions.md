# Canonical UI/UX Design & Architecture Conventions

**Document ID:** `AUDIT-08-CONVENTIONS`  
**Application:** DNS Import & Export ERP (Client Frontend)  
**Status:** Canonical Standard Proposal (Derived from Existing Codebase Patterns)  
**Date:** October 2026  

---

## 1. Purpose & Philosophy

This document defines the **Canonical UI/UX Conventions** for the DNS Import & Export ERP platform.

Rather than inventing a speculative design system from scratch, these conventions are established by **codifying the highest-quality existing patterns already present in the repository** (e.g. `OrderCreatePage`, `OrderDetailPage`, `DoubleEntryHoverBadge`, `ThermalReceiptModal`), standardizing them across all 6 business modules, and eliminating conflicting ad-hoc implementations.

---

## 2. Layout, Shell & Viewport Conventions

### 2.1 Viewport Container & Shell Architecture
- **Canonical Layout:** `StandardLayout.tsx` is the sole authorized shell wrapper for all authenticated application routes.
- **Decommission:** Eliminate `FinanceLayout.tsx`. Finance routes must run within `StandardLayout.tsx`.
- **Vertical Padding Standard:**
  ```tsx
  // Canonical wrapper padding across desktop and mobile
  className="flex-1 w-full p-4 sm:p-6 lg:p-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8"
  ```
- **Scrollbar Behavior:**
  - **Rule:** Never hide or suppress browser scrollbars. Native browser scrollbar indicators (`scrollbar-thin` or standard OS styling) must remain visible on scrollable tables and pages.
  - **Prohibited:** `[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`.

### 2.2 Content Width & Grids
- **Full-Width Grids:** List pages, data tables, analytical dashboards, and multi-step transaction sheets must span `100%` width with responsive padding (`px-4 sm:px-6 lg:px-8`).
- **Centered Narrow Cards:** Reserved strictly for Authentication (`LoginPage`), Single-action Confirmation screens, or Password Reset dialogs. Form pages must never abruptly shift to centered narrow cards.

---

## 3. Page Headers, Breadcrumbs & Action Placement

### 3.1 Header Anatomy & Hierarchy
Every page must implement a single unified header structure:

```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      {backUrl && (
        <Link to={backUrl} className="text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{pageTitle}</h1>
      <StatusBadge status={status} />
    </div>
    {subtitle && <p className="text-xs sm:text-sm text-slate-500">{subtitle}</p>}
  </div>

  <div className="flex items-center gap-2">
    {secondaryActions}
    {primaryAction}
  </div>
</div>
```

### 3.2 Header Rules
1. **Single Source of Header Truth:** Remove conflicting static lookups (`ROUTE_TITLES` in `Header.tsx`). Page titles must be rendered consistently by page views or emitted via route context.
2. **No Redundant Paragraphs:** Explanatory text must be concise (max 1 sentence) and task-oriented.
3. **No Developer Milestone Tags:** Strip internal badges like `"Phase 1 Executive Master"` or `"Feature Flag Beta"` from customer-facing headers.
4. **Primary Action Positioning:** The primary action button (e.g. `Create Order`, `Post Journal`, `Save Draft`) must always be anchored in the top-right header area on desktop, with optional sticky bottom action bar on mobile.

---

## 4. Shared Selectors & Entity Pickers

### 4.1 Prohibited Pattern: Native In-Cell `<select>`
- Native HTML `<select>` tags are **strictly prohibited** for entity selection (Products, Customers, Suppliers, Warehouses, Accounts).
- Native `<select>` lacks fuzzy search, cannot display auxiliary metrics (stock balance, credit terms, part numbers), and freezes with large datasets.

### 4.2 Canonical Selectors Specification

| Entity | Canonical Component | Interaction Pattern | Auxiliary Data Displayed |
| :--- | :--- | :--- | :--- |
| **Product / SKU** | `ProductSelectorModal` / `ProductCombobox` | Searchable modal dialog or virtualized combobox | SKU, Category, Current Warehouse Stock, Showroom Stock, Unit Cost, Selling Price Floor |
| **Customer** | `CustomerSelector` | Searchable combobox with debounce | Customer Code, Name, Phone, Credit Status Pill, Available Credit, Credit Days |
| **Supplier** | `SupplierSelector` | Searchable combobox with debounce | Supplier Code, Name, Contact Person, Payment Terms, Active Currency |
| **Bank Account** | `BankAccountSelect` | Grouped combobox (Cash, Bank Float, Deposit) | Account Code, Bank Name, Currency, Cleared Book Balance |
| **GL Account** | `CoaTreeSelect` | Hierarchical tree select | Account Code, Account Name, Classification (Asset, Liability, Equity, Revenue, Expense) |

### 4.3 Eradication of Dangerous Auto-Selection
- **Rule:** Form selectors must **never** automatically pre-select the first element of an array (`suppliers[0].id` or `customers[0].id`) via mount `useEffect`.
- **Mandate:** All selectors must initialize empty (`""`) and require explicit user selection with mandatory field validation.

---

## 5. Forms, Inputs & Numerical Standards

### 5.1 Currency & Numerical Figures Standard
- **Primary Monetary Formatter:** Standardize exclusively on `formatCurrency(val)` from `src/utils/formatters.ts`.
  - **Output Format:** `Rs. #,##0.00`
  - **Typography:** Enforce `tabular-nums font-mono` on all monetary amounts.
  - **Prohibited:** Eliminate `formatCurrencyLKR()` (`LKR 1,234.56`) and raw unformatted `.toLocaleString()`.
- **Currency Input Component:** Use `CurrencyInput.tsx` backed by `decimal.js` for all monetary entries:
  - Supports configurable currency prefixes (`Rs.`, `$`, `€`, `¥`).
  - Right-aligned text with 2-decimal enforcement.

### 5.2 Multi-Currency & Foreign Exchange (FX) Governance
For all transactions involving foreign suppliers or overseas customers:
1. **Mandatory FX Triple:** When a foreign currency is selected, the form must capture:
   - Currency Code (e.g. `USD`, `EUR`, `CNY`).
   - Exchange Rate to LKR (e.g. `305.50 LKR/USD`).
   - Rate Effective Date / Customs Tariff Reference.
2. **Base Currency Equivalence:** Always display computed Base Currency equivalents (`Equivalent: Rs. 1,527,500.00`) directly beneath foreign amount inputs.
3. **Approval Thresholds in Base Currency:** Approval thresholds (e.g. Director delegation limit of Rs. 500,000) must evaluate the **base LKR equivalent**, never nominal foreign amounts (`PUR-011`, `FIN-002`).

---

## 6. Line-Item Grids & Transaction Tables

### 6.1 Canonical Document Line-Items Table
All transactional creation forms (Purchase Orders, Sales Orders, Quotations, Landed Cost Sheets, Credit Notes) must follow a uniform table anatomy:

```tsx
<div className="overflow-x-auto border border-slate-200 rounded-lg">
  <table className="w-full text-left text-sm">
    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
      <tr>
        <th className="py-3 px-3 w-12 text-center">#</th>
        <th className="py-3 px-4 min-w-[240px]">Product / Specification</th>
        <th className="py-3 px-3 w-28 text-right">Unit Price</th>
        <th className="py-3 px-3 w-24 text-right">Quantity</th>
        <th className="py-3 px-3 w-24 text-right">Disc %</th>
        <th className="py-3 px-3 w-24 text-right">Tax %</th>
        <th className="py-3 px-4 w-36 text-right">Line Total</th>
        <th className="py-3 px-2 w-12 text-center" />
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {/* Table Rows */}
    </tbody>
  </table>
</div>
```

### 6.2 Table Guidelines
- **Numeric Alignment:** Numbers, prices, discounts, and totals must always be right-aligned (`text-right font-mono tabular-nums`).
- **Product Descriptions:** Left-aligned with SKU rendered as a muted monospace tag below the product title.
- **Sticky Summary Block:** The document summary (Subtotal, Total Discount, Tax Breakdown, Grand Total) must remain pinned in the bottom right corner with clear visual separation.

---

## 7. Status Badges & Lifecycle Semantics

### 7.1 Unified Semantic Color Mapping
All document lifecycle statuses across Purchasing, Sales, Inventory, Finance, and Approvals must conform to the unified semantic matrix:

| Status State | Semantic Variant | Tailwind Classes | Lifecycle Examples |
| :--- | :--- | :--- | :--- |
| **Draft / Inactive** | `outline` / `neutral` | `bg-slate-100 text-slate-700 border-slate-300` | `DRAFT`, `INACTIVE`, `UNPOSTED` |
| **Pending / Review** | `warning` | `bg-amber-50 text-amber-800 border-amber-200` | `PENDING_APPROVAL`, `SUBMITTED`, `SPECIAL_APPROVAL` |
| **In Progress / Open** | `info` | `bg-primary-light text-primary-text border-primary-border` | `ISSUED`, `PARTIALLY_DELIVERED`, `CONFIRMED` |
| **Approved / Success** | `success` | `bg-emerald-50 text-emerald-800 border-emerald-200` | `APPROVED`, `POSTED`, `CLEARED`, `DELIVERED`, `PAID` |
| **Rejected / Critical** | `destructive` | `bg-rose-50 text-rose-800 border-rose-200` | `REJECTED`, `VOIDED`, `CANCELLED`, `BOUNCED` |

### 7.2 Prohibitions
- Never use brand navy (`bg-primary`) for neutral status badges.
- Never use warning yellow/amber for completed or approved statuses.
- Eliminate discrete competing badge files (`InvoiceStatusBadge.tsx`, `OrderStatusBadge.tsx`); standardize on `StatusBadge.tsx`.

---

## 8. Approvals & Commercial Governance

### 8.1 Universal Approval Modal
- Standardize on `ApprovalActionDialog.tsx` across both the central approval queue (`/approvals`) and transaction detail screens (`OrderDetailPage`, `PurchaseOrderDetailPage`).
- **Button Styling Rules:**
  - `Confirm APPROVE`: `bg-emerald-600 hover:bg-emerald-700 text-white`.
  - `Confirm REJECT`: `bg-rose-600 hover:bg-rose-700 text-white`.
  - `Confirm ESCALATE`: `bg-primary hover:bg-primary-hover text-white`.

### 8.2 Universal Audit Timeline
- Use `ApprovalTimeline.tsx` across all transaction views.
- **Accessibility Fix:** Fix icon contrast on step badges. Step badges with `bg-primary-light` must use `text-primary` (Navy), or switch to solid `bg-primary` with `text-white` (`APR-010`).

### 8.3 Contextual Exception Banners
When an approver views a transaction pending approval, the page must render a prominent **Exception Notice Card** showing:
1. Name & role of initiator.
2. Specific policy breached (e.g. *"Discount 18% exceeds permitted ceiling 15%"* or *"Order total exceeds available credit limit by Rs. 240,000"*).
3. Previous approval comments and escalation path.

---

## 9. Reports & Analytical Dashboards

### 9.1 Filter Toolbar Standardization
- Merge `ReportsFilterToolbar.tsx` and `ReportDateFilterBar.tsx` into a single `UnifiedDateFilterToolbar`.
- **Mandatory Presets:** `Today`, `This Month`, `This Quarter`, `This Year`, `Custom Date Range`.
- **Role Scoping:** Persist role-aware portfolio indicators (`Sales Rep Portfolio: Kasun` or `Territory: Central Province`).

### 9.2 Lazy Data Fetching
- Analytical tabs must fetch data lazily upon tab activation.
- Prohibit firing 20 simultaneous background queries on page mount (`REP-003`).

### 9.3 Printable Report Standard
- All printable reports must integrate `CorporateReportHeader.tsx` (dynamic company name, VAT/SVAT registration, tax period) and hide interactive tabs, buttons, and filters under `@media print`.

---

## 10. Copywriting, Terminology & Production Polish

1. **Eliminate Technical Schema Leakage:** Replace database table names (`journal_entries (INSERT)`, `chart_of_accounts (UPDATE)`) with clear business auditing terms (`Voucher Created`, `General Ledger Updated`).
2. **Dynamic Tax Labels:** Replace hardcoded `"18% VAT Summary"` tab labels with dynamic references (`${taxRate}% VAT Summary`).
3. **No Simulated Signatures:** Remove fake cursive script signatures from financial statements. Replace with official cryptographic sign-off blocks or formal blank approval lines.
4. **Active Business Verbs:** Action buttons must use active, specific verbs (`Post Vendor Bill`, `Disburse Advance`, `Authorize Return`), avoiding vague words like `Submit` or `OK`.
