# Existing Design Token Audit & Visual System Baseline

**Document ID:** `TRANSFORMATION-03-DESIGN-TOKEN-AUDIT`  
**System:** Antigravity Workshop & POS ERP System (Enterprise UI/UX Modernization)  
**Phase:** Phase 01 — Complete System Discovery & Visual Baseline  
**Date:** November 2026  
**Status:** Visual Foundations & Token Audit Finalized  

---

## 1. Executive Summary

This document performs an exhaustive audit of the existing design tokens, stylesheets, Tailwind configuration, CSS custom properties, typography hierarchies, elevation models, and corner radius mechanics across the application.

The current system has established foundational modern visual foundations (such as Chalk & Porcelain surfaces, Terracotta conversion accents, Obsidian structural anchors, and tabular numerals). However, code-level analysis reveals **competing styling channels**, including hardcoded inline hex codes, duplicated HSL CSS variables, inconsistent control radii, and conflicting table and button overrides.

This audit maps the current state, catalogs all token definitions, documents duplications and conflicts, and defines the remediation requirements for Phase 02 (Global Design System).

---

## 2. Core Stylesheet & Token Configuration Inspection

### 2.1 File Locations & Hierarchy
- **Primary Global Stylesheet:** `src/index.css` (196 lines)
- **Tailwind Configuration:** `tailwind.config.js` (76 lines)
- **TypeScript Tokens Definition:** `src/design-system/tokens.ts` (138 lines)
- **Global Design Manager API:** `src/design-system/global-manager.ts` (174 lines)
- **HTML Font & Head Preconnects:** `index.html` (Google Fonts imports for Plus Jakarta Sans & JetBrains Mono)

---

### 2.2 Surface & Canvas Layering Mechanics

| Surface Token | Value in `tokens.ts` | CSS Property / Tailwind Class | Implementation Usage | Audit Assessment |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Background** | `#F6F8FA` | `--bg-canvas` / `bg-canvas` | Main application background behind scroll viewport | Atmospheric cool chalk. Excellent baseline contrast against pure white cards. |
| **Warm Canvas Alternative** | `#F9F8F6` | `--bg-canvas-warm` / `bg-canvas-warm` | Alternate porcelain background | Infrequently used; redundant with primary canvas. |
| **Primary Surface** | `#FFFFFF` | `--bg-surface-primary` / `bg-surface` | Elevated cards, tables, POS drawers, repair sections | Clean crisp white. Properly framed by micro-hairline borders. |
| **Subtle Surface** | `#F8FAFC` | `--bg-surface-subtle` / `bg-surface-subtle` | 12-field vehicle intake header, table hover rows | Clean contrast (Slate 50). |
| **Table Header (Warm)** | `#FFF7ED` | `--bg-table-header` / `bg-surface-warm` | Table header rows (Orange 50 warm sand) | Good contrast; sometimes conflicts with cool slate headers. |
| **Admin Cost Visibility Tint**| `#F0FDF4` | `--admin-profit-tint` / `bg-admin-profit-tint` | Table cell background for revealed buying costs & margins | Soft emerald tint (Green 50). High clarity for secret owner view. |
| **Acrylic Scrim** | `rgba(15, 23, 42, 0.45)`| `--overlay-scrim` / `acrylic-blur` | Backdrop for modals, command palettes, slide-over sheets | Frosted glass effect (`backdrop-filter: blur(12px)`). |

---

### 2.3 Brand & Action Color Tokens

| Brand Token | Hex / HSL Value | CSS Variable / Class | Role & Functional Context | Conflicting Usages Identified |
| :--- | :--- | :--- | :--- | :--- |
| **Terracotta Primary** | `#F95700` | `--brand-terracotta` / `bg-brand-terracotta` | Primary action CTAs (`+ New Repair Sheet`, `Tender Payment`, Active Filter pills) | Overused in some headers; hardcoded inline as `bg-[#F95700]` in 14 files instead of token class. |
| **Terracotta Hover** | `#EA580C` | `--brand-terracotta-hover` / `hover:bg-brand-terracotta-hover` | Hover state for primary CTAs | Hardcoded as `hover:bg-[#EA580C]` in multiple components. |
| **Terracotta Light** | `#FFF7ED` / `#FFF3ED` | `--brand-terracotta-light` / `bg-[#FFF3ED]` | Active navigation background in sidebar and table filter pills | Dual hex codes in use (`#FFF7ED` vs `#FFF3ED`), creating slight color mismatches. |
| **Obsidian Anchor** | `#0F172A` | `--brand-obsidian` / `bg-brand-obsidian` / `text-brand-obsidian` | Primary text copy, executive dark KPI cards, secondary CTAs | Hardcoded inline as `bg-[#0F172A]` and `text-slate-900` interchangeably. |
| **Obsidian Hover** | `#1E293B` | `hover:bg-slate-800` | Hover state for dark buttons | Inconsistent hover states (`#1E293B` vs `bg-slate-800` vs `bg-slate-900`). |

