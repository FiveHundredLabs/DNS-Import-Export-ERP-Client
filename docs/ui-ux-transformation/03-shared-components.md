# Global Shared Component Specification & Enterprise Inventory

**Document ID:** `TRANSFORMATION-03-SHARED-COMPONENTS`  
**System:** Antigravity Workshop & POS ERP System (Enterprise UI/UX Modernization)  
**Phase:** Phase 03 — Global Shared Component Transformation  
**Date:** November 2026  
**Status:** Consolidated, Production-Grade Component Suite Finalized  

---

## 1. Executive Summary & Component Architecture

Phase 03 establishes the canonical shared component foundation for the Antigravity Workshop & POS ERP. Rather than implementing ad-hoc styles on individual screens, all interface surfaces across Workshop Operations, Catalog Management, Point-of-Sale (POS), and Finance & Profit Ledger now consume unified, accessible, and type-safe component primitives.

All components are anchored to the central design tokens defined in `src/styles/design-tokens.css` and `src/design-system/tokens.ts`, adhering to strict Swiss typographic rhythm, 4px mathematical spacing, concentric corner radii, and tonal semantic pastels.

### 1.1 Core Engineering Principles
1. **Single Source of Truth:**
   All enterprise components reside in `src/components/ui/` and are re-exported through `@/design-system`, ensuring a clean migration path without breaking legacy imports.
2. **Tabular Numeral Enforcement:**
   All financial values, currency displays, quantities, and dates strictly enforce `tabular-nums` and `font-mono` where applicable, preventing numerical jitter across tables and KPI tiles.
3. **No Over-Cardification:**
   Tables remain dense tabular registers; forms remain structured field sections. Cards are strictly reserved for high-level analytical summaries, KPI callouts, and distinct entity profiles.
4. **Strict Cost & Privacy Redaction:**
   Document summary cards and action bars respect role-based cost privacy invariants. When cost visibility is disabled or inaccessible for a role (e.g., `SERVICE_ADVISOR`, `TECHNICIAN`), sensitive figures are redacted (`••••••`).
5. **Zero Width Jitter on Interactive States:**
   Buttons and selectors preserve dimensions during loading and disabled transitions.

---

## 2. Master Component Inventory & TypeScript Contracts

### 3.1 Button System (`src/components/ui/button.tsx`)

The button system provides standardized visual emphasis, heights, and compound controls.

#### Visual Hierarchy & Role Invariants
- **Primary (`#F95700` Terracotta):** Reserved for the single primary conversion action per viewport context (e.g. `+ New Repair Sheet`, `Complete Payment`). Features a subtle top highlight (`shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]`).
- **Obsidian Executive (`#0F172A`):** Structural actions, batch processors, or high-level mode toggles.
- **Secondary Hairline:** Subtle white background with `border-slate-200/80` for alternative non-destructive actions (e.g. `Export PDF`, `Print`).
- **Tertiary / Ghost:** Borderless low-emphasis triggers for inline table operations or secondary toolbars.
- **Destructive / Soft-Destructive:** Explicit red fill or soft pastel red (`bg-red-50 text-red-700`) for deletions, stage rollbacks, or voiding transactions.

#### Standard Sizing Scale
| Size Prop | Height | Padding | Typographic Style | Canonical Context |
| :--- | :--- | :--- | :--- | :--- |
| `compact` / `sm` | `32px` (`h-8`) | `px-3 text-xs` | Semibold 12px | Table row actions, modal footers, compact headers |
| `default` | `38px` (`h-[38px]`) | `px-4 py-2 text-sm` | Medium 14px | Standard page actions, form submits |
| `large` / `lg` | `42px` (`h-[42px]`) | `px-6 py-2.5 text-base` | Semibold 16px | POS terminal tenders, primary conversion CTAs |
| `icon` | `38px × 38px` | `p-0` | Centered 16px icon | Standalone square action triggers |

#### TypeScript Contract
```typescript
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'warning'
    | 'primary'
    | 'terracotta'
    | 'obsidian'
    | 'soft-destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'compact' | 'large';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  attached?: boolean;
}

export interface SplitButtonProps {
  primaryLabel: string;
  onPrimaryClick: () => void;
  primaryIcon?: React.ReactNode;
  actions: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    destructive?: boolean;
  }>;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  disabled?: boolean;
  isLoading?: boolean;
}
```

---

### 3.2 PageHeader System (`src/components/ui/page-header.tsx`)

The canonical `PageHeader` standardizes the title hierarchy across all application routes.

