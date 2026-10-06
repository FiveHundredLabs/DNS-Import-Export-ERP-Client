# DNS Distribution ERP — UI Developer & Component Guide

Welcome to the DNS Distribution ERP UI system. This guide is written for frontend and UI developers to quickly understand how styling, tokens, and components are organized across the project.

---

## 1. Centralized System Styles (`src/styles.css`)

All system styles, CSS variables, typography rules, form controls, and component overrides are organized in a **single source of truth**:

> **File location:** [`src/styles.css`](file:///d:/projects/500-labs/DNS-Import-Export-ERP-Client/src/styles.css) (with [`src/index.css`](file:///d:/projects/500-labs/DNS-Import-Export-ERP-Client/src/index.css) as a forwarder)

### Table of Contents inside `styles.css`:
1. **Google Fonts Import**: Inter (UI text) & JetBrains Mono (SKUs, serials, currencies, numbers).
2. **Tailwind Directives**: `@tailwind base`, `@tailwind components`, `@tailwind utilities`.
3. **Design Tokens & Theme Variables**: Dynamic primary colors (`--primary`, `--primary-hover`, `--primary-active`, `--primary-light`, `--primary-border`, `--primary-text`, `--primary-ring`), plus light/dark tokens.
4. **Base Typography**: Smooth font rendering, body line height (1.5), enterprise heading hierarchy (`h1` 24px, `h2` 18px, `h3` 16px).
5. **Tabular Figures**: Automatic `font-variant-numeric: tabular-nums` for tables, financial inputs, and currency numbers.
6. **Form Controls & Accents**: `input`, `select`, `textarea`, `label`, `accent-color` for native checkboxes/radios.
7. **Radix UI & Shadcn Overrides**: Strict protection ensuring dropdown items have light hover (`bg-slate-100`) and checked (`bg-slate-50`) states, **never black**.
8. **Enterprise Utility Classes**: `.erp-page-title`, `.erp-card-title`, `.erp-financial-amount`, `.erp-kpi-number`.
9. **Scrollbars & Helpers**: Cross-browser clean scrollbar hiding while preserving scroll functionality.

---

## 2. Centralized Components Hub (`src/components/index.ts`)

All components can now be imported from **one central location**:

```tsx
// Option A: Master import for any component in the system
import {
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Dialog,
  Table,
  Header,
  Sidebar,
  CustomerSelector,
  ApprovalBadge,
  InvoiceStatusBadge,
} from '@/components';

// Option B: Primitives-only import
import { Button, Input, Select, Card, Badge } from '@/components/ui';
```

### Component Directory Map:

| Category | Directory | Description & Included Components |
| :--- | :--- | :--- |
| **UI Primitives (Shadcn)** | `src/components/ui/` | `Button`, `Input`, `Select`, `Card`, `Badge`, `Dialog`, `Table`, `Tabs`, `Textarea`, `Alert`, `Skeleton` |
| **Application Shell** | `src/components/common/` | `Header`, `Sidebar`, `MobileNav`, `InnerSidebar`, `RoleSwitcher`, `StatCard`, `EmptyState`, `ErrorState`, `LoadingSkeleton` |
| **Entity Selectors** | `src/components/selectors/` | `CustomerSelector`, `CustomerSummaryCard`, `ProductSelector`, `ProductSummaryCard` |
| **Approval Engine** | `src/components/approval/` | `ApprovalBadge`, `ApprovalTimeline`, `ApprovalActionDialog` |
| **Status Badges** | Shared from `src/components` | `InvoiceStatusBadge`, `PaymentStatusBadge`, `WarrantyStatusBadge` |

---

## 3. UI Guidelines & Design Rules

### A. Border Radii Consistency
- **Low-height interactive controls** (height $\le$ 40px: buttons, inputs, selects, badges, search bars, pills): **Always use `rounded-md`** (6px / 0.375rem).
- **Cards & Content Surfaces**: Use `rounded-xl` (12px / 0.75rem) or `rounded-lg`.
- **Modals & Dialogs**: Use `rounded-xl` or `rounded-2xl` with subtle backdrop blur.

### B. Colors & Themes
- Use Tailwind semantic primary classes (`bg-primary`, `text-primary`, `border-primary`, `bg-primary-light`, `border-primary-border`, `text-primary-text`).
- The primary color changes dynamically based on the Director's theme selection (Orange, Navy, Red, Sky Blue, Obsidian Black). Never hardcode primary hex codes.

### C. Dropdowns & Radix Select
- Always use the Shadcn `Select` component (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`).
- Avoid raw HTML `<select>` in user-facing views.
- Selection and hover states are handled by `styles.css` with high contrast dark text on light slate backgrounds.

### D. Financial & Numerical Data
- Always use tabular numbers for figures: use `.font-mono` or `.tabular-nums`.
- Use the formatters in `src/utils/formatters.ts`: `formatCurrency(amount)` for LKR and `formatDate(date)` for dates.
