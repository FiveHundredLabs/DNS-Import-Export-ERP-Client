# DNS ERP — Cross-Module Visual Consistency & Standardization

## Overview
This document tracks the system-wide UI/UX consistency remediation across DNS Import & Export ERP, establishing a single unified design system across buttons, metric/summary cards, tables, search/filter bars, status badges, and page headers.

---

## 1. Design System Canonical Specifications

| Component Category | Canonical Design Standard | Implementation / Tokens |
| :--- | :--- | :--- |
| **Page Header** | `<PageHeader>` | Breadcrumbs (`text-xs text-slate-500`), Title (`text-2xl font-bold text-slate-900`), Subtitle (`text-xs sm:text-sm text-slate-500`), Module pill/badge (`variant="outline"`), Action toolbar (`gap-2`, `h-9` buttons). |
| **Metric / Summary Card** | `<StatCard>` / `<SummaryCard>` | Container (`rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all`), Title (`text-xs font-semibold uppercase tracking-wider text-slate-500`), Big KPI (`text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1.5`), Subtitle (`text-[11px] text-slate-500 mt-1`), Icon squircle (`h-8 w-8 rounded-lg flex items-center justify-center shrink-0` with subtle semantic tint). |
| **Search & Filter Bar** | Standardized Filter Container | Container (`flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs mb-4`), Search Input (`h-9 pl-9 pr-3 text-xs font-normal`), Selects (`h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700`), Status tabs (`p-1 bg-slate-100 rounded-lg text-xs` with `px-3 py-1.5 rounded-md font-medium`). |
| **Data Table** | Standardized Enterprise Registry | Container (`rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs`), Header (`bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] py-3 px-4`), Row cell (`py-3 px-4 text-xs text-slate-700`), Row hover (`hover:bg-slate-50/70 transition-colors`), Currency (`text-right font-mono tabular-nums font-bold text-slate-900`), Row Action buttons (`h-7 px-2.5 text-[11px] font-medium rounded-md border border-slate-200 hover:bg-slate-50`). |
| **Buttons & CTAs** | `<Button>` | Primary CTA: `bg-primary hover:bg-primary-hover text-white rounded-lg shadow-xs h-9 px-3.5 text-xs font-semibold`. Secondary: `variant="outline" h-9 px-3 text-xs font-medium`. Success: `variant="success"`. Row actions: `size="xs"` / `size="icon-sm"`. |
| **Status Badges** | `<StatusBadge>` | Explicit mapping for all lifecycle states across all domains: Draft, Pending Approval, Approved, Delivered, Settled, Paid, Cleared, In Stock, Rejected, Voided, Overdue. |

---

## 2. Module Migration & Remediation Audit Tracker

| Screen / Route | Module | Identified Inconsistency | Canonical Component Adopted | Status | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/invoices` | Invoices | Ad-hoc card padding, green/orange buttons of different sizes, non-standard search bar. | `PageHeader`, `StatCard`, unified filter bar, standardized table actions (`size="icon-sm"`, `size="xs"`), outline `Record Payment`. | COMPLETED | VERIFIED |
| `/orders` | Sales Orders | Stat cards missing icon squircles and uppercase headers; table missing Actions column. | `PageHeader`, `StatCard`, unified filter bar & tabs, canonical `Actions` column with `Details` button. | COMPLETED | VERIFIED |
| `/orders/new` & `/orders/:id/edit` | Sales Orders | Credit limit cards had mismatched background tints (`bg-emerald-50`, `bg-slate-50`). | Adopted canonical `StatCard` for credit limit, available credit, credit days, and projected total. | COMPLETED | VERIFIED |
| `/finance/ar/credit-notes` | Finance AR | Loud card gradients (`bg-red-50`, `bg-green-50`), non-standard amber border header buttons. | `PageHeader`, enterprise `StatCard`, standardized registry table, clean outline action buttons. | COMPLETED | VERIFIED |
| `/inventory/delivery-notes` | Inventory | Loud colored borders & gradient cards, non-standard header layout. | `PageHeader`, `StatCard`, standardized filter bar & row actions. | COMPLETED | VERIFIED |
| `/inventory` | Inventory Hub | Custom header with heavy badges, 6 rainbow gradient cards, non-standard table tabs. | `PageHeader`, unified `StatCard` (6 cards), clean tab navigation, standardized table. | COMPLETED | VERIFIED |
| `/finance/ar/approvals` | Finance AR | Amber-bordered outline buttons and ad-hoc status filter tabs. | `PageHeader`, `StatCard` interactive metric tabs, standardized row action group. | COMPLETED | VERIFIED |
| `/purchasing/orders` | Purchasing | Metric cards with irregular font sizes & loud borders, custom action buttons in PO rows. | `PageHeader`, interactive `StatCard` filter tabs, standardized `size="icon-sm"` / `size="xs"` table actions. | COMPLETED | VERIFIED |
| `/quotations` | Sales Quotations | Ad-hoc metric card styling, inconsistent table row action icons. | `PageHeader`, `StatCard`, standardized table & filter bar, canonical `size="icon-sm"` / `size="xs"` actions. | COMPLETED | VERIFIED |
| `/customers` | Customer Master | Custom header with non-standard layout and action button heights. | `PageHeader`, standardized search & filter bar, canonical table styling. | COMPLETED | VERIFIED |
| `/inventory/grn` | Inventory | Custom header div, missing Actions column in table. | `PageHeader`, `StatCard`, standard registry table with `Actions` column (`Details` button). | COMPLETED | VERIFIED |
| `/finance/cash-book` | Finance | Metric cards with varying background tints. | `PageHeader`, `StatCard`, live GL ledger table with unified action buttons, printable payment voucher. | COMPLETED | VERIFIED |