#### Architecture & Layout
1. **Breadcrumbs:** Top micro-hierarchy trail with chevron separators.
2. **Title Row:**
   - Left: Primary title (`24px font-bold text-slate-900`) + Contextual `StatusBadge` inline.
   - Right: Unified action container aligning secondary buttons and exactly one primary button.
3. **Description:** Optional one-sentence contextual narrative (`text-xs sm:text-sm text-slate-500`).
4. **Toolbar Slot:** Optional search input and category filter chips.
5. **Tabs Slot:** Optional contextual tabs directly integrated above the bottom border.

#### TypeScript Contract
```typescript
export interface PageHeaderProps {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string; onClick?: () => void }>;
  description?: string;
  status?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  toolbar?: React.ReactNode;
  tabs?: React.ReactNode;
  className?: string;
}
```

---

### 3.3 Card System (`src/components/ui/card-system.tsx`)

Replaces ad-hoc floating containers with 8 purpose-built card primitives:

| Card Primitive | Purpose & Visual Architecture | Key Props |
| :--- | :--- | :--- |
| `KpiCard` | High-impact numerical KPI with display figure, delta badge (`+12.5%`), subtitle, and obsidian/emerald/amber/crimson variants. | `label`, `value`, `deltaPercent`, `deltaType`, `subtitle`, `variant`, `isCurrency` |
| `MetricCard` | Compact secondary metric with micro-indicator dot (`optimal`, `warning`, `deficit`). | `label`, `value`, `trend`, `status`, `isCurrency` |
| `SummaryCard` | Structured tabular key-value list with label/value horizontal alignment. | `title`, `items: Array<{ label, value, sub, mono, highlight }>`, `footer` |
| `InfoCard` | Notice banner with contextual icon, title, description, and optional inline action. | `title`, `description`, `icon`, `action`, `variant` |
| `ActionCard` | Clickable card with interactive hover shadow, arrow reveal, and title/description. | `title`, `description`, `icon`, `badge`, `onClick` |
| `ChartCard` | Container with header, period selector slot, legend slot, and chart canvas area. | `title`, `subtitle`, `periodSelector`, `legend`, `children` |
| `EntitySummaryCard` | Profile card for Customer, Vehicle, or Supplier attributes with entity badge. | `entityType`, `primaryText`, `secondaryText`, `badgeText`, `attributes`, `action` |
| `DocumentSummaryCard` | Financial document register: Gross Subtotal, Discount, Tax, Total, Tendered, and Due with redaction. | `subtotalRs`, `discountRs`, `taxRs`, `totalRs`, `paidRs`, `balanceRs`, `isCostRedacted` |

---

### 3.4 Table System (`src/components/ui/data-table.tsx`)

Canonical `DataTable` architecture enforcing consistent row heights, typography, cell alignment, and monospace styling.

#### Density Tokens
- **Compact (`h-10` / 40px):** High-density accounting and parts inventory registers.
- **Default (`h-12` / 48px):** Standard workshop jobs and repair sheet item tables.
- **Comfortable (`h-14` / 56px):** Expanded activity logs and customer inspection histories.

#### Column Alignment Invariants
- **Text:** Left-aligned.
- **Financial / Quantities:** Right-aligned with mandatory `font-mono tabular-nums`.
- **Status Badges:** Compact pill aligned left or center.
- **Actions Column:** Right-aligned with sticky action triggers.

#### Specialized Cell Primitives
- `CodeCell`: Monospace badge for invoice IDs (`INV-2026-001`) and transaction vouchers.
- `LicensePlateCell`: Formal vehicle plate badge (`WP CAD-5678`) with optional sub-label.
- `CurrencyCell`: Formatted Sri Lankan Rupees (`Rs. 85,000.00`) with negative red highlight.

#### TypeScript Contract
```typescript
export interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: 'compact' | 'default' | 'comfortable';
}

export interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}
```

---

### 3.5 Form System (`src/components/ui/form-system.tsx`)

A unified form layout system standardizing label placement, required indicators, inline error handling, and 40px (34px compact) input controls.