---

### 2.4 Semantic Status Colors (Tonal Pastels)

The design system enforces a tonal pastel rule: pairing a `10%` translucent background with a `1px 20%` border and deep saturated text.

| Semantic Tone | Background (`bg`) | Border (`border`) | Text (`text`) | Intended Meaning | Actual Usages in Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Emerald** | `#ECFDF5` | `#A7F3D0` | `#047857` | Completed, Paid, Optimal Margin (> 35%) | Used in `InvoiceStatusBadge`, `ProfitKpiCards`, `CatalogListPage`. |
| **Amber** | `#FFFBEB` | `#FDE68A` | `#B45309` | Waiting Parts, Pending Insurance, Margin Warning (20–35%) | Used in `WorkshopBoardPage`, `WorkshopJobsPage`, `LowStockAlerts`. |
| **Cobalt** | `#EFF6FF` | `#BFDBFE` | `#1D4ED8` | In Progress, Active Workshop Bay, Quotation | Used in `WorkshopBoardPage`, `WorkshopJobsPage`, `RepairSheetPage`. |
| **Crimson** | `#FEF2F2` | `#FECACA` | `#B91C1C` | Cancelled, Overdue, Margin Loss (< 0%), Petty Cash | Used in `ExpensesPage`, `ProfitLedgerPage`, `WorkshopJobsPage`. |
| **Neutral Slate** | `#F8FAFC` | `#E2E8F0` | `#475569` | Draft, Unassigned, Inactive | Used in `WorkshopJobsPage`, `RepairSheetPage`. |

---

### 2.5 Typography Hierarchy & Tabular Figures

