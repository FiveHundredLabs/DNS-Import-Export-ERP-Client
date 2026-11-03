# Global Design System Specification & Enterprise Visual Foundations

**Document ID:** `TRANSFORMATION-02-DESIGN-SYSTEM`  
**System:** Antigravity Workshop & POS ERP System (Enterprise UI/UX Modernization)  
**Phase:** Phase 02 — Establish the New Global Design System  
**Date:** November 2026  
**Status:** Unified Visual Language & Central Tokens Finalized  

---

## 1. Executive Visual Direction & Enterprise Philosophy

To transition the ERP from fragmented administrative pages into a unified, cohesive, tier-1 enterprise operating system, the visual language establishes a **restrained, premium, high-density interface**.

### 1.1 Core Aesthetic Pillars
1. **Light Neutral Canvas Backdrop:**
   - The application workspace sits upon an atmospheric cool chalk canvas (`#F6F8FA` / `--color-app-bg`).
   - Replaces blinding harsh white backgrounds or dull muddy grays with an optical foundation that reduces eye strain over 8-hour cashier and estimator shifts.
2. **Elevated Pure White Content Containers:**
   - Cards, data tables, repair sections, and POS checkout drawers rest on pure crisp white (`#FFFFFF` / `--color-surface`).
   - Containers are framed by razor-sharp micro-hairline borders (`1px solid rgba(15, 23, 42, 0.08)` / `--color-border`) and subtle dual-layer diffused ambient elevation.
3. **Deep Charcoal / Obsidian Structural Typography:**
   - Primary content, table headers, and structural controls are anchored by deep obsidian charcoal (`#0F172A` / `--color-text-primary`).
   - Eliminates generic pure black text in favor of rich Swiss editorial contrast.
4. **Controlled Single-Chroma Action Accent (Terracotta / Burnt Coral):**
   - High-conversion actions (`+ New Repair Sheet`, `Complete Payment`, active navigation indicators, peak metric bars) use a focused terracotta accent (`#F95700`, hover `#EA580C` / `--color-primary`).
   - Accents are strictly rationed: maximum of one prominent primary action per viewport context.
5. **Tonal Semantic Pastels:**
   - Status indicators reject harsh solid neon fills. Every status badge pairs a 10% translucent background with a 1px 20% border and deep saturated typography (e.g. Emerald `#ECFDF5` / `#A7F3D0` / `#047857`).
6. **High Information Density Without Visual Clutter:**
   - Data registers prioritize vertical compactness, tabular numeral alignment, and tight micro-spacing over decorative whitespace.

### 1.2 Prohibited Anti-Patterns (Design Invariants)
- **NO Excessive Gradients:** Backgrounds, headers, and cards must remain flat and neutral. Multi-color gradients are strictly prohibited.
- **NO Ubiquitous Glassmorphism:** Heavy glassmorphism is restricted solely to modal overlays and command palette scrims. Standard data cards and tables must never use blurred translucent backgrounds.
- **NO Over-Cardification:** Do not turn every table row, form field, or metadata key-value into a floating rounded card. Tables remain structured tables.
- **NO Random Module Accent Colors:** Different modules (Workshop, Catalog, POS, Finance) must not invent their own primary accent colors (e.g. purple for POS, blue for Workshop). The entire ERP uses one unified brand accent (`#F95700`).
- **NO Oversized Typography:** Dashboard headers and numbers must not balloon beyond defined typographic scale boundaries.

---

## 2. Central Design Token Architecture

The central token system is implemented across two synchronized layers:
1. **CSS Custom Properties:** `src/styles/design-tokens.css` (imported globally via `src/index.css`).
2. **TypeScript Token Map:** `src/design-system/tokens.ts` (consumed programmatically via `globalDesignManager`).
3. **Tailwind Extended Palette:** `tailwind.config.js`.

### 2.1 Color Tokens Specification