#### Component Roster
- `FormSection`: Clean section block with section title, description, and dividing hairlines.
- `FormField`: Field wrapper coordinating label, input, description, and direct inline error message.
- `FormLabel`: Semibold 12px label with explicit red asterisk for required fields.
- `FormDescription`: Subtle 11px slate-500 helper caption.
- `FormError`: Direct red alert message with `AlertCircle` icon (`animate-in fade-in-50`).
- `TextInput`: Standard 40px / compact 34px with single-chroma focus ring (`focus:border-[#F95700] focus:ring-4 focus:ring-orange-500/10`).
- `NumberInput`: Right-aligned tabular number input.
- `DateInput`: Standardized calendar input.
- `InputGroup`: Compound input container with prefix/suffix addons (e.g. `Rs.`, `%`, icons).
- `Textarea`: Consistent multiline text input with matching focus styling.
- `Checkbox`: Accessible rounded checkbox with label and sub-description.
- `RadioGroup`: Standard radio list or interactive 2-column card radio group.
- `SearchableSelect`: Dropdown select with local search filtering and full keyboard navigation (ArrowDown, ArrowUp, Enter, Escape).
- `Combobox`: Flexible search-and-select autocomplete component.
- `Switch`: Tactile toggle switch with ARIA role="switch" and smooth transition.

---

### 3.6 Selector System (`src/components/ui/selectors.tsx`)

Universal combobox and selector architecture for enterprise entities.

#### Features
- **Universal `EntitySelector` Primitive:** Keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`), debounced search, loading spinner, clear action (`X`), and empty state with inline "Create New" shortcut.
- **Domain Specializations:**
  - `CustomerSelector`: Name, phone, and vehicle attributes.
  - `VehicleSelector`: Registration plate badge, make & model, manufacturing year.
  - `SupplierSelector`: Vendor name, contact person, phone number.
  - `ProductSelector`: Spare part name, SKU badge, stock quantity pill, and unit price.
  - `BatchSelector`: Warehouse/inventory batch selector with batch number, quantity available, expiry date, unit cost, and selling price.

---

### 3.7 StatusBadge System (`src/components/ui/badge.tsx`)

Consolidates fragmented stage and status pills into a single unified semantic primitive.

#### Semantic Mapping Matrix
| Semantic Theme | Background | Border | Text | Target Enterprise Statuses |
| :--- | :--- | :--- | :--- | :--- |
| **Emerald** | `#ECFDF5` | `#A7F3D0` | `#047857` | `COMPLETED`, `PAID`, `OPTIMAL_MARGIN (> 35%)`, `APPROVED`, `BALANCED`, `ACTIVE` |
| **Amber** | `#FFFBEB` | `#FDE68A` | `#B45309` | `WAITING_PARTS`, `PENDING_INSURANCE`, `WARNING_MARGIN (20-35%)`, `PARTIALLY_PAID`, `DRAFT`, `ON_HOLD` |
| **Cobalt** | `#EFF6FF` | `#BFDBFE` | `#1D4ED8` | `IN_PROGRESS`, `ACTIVE_BAY`, `QUOTATION`, `SUBMITTED`, `REGISTER_OPEN` |
| **Crimson** | `#FEF2F2` | `#FECACA` | `#B91C1C` | `CANCELLED`, `OVERDUE`, `DEFICIT (< 0%)`, `REJECTED`, `LOW_STOCK_ALERT` |
| **Neutral Slate** | `#F8FAFC` | `#E2E8F0` | `#475569` | `UNASSIGNED`, `INACTIVE`, `REGISTER_CLOSED` |

#### Dimension & Typographic Standard
- **Height:** Strict 22px (`h-[22px]`).
- **Radius:** `rounded-full`.
- **Typography:** `text-[10px] font-bold uppercase tracking-wider`.
- **Status Dot:** Optional 6px colored indicator dot (`dot={true}`).

---

### 3.8 Dialog, Drawer & Popover System (`src/components/ui/dialog-system.tsx`)

Standardizes all modal layers to `rounded-[22px]`, `backdrop-blur-md bg-slate-950/25`, and standardized header/footer actions.

- `ConfirmDialog`: Action confirmation modal with primary or destructive trigger.
- `FormDialog`: Form wrapper with scrollable body, cancel button, and submit trigger.
- `DetailDialog`: Inspector dialog for deep record inspection with tab support.
- `SideDrawer`: Slide-over drawer from right/left for slide-in sidebars and item configuration.
- `ActionPopover`: Anchored floating menu for row actions, status selectors, or contextual shortcuts.

---

### 3.9 Tabs & Segmented Controls (`src/components/ui/tabs.tsx`)

- `Tabs`: Full ARIA tab system with count badges on triggers, active indicator, and keyboard navigation (`ArrowLeft` / `ArrowRight`).
- `SegmentedControl`: Tactile pill toggle for 2 to 5 options with active sliding background and count badge pills.

---

### 3.10 FilterToolbar (`src/components/ui/filter-toolbar.tsx`)