Configured in `index.html`, `src/index.css`, and `tailwind.config.js`:
- **UI Font Family:** `'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace Font Family:** `'JetBrains Mono', monospace`
- **Numerical Tabular Rules:**
  - Globally enforced via `.display-figure`, `.tabular-nums`, and `.font-mono`:
    ```css
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    ```
  - Letter-spacing standard:
    - Headings (`h1`..`h6`): `-0.015em`
    - Display figures / Large KPI values: `-0.03em`
- **Typography Scale Audit:**

| Typographic Role | Target Size | Line Height | Font Weight | Observed Consistency |
| :--- | :--- | :--- | :--- | :--- |
| **Display KPI Hero** | 28px (`1.75rem`) | 1.15 | 700 / Bold | Mostly consistent; some KPI tiles drop to 24px. |
| **Page Title** | 22–24px (`1.375–1.5rem`) | 1.25 | 700 / Bold | Consistent across modern feature pages. |
| **Section Title** | 16–18px (`1–1.125rem`) | 1.3 | 600 / Semibold | High consistency in `WorkshopTable` and `RepairSheetPage`. |
| **Card / Tile Title** | 13–14px (`0.8125–0.875rem`)| 1.35 | 600 / Semibold | Consistent uppercase slate tracking in KPI cards. |
| **Body Standard** | 13.5–14px (`0.84–0.875rem`)| 1.5 | 400 / Regular | Consistent across views. |
| **Table Header** | 11–12px (`0.6875–0.75rem`)| 1.4 | 600 / Semibold | Uppercase tracking-wider (`tracking-wider text-slate-500`). |
| **Table Body Cell** | 13px (`0.8125rem`) | 1.45 | 400–500 | High legibility. Tabular numerals aligned right. |
| **Monospace Identifiers**| 12–13px (`0.75–0.8125rem`)| 1.4 | 500 / Medium | Applied to license plates, SKUs, voucher numbers. |

---

### 2.6 Mathematical Corner Radii & Concentricity

The system defines four standardized radius tokens in `tailwind.config.js`:
- `--radius-control`: `10px` (`rounded-control`)
- `--radius-control-inner`: `6px` (`rounded-control-inner`)
- `--radius-card`: `16px` (`rounded-card`)
- `--radius-modal`: `22px` (`rounded-modal`)
- `--radius-pill`: `9999px` (`rounded-pill` / `rounded-full`)

#### Concentricity Law Compliance Check:
$$\text{Inner Radius} = \max(0, \text{Outer Radius} - \text{Padding})$$

| Component Structure | Outer Radius | Padding | Expected Inner Radius | Actual Inner Radius | Compliance Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **KPI Card with Status Dot** | 16px (`rounded-card`) | 16px (`p-4`) | 0px (or pill dot) | Pill status dot | Compliant |
| **Repair Section Container** | 16px (`rounded-card`) | 0px (header docked) | Edge docked = 0px | 0px on table edges | Compliant |
| **Search Input with Omnibox** | 10px (`rounded-control`) | 6px (`p-1.5`) | 4px | 4px (`rounded-sm` chip)| Compliant |
| **Button Group Stepper** | 10px (`rounded-control`) | 2px (`p-0.5`) | 8px | 8px inner button | Compliant |
| **Modal Container** | 22px (`rounded-modal`) | 24px (`p-6`) | Inner content flat | Flat content surfaces | Compliant |

---

### 2.7 Elevation & Shadow System

The system defines two primary dual-layer diffused elevations:
1. **`boxShadow.luxury` (Default Surface Elevation):**
   ```css
   box-shadow: 0 2px 10px -2px rgba(15, 23, 42, 0.03), 0 12px 32px -4px rgba(15, 23, 42, 0.02);
   ```
   *Purpose:* Cards, tables, repair sections, and POS cart container. Replaces heavy dark dropshadows with subtle atmospheric depth.
2. **`boxShadow['luxury-elevated']` (Floating Overlays):**
   ```css
   box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04);
   ```
   *Purpose:* Command palette (`⌘K`), dropdown popovers, floating quick action bars, modal dialogs.

---

### 2.8 Iconography & Icon System

- **Icon Family:** `lucide-react` (version 1.16.0 / modern tree-shakable ESM icons)
- **Stroke Width Standard:** `1.75px` to `2.0px`
- **Icon Sizing Scale:**
  - Micro / Inline button icon: `14px × 14px` (`w-3.5 h-3.5`)
  - Standard button & navigation icon: `16px × 16px` (`w-4 h-4`)
  - Card & header indicator icon: `20px × 20px` (`w-5 h-5`)
  - Empty state / Hero icon: `32px × 32px` to `48px × 48px` (`w-8 h-8` to `w-12 h-12`)
- **Audit Finding:**
  - Excellent icon consistency across all routes.
  - Zero emoji icons or mismatched third-party icon fonts.

---

## 3. Discovered Design Token Inconsistencies & Remediation Blueprint

### Inconsistency 1: Dual Root CSS Token Systems
- **Issue:** `src/index.css` defines two separate token systems in `:root`:
  1. Default shadcn/ui HSL tokens (`--background: 0 0% 100%`, `--primary: 222.2 47.4% 11.2%`, etc.).
  2. 500 Labs Luxury tokens (`--bg-canvas: #F6F8FA`, `--brand-terracotta: #F95700`, `--brand-obsidian: #0F172A`).
- **Remediation for Phase 02:**
  Map the shadcn/ui base CSS variables directly to the luxury tokens so that all standard components automatically inherit the enterprise palette without dual maintenance.

### Inconsistency 2: Hardcoded Hex Codes in Component Code
- **Issue:** 18 distinct components use raw Tailwind arbitrary classes (e.g. `bg-[#F95700]`, `text-[#0F172A]`, `bg-[#FFF3ED]`, `hover:bg-[#EA580C]`) instead of token utilities (`bg-brand-terracotta`, `text-brand-obsidian`).
- **Remediation for Phase 02:**
  Refactor all instances to consume the canonical token classes from `tailwind.config.js`.

### Inconsistency 3: Redundant Component Density Controls
- **Issue:** Density is currently controlled through ad-hoc padding overrides (`py-1`, `py-2`, `py-3`) rather than explicit density variants (`compact`, `standard`, `comfortable`).
- **Remediation for Phase 02:**
  Implement explicit density props on canonical components (`DataTable`, `KpiCard`, `FormField`).

---

## 4. Verification & Sign-off

- **Stylesheets Audited:** `src/index.css`, `tailwind.config.js`, `src/design-system/tokens.ts`, `src/design-system/global-manager.ts`.
- **CSS Custom Properties Mapped:** 24 variables verified.
- **Typography & Numerals Verified:** Tabular numeric rules confirmed active across all numeric contexts.
- **Zero Broken Imports:** All token exports resolve cleanly.