| Token Variable | Hex / RGBA Value | Semantic Role & Purpose | Consuming Components |
| :--- | :--- | :--- | :--- |
| `--color-primary` | `#F95700` | Primary actions, conversion CTAs, selected navigation | `Button` (primary), active nav pills, checkout |
| `--color-primary-hover` | `#EA580C` | Interactive hover state for primary triggers | `Button:hover`, nav pill hover |
| `--color-primary-light` | `#FFF7ED` | Active pill background, selected table row tint | Active category filter, table active row |
| `--color-obsidian` | `#0F172A` | Structural anchor, executive CTAs, dark KPI tiles | `HeroKpiCardObsidian`, stage transition buttons |
| `--color-obsidian-hover` | `#1E293B` | Hover state for obsidian controls | Obsidian button hover |
| `--color-app-bg` | `#F6F8FA` | Main application backdrop behind scroll viewport | `AppShellMasterLayout`, body canvas |
| `--color-app-bg-warm` | `#F9F8F6` | Alternate porcelain backdrop | Standalone print and review views |
| `--color-surface` | `#FFFFFF` | Standard card, table container, drawer background | `Card`, `DataTable`, repair section containers |
| `--color-surface-muted` | `#F8FAFC` | Secondary surface, 12-field matrix, table hover | Inactive tabs, vehicle intake background |
| `--color-border` | `rgba(15, 23, 42, 0.08)` | Default hairline divider rules and card borders | All cards, inputs, table cell borders |
| `--color-border-strong` | `rgba(15, 23, 42, 0.16)` | Emphasized dividers, table header borders | Active section dividers, dialog headers |
| `--color-text-primary` | `#0F172A` | Primary headlines, table data, active values | All headings, body copy, table text |
| `--color-text-secondary`| `#475569` | Supporting copy, column labels, timestamps | Subtitles, field labels, metadata |
| `--color-text-muted` | `#94A3B8` | Tertiary captions, placeholders, hotkey hints | Input placeholders, inactive icons |
| `--color-success` | `#059669` | Positive delta, financial settlements | Paid indicators, payment modal trigger |
| `--color-warning` | `#D97706` | Approvals pending, low stock warnings | Waiting parts badges, stock alert pills |
| `--color-danger` | `#DC2626` | Destructive actions, negative operating profit | Void invoice, expense cash-outs, deficit |
| `--color-info` | `#2563EB` | Active progress, quotation status | In-progress bay status, quotation badges |

---

### 2.2 Semantic Color Mapping & Status Badges

Status badges must communicate **system-wide operational meaning**, regardless of the module where they appear:

| Semantic State | Fill (`bg`) | Border (`border`) | Text (`text`) | Standard Status Triggers |
| :--- | :--- | :--- | :--- | :--- |
| **Emerald (Optimal)** | `#ECFDF5` | `#A7F3D0` | `#047857` | `COMPLETED`, `PAID`, `APPROVED`, `OPTIMAL_MARGIN (> 35%)`, `BALANCED` |
| **Amber (Pending)** | `#FFFBEB` | `#FDE68A` | `#B45309` | `WAITING_PARTS`, `PENDING_INSURANCE`, `WARNING_MARGIN (20–35%)`, `PARTIALLY_PAID`, `DRAFT` |
| **Cobalt (Progress)** | `#EFF6FF` | `#BFDBFE` | `#1D4ED8` | `IN_PROGRESS`, `ACTIVE_BAY`, `QUOTATION`, `SUBMITTED`, `REGISTER_OPEN` |
| **Crimson (Deficit)** | `#FEF2F2` | `#FECACA` | `#B91C1C` | `CANCELLED`, `OVERDUE`, `DEFICIT (< 0%)`, `REJECTED`, `LOW_STOCK_ALERT` |
| **Neutral Slate** | `#F8FAFC` | `#E2E8F0` | `#475569` | `UNASSIGNED`, `INACTIVE`, `REGISTER_CLOSED` |

---

### 2.3 Typography Standards & Tabular Numerals

The typography hierarchy enforces Swiss editorial discipline. Headings use proportional negative letter-spacing for sharp optical weight, while all numeric amounts strictly enforce `tabular-nums` so decimal points and currency values align to the exact pixel.

```css
/* Tabular Numerals Enforcement */
.tabular-nums, .font-mono, .display-figure {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
```