A unified search and filtering pattern:
- Live search input with clear trigger (`X`).
- Category filter pills with count badges (`FilterPill`).
- Date range picker integration slot.
- Active filter count indicator badge.
- Automatic "Clear all filters" button when active filters count > 0.

---

### 3.11 Charts & Visualizations (`src/components/ui/chart-containers.tsx`)

- `ChartContainer`: Reusable container with title, subtitle, period selector slot, responsive SVG canvas area, and legend container.
- `BarChartContainer`, `LineChartContainer`, `AreaChartContainer`, `DonutChartContainer`.
- `ChartTooltip`: High-contrast obsidian dark tooltip (`#0F172A`, 1px `border-slate-800`, text-white, `tabular-nums`, colored indicator dots).
- `ChartLegend`: Standardized horizontal legend with circular color swatches.

---

### 3.12 Remaining Global Components (`src/components/ui/feedback-empty-skeleton.tsx` & `src/components/ui/dropdown-menu.tsx`)

- `Breadcrumbs`: Hierarchy navigation trail with chevron dividers.
- `AlertBanner`: Inline contextual alerts (`info`, `success`, `warning`, `danger`) with dismiss action.
- `EmptyState`: Centered empty state illustration with title, description, and primary CTA.
- `Skeleton`, `SkeletonCard`, `SkeletonTableRow`: Shimmering placeholder animations during async data loads.
- `Tooltip`: Obsidian dark hover tooltip for icons and truncated labels.
- `NumericDisplay` & `CurrencyDisplay`: Formats currency with `tabular-nums`, handles invalid/NaN figures safely, and supports privacy redaction (`••••••`).
- `DocumentActionBar`: Sticky action footer with document ID, stage pill, read-only tag, and cost privacy toggle (`Eye` / `EyeOff`).
- `DropdownMenu`: Accessible composable dropdown primitives (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`) with Escape and outside-click dismissal.

---

## 3. Accessibility Standards & Keyboard Ergonomics

All Phase 03 components strictly implement WAI-ARIA authoring practices:
- **Buttons & Triggers:** `role="button"`, `aria-busy` during loading, `disabled` disables pointer events and focus rings. Support for `tertiary` low-emphasis actions.
- **Modals & Drawers:** `role="dialog"` or `role="alertdialog"`, `aria-modal="true"`, trapping focus and closing on `Escape`.
- **Tabs & Segmented Controls:** `role="tablist"`, `role="tab"`, `aria-selected="true"`, roving `tabIndex` (`0` on active, `-1` on inactive), and `ArrowLeft` / `ArrowRight` keyboard navigation.
- **Combobox & Selectors:** `aria-haspopup="listbox"`, `aria-expanded`, keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`).
- **Focus Rings:** Unified non-harsh focus rings: `focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#F95700]`.

---

## 4. Verification Record & Test Suite Results

The shared component suite is verified through comprehensive automated testing:
- **TypeScript Compilation:** Zero errors (`npx tsc --noEmit` and `npm run build` pass cleanly).
- **Automated Test Suites:** 26 test suites comprising **474 tests** pass with 100% success rate (`npx vitest run`).
- **Phase 03 Test Suite:** `tests/phase03-shared-components.test.tsx` explicitly exercises all 12 shared component categories:
  - Button heights (32px, 38px, 42px), tertiary variant, loading state, ButtonGroup, SplitButton with Escape dismissal.
  - PageHeader slots (breadcrumbs, title, status, actions).
  - All 8 card types, simultaneous icon and delta badge rendering, neutral delta styling, tabular-nums formatting, privacy redaction.
  - Table density rows (40px, 48px, 56px), DataTableBody, CodeCell, LicensePlateCell, CurrencyCell, pagination with zero entries.
  - FormSection, FormField validation errors, Checkbox, RadioGroup cards, SearchableSelect with keyboard navigation, Combobox, and Switch.
  - Universal EntitySelector, CustomerSelector, VehicleSelector, SupplierSelector, ProductSelector, and BatchSelector with keyboard navigation and domain selection.
  - StatusBadge semantic color auto-resolution for standard and punctuated enterprise statuses, and 22px height token.
  - ConfirmDialog, FormDialog, DetailDialog, SideDrawer, ActionPopover with Escape dismissal.
  - Tabs with count badges and keyboard arrows, SegmentedControl with arrow key navigation.
  - FilterToolbar search, filter pills, active count, and clear filters.
  - ChartContainer, ChartTooltip with obsidian styling, ChartLegend.
  - Breadcrumbs, AlertBanner, EmptyState, Skeletons, Tooltip, NumericDisplay, DocumentActionBar, DropdownMenu primitive.