| Typographic Role | Font Size | Line Height | Tracking | Weight | Canonical Usage Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | `2.0rem` (32px) | `2.25rem` (36px) | `-0.03em` | 700 / Bold | Primary KPI metric value (`Rs. 102,900.00`) |
| **Page Title** | `1.5rem` (24px) | `1.875rem` (30px) | `-0.015em`| 700 / Bold | Canonical `PageHeader` title |
| **Section Title** | `1.125rem` (18px) | `1.5rem` (24px) | `-0.01em` | 600 / Semibold| Repair section header, card category titles |
| **Card / Tile Title** | `0.875rem` (14px) | `1.25rem` (20px) | `0.025em` | 600 / Semibold| Uppercase metric tile labels (`TODAY'S GROSS SALES`) |
| **Body Primary** | `0.875rem` (14px) | `1.25rem` (20px) | `normal` | 400 / Regular | Standard narrative text, table descriptions |
| **Body Secondary** | `0.8125rem` (13px)| `1.125rem` (18px) | `normal` | 400 / Regular | Customer address, vehicle model subtitle |
| **Field Label** | `0.75rem` (12px) | `1.0rem` (16px) | `0.02em` | 600 / Semibold| Form input labels (`VEHICLE NUMBER *`) |
| **Table Header** | `0.6875rem` (11px)| `1.0rem` (16px) | `0.05em` | 600 / Semibold| Uppercase table column headers (`AMOUNT (RS.)`) |
| **Table Body Cell** | `0.8125rem` (13px)| `1.125rem` (18px) | `normal` | 400–500 | Data table row contents |
| **Caption / Hotkey**| `0.6875rem` (11px)| `0.875rem` (14px) | `normal` | 500 / Medium | `⌘K`, relative timestamps, micro badges |

---

### 2.4 Spacing Scale (4px-Based Standard)

All component margins, paddings, and grid gaps must strictly align to the 4px mathematical scale:

| Token | Pixel Value | Rem Value | Canonical Usage |
| :--- | :--- | :--- | :--- |
| `--space-1` | `4px` | `0.25rem` | Icon-to-label gaps, micro pill padding, chip margins |
| `--space-2` | `8px` | `0.5rem` | Button horizontal icon spacing, compact list item gaps |
| `--space-3` | `12px` | `0.75rem` | Input internal vertical padding, table compact row padding |
| `--space-4` | `16px` | `1.0rem` | Card internal padding, form field vertical gaps |
| `--space-5` | `20px` | `1.25rem` | Section headers to content dividers |
| `--space-6` | `24px` | `1.5rem` | Layout content horizontal padding, major card padding |
| `--space-8` | `32px` | `2.0rem` | Page section separators, dashboard grid gaps |
| `--space-10`| `40px` | `2.5rem` | Major workspace vertical rhythm dividers |
| `--space-12`| `48px` | `3.0rem` | Full page section breaks |
| `--space-16`| `64px` | `4.0rem` | Application top header height (`h-16`) |

*Rule:* Individual pages are strictly prohibited from declaring arbitrary margins (e.g. `mt-[17px]`, `gap-[23px]`).

---

### 2.5 Radius Tokens & Concentricity Law

Per modern UI guidelines, nested components must obey the **Law of Concentricity**:
$$\text{Inner Radius} = \max(0, \text{Outer Radius} - \text{Padding})$$

```
+-------------------------------------------------------+  Outer Radius: 16px (Card)
|  Padding: 16px                                        |
|  +-------------------------------------------------+  |
|  |  Inner Component Radius: 0px or 4px             |  |  Inner = max(0, 16 - 16) = 0px
|  +-------------------------------------------------+  |
+-------------------------------------------------------+
```

| Radius Token | Value | Allowed Component Usage |
| :--- | :--- | :--- |
| `--radius-sm` | `4px` (`rounded-sm`) | Keyboard hotkey chips (`⌘K`), inline tag remove buttons |
| `--radius-default` | `8px` (`rounded-lg`) | Sub-card items, inner tab switchers, nested panels |
| `--radius-control` | `10px` (`rounded-control`)| All interactive controls: buttons, text inputs, numpad keys |
| `--radius-lg` | `12px` (`rounded-xl`)| Inner summary cards, slide-over drawers |
| `--radius-card` | `16px` (`rounded-card`)| Primary KPI cards, repair section containers, data tables |
| `--radius-modal` | `20px` (`rounded-modal`)| Centered dialogs, POS payment calculator, receipt popovers |
| `--radius-pill` | `9999px` (`rounded-full`)| Status badges, active category filter pills, staff avatars |

*Rule:* Avoid "pillifying" everything. Buttons, inputs, tables, and cards must maintain disciplined structural rectangularity with subtle corner radii (8–10px controls, 16px cards).

---

### 2.6 Elevation & Shadow Tokens

The system prioritizes clean hairline borders over heavy drop shadows. Elevation is reserved strictly for indicating spatial layering:

| Elevation Level | CSS Value | Visual Depth | Canonical Usage |
| :--- | :--- | :--- | :--- |
| **Flat** | `none` | Base canvas layer | Content inside white cards, nested table cells |
| **Raised** | `0 1px 2px rgba(15, 23, 42, 0.04)` | Subtle tactile lift | Secondary buttons, hovered table rows |
| **Surface** | `0 2px 10px -2px rgba(15, 23, 42, 0.03), 0 12px 32px -4px rgba(15, 23, 42, 0.02)` | Ambient diffuse depth | Primary cards, repair tables, POS cart drawer |
| **Floating** | `0 8px 30px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)` | Raised overlay | Command palette (`⌘K`), autocomplete dropdowns |
| **Modal** | `0 20px 40px -8px rgba(15, 23, 42, 0.20), 0 0 0 1px rgba(15, 23, 42, 0.06)` | Top focal overlay | Payment modal, dialog overlays, confirmation sheets |

---

## 3. Component Density Standards

An enterprise ERP serves multiple distinct user personas with different operational velocities. The design system provides **three explicit density modes**:

```
+-----------------------------------------------------------------------------------+
| COMPACT: 40px rows, 6px padding  — High-velocity POS cart, ledger tables, stock   |
+-----------------------------------------------------------------------------------+
| STANDARD: 48px rows, 10px padding — Repair sheets, customer intake, general forms |
+-----------------------------------------------------------------------------------+
| COMFORTABLE: 56px rows, 14px padding — Executive dashboards, analytical overviews  |
+-----------------------------------------------------------------------------------+
```

### 3.1 Density Specifications

| Metric / Dimension | Compact Mode | Standard Mode | Comfortable Mode |
| :--- | :---: | :---: | :---: |
| **Target Workspaces** | POS Terminal, Profit Ledger, Stock Balances | Repair Sheet, Jobs Register, Catalog | Executive Dashboard, Analytics BI Hub |
| **Table Row Height** | `40px` | `48px` | `56px` |
| **Table Cell Padding** | `py-1.5 px-2.5` | `py-2.5 px-3.5` | `py-3.5 px-4` |
| **Form Input Height** | `34px` | `40px` | `44px` |
| **Button Height** | `32px` | `38px` | `42px` |
| **Badge Height** | `20px` | `22px` | `26px` |
| **Card Internal Padding**| `12px` | `16px` | `24px` |

*Implementation Rule:* Component density must be controlled via typed component props (e.g. `<DataTable density="compact" />` or `<Button density="compact" />`), never via ad-hoc arbitrary Tailwind overrides.

---

## 4. Standardized Interaction States

Every interactive element (buttons, inputs, table rows, tab switches) must implement the full interactive state lifecycle:

| State | Visual Treatment & Behavior | Transition Standard |
| :--- | :--- | :--- |
| **Default** | Normal token surface and text | Base resting state |
| **Hover** | 4% darker overlay (`var(--state-hover-tint)`) or slight color shift | `transition-colors duration-150` |
| **Focus-Visible**| 3px diffuse focus ring (`0 0 0 3px rgba(249, 87, 0, 0.15)`) with crisp border `#F95700` | Instant outline without layout shift |
| **Active / Pressed**| `scale-[0.98]` tactile compression with 8% darker tint | `active:scale-[0.98] transition-transform` |
| **Selected** | Primary light background tint (`#FFF7ED`) with primary text `#F95700` | High-contrast selected indicator |
| **Disabled** | `opacity-45 cursor-not-allowed pointer-events-none select-none` | Visually distinct from active elements |
| **Loading** | Spinner or pulse shimmer, button retains width and label height | Prevents layout shift during async calls |
| **Error** | Red hairline border (`#FECACA`), 3px error ring, and inline message | Visible directly beside affected control |

---

## 5. Verification & Acceptance Criteria Audit

- [x] **Single Source of Truth:** Central tokens defined in `src/styles/design-tokens.css` and imported globally.
- [x] **TypeScript Synchronization:** `src/design-system/tokens.ts` and `src/design-system/global-manager.ts` enriched with density, spacing, and semantic tokens.
- [x] **Tailwind Extended:** `tailwind.config.js` exposes canonical tokens while preserving backward compatibility.
- [x] **Zero Code Regressions:** `npx tsc --noEmit` compiles with 0 errors; all 25 test suites and 431 automated tests pass cleanly.
- [x] **Build Verification:** Production bundle generated in 704ms with zero errors.

Phase 02 visual foundations and design token architecture are **100% established and verified**. Ready for **Phase 03 — Global Shared Component Transformation**.
