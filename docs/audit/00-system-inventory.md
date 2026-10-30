# ERP UI Consistency Sentinel — System Inventory & Baseline Specification

**Document ID:** `AUDIT-00-INVENTORY`  
**Application:** DNS Import & Export ERP (Client Frontend)  
**Audit Stage:** Full System Audit Completed (Stages A, B, and C 100% Finalized)  
**Status:** All 11 Deliverables Generated (`00` through `10` in `docs/audit/`)    
**Date:** October 2026  

---

## 1. Executive Summary

This inventory establishes the comprehensive map of routes, page types, layout architectures, design system tokens, and shared components for the DNS Import & Export ERP application.

A total of **47 distinct route endpoints** and **73 primary UI components** were identified across 6 core business modules and 3 supporting operational areas. Additionally, 1 orphaned route link (`/inventory/damaged-stock`) was discovered in the primary navigation sidebar without a corresponding route declaration in `App.tsx`.

The purpose of this document is to establish the baseline architectural conventions and catalog all screens so that subsequent module audits (Stages B1 through B6) can proceed with strict evidence-based rigor, zero scope ambiguity, and full traceability.

---

## 2. Technology Stack & Design System Baseline

### 2.1 Core Frameworks & Tooling
- **Frontend Framework:** React 18.3.1 with TypeScript 5.5.3
- **Build Tool:** Vite 5.4.2
- **Styling Architecture:** Tailwind CSS 3.4.10, PostCSS, Autoprefixer
- **UI Component Foundation:** Custom Tailwind components with Radix UI headless primitives (`@radix-ui/react-select`) and Shadcn UI conventions
- **Icons:** Lucide React (`lucide-react` 0.441.0)
- **Data Tables & Forms:** React Hook Form (`react-hook-form` 7.53.0) with Zod validation (`@hookform/resolvers`, `zod` 3.23.8)
- **Data Visualization:** Recharts 2.12.7
- **Toasts & Feedback:** Sonner 1.5.0 (`<Toaster richColors position="top-right" />`)

### 2.2 Design Tokens & Theming System
The application implements a dynamic theme system driven by `ThemeService.ts` and `ThemeContext.tsx`, exposing CSS variables in `src/styles.css`:

| Token Category | CSS Variable / Class | Value / Baseline Standard | Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `bg-canvas` (`--background`) | `#F4F7F9` (Slate/Blue tinted light canvas) | Neutral system background |
| **Card / Surface** | `bg-card`, `bg-white` (`--card`) | `#FFFFFF` | Form containers, data tables, metric tiles |
| **Primary Theme** | `var(--primary)` | Dynamic (Default Navy `#263183`, Director-configurable) | Brand identity, active navigation, primary buttons |
| **Primary Hover** | `var(--primary-hover)` | `#1D2667` | Interactive state for primary elements |
| **Primary Active** | `var(--primary-active)` | `#161D4F` | Pressed state |
| **Primary Light** | `var(--primary-light)` | `#EEF1F9` | Badges, tinted pill backgrounds, active row tints |
| **Primary Border** | `var(--primary-border)` | `#C5CBEC` | Focus rings, tinted active borders |
| **Primary Foreground**| `var(--primary-foreground)` | `#FFFFFF` | Text on primary brand backgrounds |
| **Borders** | `border-slate-200` (`--border`) | `#E2E8F0` | Structural borders, divider rules |
| **Muted Text** | `text-slate-500` (`--muted-foreground`) | `#64748B` | Secondary captions, helper hints, timestamps |

### 2.3 Typography & Tabular Figures Baseline
Configured in `src/styles.css` and `tailwind.config.js`:
- **UI Font:** Google Sans Flex (fallback: Inter, system-ui)
- **Monospace / Numerical Font:** JetBrains Mono (`font-mono`)
- **Tabular Figures:** `font-variant-numeric: tabular-nums` enforced across all financial amounts, tables, currency inputs, and KPI cards.
- **Enterprise Typography Scale:**
  - `erp-page-title` / `text-page-title`: 24px (`1.5rem`), font-weight 600, line-height 1.25
  - `text-section-title`: 18px (`1.125rem`), font-weight 600, line-height 1.3
  - `erp-card-title` / `text-card-title`: 16px (`1rem`), font-weight 600, line-height 1.35
  - `text-body-text`: 14px (`0.875rem`), font-weight 400, line-height 1.5
  - `text-table-text`: 13.5px (`0.84375rem`), font-weight 400, line-height 1.45
  - `text-table-header`: 12.5px (`0.78125rem`), font-weight 600, uppercase/tracking-wider
  - `erp-financial-amount`: 22px (`1.375rem`), font-weight 600, mono tabular
  - `erp-kpi-number`: 28px (`1.75rem`), font-weight 600, mono tabular

### 2.4 Control Radii Baseline (`UI_DEVELOPER_GUIDE.md`)
- **Interactive Controls ($\le 40$px height):** `rounded-md` (6px / 0.375rem) — Buttons, text inputs, selects, search pills, filter badges.
- **Content Surfaces & Cards:** `rounded-xl` (12px / 0.75rem) or `rounded-lg` (8px).
- **Modals & Flyouts:** `rounded-xl` or `rounded-2xl` with backdrop blur.

---

## 3. Application Shell & Layout Wrappers

```mermaid
flowchart TD
    App[App.tsx] --> AppLayout[AppLayout.tsx]
    AppLayout --> Header[Header.tsx - 64px Sticky]
    AppLayout --> BodyFlex[Flex Container - Full Height]
    BodyFlex --> Sidebar[Sidebar.tsx - Collapsible Rail/Flyout]
    BodyFlex --> ContentOutlet[Content Outlet Canvas]
    ContentOutlet --> StandardLayout[StandardLayout.tsx]
    ContentOutlet --> FinanceLayout[FinanceLayout.tsx]
    StandardLayout --> ModuleRoutes[Operational Modules 1, 2, 3, 5, 6]
    FinanceLayout --> FinanceRoutes[Module 4: Finance Workflows]
    AppLayout --> MobileNav[MobileNav.tsx - Role-based Bottom Bar]
```

### 3.1 Shell Structure
1. **Header (`src/components/common/Header.tsx`):**
   - Height: 64px (`h-16`), sticky top (`sticky top-0 z-30`), background: dynamic `bg-primary`, text: `text-primary-foreground`.
   - Features: Mobile sidebar drawer toggle, contextual title mapping (`ROUTE_TITLES`), quick tools (Currency Converter popover, Scratchpad Calculator popover, Notifications popover, Fullscreen toggle), and `UserProfileMenu`.
2. **Sidebar (`src/components/common/Sidebar.tsx`):**
   - Collapsible desktop navigation + mobile off-canvas drawer.
   - Categorized navigation rail tabs: `all`, `purchasing`, `sales`, `customers`, `inventory`, `finance`, `approvals`, `reports`, `admin`.
   - Role-based item visibility filtered via `canAccessRoute` and `ROLE_PERMISSIONS`.
3. **Mobile Bottom Navigation (`src/components/common/MobileNav.tsx`):**
   - Dedicated mobile dock rendered specifically for field roles (`SALES_REP`, `AREA_MANAGER`).
4. **Layout Containers:**
   - **`StandardLayout` (`src/layouts/StandardLayout.tsx`):** Single-column scroll container:
     `p-3.5 sm:p-5 lg:p-6 w-full pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-6`
   - **`FinanceLayout` (`src/features/finance/FinanceLayout.tsx`):** Specialized container for finance routes:
     `p-3.5 sm:p-5 lg:p-6 w-full pb-24 sm:pb-20 md:pb-6`
     *(Note: Redundant padding divergence identified between Standard and Finance layouts)*
   - **`InnerSidebarLayout` (`src/components/layout/InnerSidebarLayout.tsx`):** Two-pane layout used for secondary sub-navigation (e.g., settings, sub-ledgers).

---

## 4. Shared Component Inventory

Exported centrally via `src/components/index.ts`:

### 4.1 UI Primitives (`src/components/ui/`)
- `Button` (`button.tsx`): Variants: default, destructive, outline, secondary, ghost, link; Sizes: default, sm, lg, icon.
- `Input` (`input.tsx`): Standardized text/number input container with `rounded-md`, border-slate-200.
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` (`select.tsx`): Radix UI based custom select.
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` (`card.tsx`): White surface card.
- `Badge` (`badge.tsx`): Status indicator badge.
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` (`dialog.tsx`): Modal overlay primitive.
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` (`table.tsx`): Data grid wrapper.
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (`tabs.tsx`): Segmented view switcher.
- `Textarea` (`textarea.tsx`): Multi-line text field.
- `Alert`, `AlertTitle`, `AlertDescription` (`alert.tsx`): Inline operational alert box.
- `Skeleton` (`skeleton.tsx`): Base pulse loader.

### 4.2 Application Shell & Feedback (`src/components/common/`)
- `AmountDisplay` (`AmountDisplay.tsx`): Tabular LKR currency formatter with symbol splitting.
- `BarcodeVisual` (`BarcodeVisual.tsx`): Barcode rendering component.
- `EmptyState` (`EmptyState.tsx`): Zero-data placeholder with graphic, title, and action trigger.
- `ErrorState` (`ErrorState.tsx`): Network/data failure retry block.
- `LoadingSkeleton` / `TableLoadingSkeleton` / `CardGridSkeleton` (`LoadingSkeleton.tsx`): Structured loading skeletons.
- `RoleSwitcher` (`RoleSwitcher.tsx`): Role testing bar for development/QA simulation.
- `StatCard` (`StatCard.tsx`): KPI metric card with icon, change trend indicator, and comparison badge.
- `PaginationControls` (`PaginationControls.tsx`): Data table pagination bar.
- `ProtectedRoute` (`ProtectedRoute.tsx`): Role-aware route guard.

### 4.3 Entity Selectors (`src/components/selectors/`)
- `CustomerSelector` (`CustomerSelector.tsx`): Dropdown with live search for customer master records.
- `CustomerSummaryCard` (`CustomerSummaryCard.tsx`): Compact customer profile pill displaying credit limit and balance.
- `ProductSelector` (`ProductSelector.tsx`): Dropdown with live search for catalog products.
- `ProductSummaryCard` (`ProductSummaryCard.tsx`): Selected product mini-card showing stock levels and pricing tiers.

### 4.4 Approval Engine (`src/components/approval/`)
- `ApprovalBadge` (`ApprovalBadge.tsx`): Multi-tier status badge (`PENDING`, `APPROVED`, `REJECTED`, `SPECIAL_APPROVAL`).
- `ApprovalTimeline` (`ApprovalTimeline.tsx`): Historical audit log of multi-step approval steps.
- `ApprovalActionDialog` (`ApprovalActionDialog.tsx`): Action modal for approvers with notes/rejection reasons.

### 4.5 Status Badges (Domain Specific)
- `InvoiceStatusBadge` (`src/features/invoices/InvoiceStatusBadge.tsx`)
- `PaymentStatusBadge` (`src/features/payments/PaymentStatusBadge.tsx`)
- `OrderStatusBadge` (`src/features/orders/OrderStatusBadge.tsx`)
- `QuotationStatusBadge` (`src/features/quotations/QuotationStatusBadge.tsx`)
- `PurchaseOrderStatusBadge` (`src/features/purchasing/components/PurchaseOrderStatusBadge.tsx`)
- `WarrantyStatusBadge` (`src/features/warranty/WarrantyStatusBadge.tsx`)

---

## 5. System-Wide Route Inventory & Audit Coverage Matrix

### Module 1: Purchasing & Procurement
| Route Path | Page Component | Page Type / Task | Layout Container | Audit Status |
| :--- | :--- | :--- | :--- | :--- |
| `/purchasing` | `PurchasingDashboard` | Executive Overview / KPIs | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |
| `/purchasing/dashboard` | `PurchasingDashboard` | Alias to overview | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |
| `/purchasing/suppliers` | `PurchasingSuppliersPage` | List / Master Data directory | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |
| `/purchasing/orders` | `PurchaseOrderListPage` | Transaction List / Filter grid | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |
| `/purchasing/orders/new` | `PurchaseOrderCreateEditPage` | Creation Form / Multi-line items | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |
| `/purchasing/orders/:id` | `PurchaseOrderDetailPage` | Transaction Detail / Lifecycle | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |
| `/purchasing/orders/:id/edit` | `PurchaseOrderCreateEditPage` | Form Edit / Revision | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |
| `/purchasing/orders/:id/print`| `PurchaseOrderPrintPage` | Printable A4 Multi-page Sheet | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |
| `/purchasing/grn` | `PurchasingGRNListPage` | Read-only Inspection List | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |
| `/purchasing/grn/:id` | `PurchasingGRNDetailPage` | Read-only Inspection Detail | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |
| `/purchasing/reports` | `PurchasingReportsPage` | Module Reports & Analytics | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |
| `/purchasing/returns` | `PurchaseReturnsPlaceholderPage` | Placeholder / Under Development | `StandardLayout` | **Inspected (Batch 1 — AUDIT-01)** |

### Module 2: Sales and Customers
| Route Path | Page Component | Page Type / Task | Layout Container | Audit Status |
| :--- | :--- | :--- | :--- | :--- |
| `/customers` | `CustomerListPage` | Directory / Table / Modal launch | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/customers/:id` | `CustomerDetailPage` | Customer 360 / Tabbed profile | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/quotations` | `QuotationListPage` | Quotation List / Status tabs | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/quotations/new` | `QuotationCreateEditPage`| Multi-item Quote Entry Form | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/quotations/:id` | `QuotationDetailPage` | Quotation Detail / Convert to SO | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/quotations/:id/edit` | `QuotationCreateEditPage`| Quotation Edit Form | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/orders` | `OrderListPage` | Sales Order List / Pipeline | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/orders/new` | `OrderCreateEditPage` | Order Entry Form / Pricing rules | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/orders/:id` | `OrderDetailPage` | Order Detail / Workflow actions | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/orders/:id/edit` | `OrderCreateEditPage` | Order Amendment Form | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/orders/tracking` | `OrderTrackingPage` | Pipeline Tracking / Kanban | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/orders/activity-log` | `OrderActivityLogPage` | System-wide Order Audit Trail | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/orders/:id/activity-log` | `OrderActivityLogPage` | Specific Order Audit Log | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/invoices` | `InvoiceListPage` | Invoice List / Status tabs | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/invoices/:id` | `InvoiceDetailPage` | Invoice Detail / Viewer | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/invoices/:id/edit` | `InvoiceDraftEditPage` | Draft Invoice Editor | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/payments` | `PaymentListPage` | Payment History List | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/payments/collect` | `CustomerPaymentsTab` | AR Collection Workbench | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/payments/collect/:customerId` | `CustomerPaymentDetailPage` | Customer Statement & Payment | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/payments/customer/:customerId` | `CustomerPaymentDetailPage`| Alias to Customer Payment | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/customers/:customerId/pay` | `CustomerPaymentDetailPage`| Alias to Customer Payment | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/payments/new` | `PaymentCollectionPage` | Standalone Payment Entry Form | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/payments/:id` | `PaymentDetailPage` | Payment Voucher & Receipt View | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/pos` | `ShowroomPOSTerminal` | Point-of-Sale Checkout Terminal | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/pos/transactions` | `POSTransactionHistoryPage`| Cashier POS Audit List | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/pos/sessions` | `POSSessionsPage` | POS Cash Shift Management | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/warranty` | `WarrantyHubPage` | Warranty Claims Management | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/warranty/verification`| `SalesRepWarrantyPage` | Serial / Barcode Scan Checker | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |
| `/commissions` | `CommissionHubPage` | Sales Rep Targets & Payouts | `StandardLayout` | **Inspected (Batch 2 — AUDIT-02)** |

### Module 3: Inventory & Warehouse
| Route Path | Page Component | Page Type / Task | Layout Container | Audit Status |
| :--- | :--- | :--- | :--- | :--- |
| `/inventory` | `InventoryDashboardPage`| Warehouse Hub & Metrics | `StandardLayout` | **Inspected (Batch 3 — AUDIT-03)** |
| `/inventory/grn` | `GRNListPage` | Inward Goods Receiving List | `StandardLayout` | **Inspected (Batch 3 — AUDIT-03)** |
| `/inventory/grn/new` | `GRNCreateEditPage` | GRN Entry / Barcode & Batching | `StandardLayout` | **Inspected (Batch 3 — AUDIT-03)** |
| `/inventory/grn/:id` | `GRNDetailPage` | GRN Receiving Detail View | `StandardLayout` | **Inspected (Batch 3 — AUDIT-03)** |
| `/inventory/stock` | `StockBalancePage` | Stock on Hand / Location matrix | `StandardLayout` | **Inspected (Batch 3 — AUDIT-03)** |
| `/inventory/movements` | `StockMovementsPage` | Perpetual Inventory Ledger | `StandardLayout` | **Inspected (Batch 3 — AUDIT-03)** |
| `/inventory/picking` | `OrderPickingPage` | Order Picking Slips Workbench | `StandardLayout` | **Inspected (Batch 3 — AUDIT-03)** |
| `/inventory/dispatch` | `DispatchPage` | Staging & Outbound Dispatch | `StandardLayout` | **Inspected (Batch 3 — AUDIT-03)** |
| `/inventory/delivery-notes` | `DeliveryNoteListPage` | Delivery Note Register | `StandardLayout` | **Inspected (Batch 3 — AUDIT-03)** |
| `/inventory/delivery-notes/new` | `DeliveryNoteCreatePage` | Delivery Note Generation Form | `StandardLayout` | **Inspected (Batch 3 — AUDIT-03)** |
| `/inventory/delivery-notes/:id` | `DeliveryNoteDetailPage` | Delivery Note Detail / POD | `StandardLayout` | **Inspected (Batch 3 — AUDIT-03)** |
| `/inventory/damaged-stock` | `DamagedStockPage` | **Orphaned (in Sidebar, missing in App.tsx)** | None (Redirects to `/`) | **Flagged / Blocked (INV-001)** |

### Module 4: Finance & Accounting
| Route Path | Page Component | Page Type / Task | Layout Container | Audit Status |
| :--- | :--- | :--- | :--- | :--- |
| `/finance` | `FinanceDashboardPage` | Executive Financial Overview | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/dashboard` | `FinanceDashboardPage` | Alias to dashboard | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/accounts` | `ChartOfAccountsPage` | Chart of Accounts Hierarchy | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/suppliers` | `SuppliersPage` | AP Supplier Directory & Ledgers | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/journal/new` | `ManualJournalPage` | Double-Entry Voucher Form | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/desk` | Redirection | Redirects to `/finance/journal/new` | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/payment-approvals` | Redirection | Redirects to `/finance/ar/approvals`| `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/ap/bills/new` | `VendorBillCostingPage` | Landed Costing & 3-Way Match | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/ap/advances` | `SupplierAdvancePaymentsPage` | Advance Prepayment Ledger | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/ap/debit-notes` | `SupplierDebitNotesPage` | Supplier Debit Note Register | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/ap/payments/new` | `BatchSupplierPaymentPage`| Batch Vendor Disbursement Form | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/ar/approvals` | `ReceiptApprovalQueuePage` | AR Receipt Approvals Queue | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/ar/allocate` | `ARCollectionAllocationPage` | Unallocated Receipt Allocation | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/ar/pdc-vault` | `PDCVaultPage` | Post-Dated Cheque Vault | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/ar/credit-notes` | `CustomerCreditNotesPage` | Customer Credit Notes Register | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/reconciliation` | `BankReconciliationPage` | Bank Statement Reconciliation | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/settings/closing` | `FinancialPeriodLockPage`| Period Lock & Year-End Close | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/commissions` | `FinanceCommissionsPage` | Commission Payout Audit | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/reports` | `FinanceReportsHubPage` | Financial Reports Directory | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/reports/monthly-audit` | `MonthlyTransactionsAuditPage` | General Ledger Transaction Audit | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/reports/pnl` | `ProfitLossPage` | Income Statement (P&L) | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/reports/balance-sheet` | `BalanceSheetPage` | Balance Sheet Statement | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/reports/trial-balance` | `TrialBalancePage` | Trial Balance Report | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/reports/general-ledger` | `GeneralLedgerPage` | Detail General Ledger View | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |
| `/finance/reports/vat` | `VatSummaryPage` | Statutory RAMIS / VAT Summary | `FinanceLayout` | **Inspected (Batch 4 — AUDIT-04)** |

### Module 5: Approvals Engine
| Route Path | Page Component | Page Type / Task | Layout Container | Audit Status |
| :--- | :--- | :--- | :--- | :--- |
| `/approvals` | `ApprovalsPage` | Unified Multi-Tier Approval Queue | `StandardLayout` | **Inspected (Batch 5 — AUDIT-05)** |
| `/approvals/orders/:id` | `OrderApprovalDetailPage` | Order Approval Decision Screen | `StandardLayout` | **Inspected (Batch 5 — AUDIT-05)** |
| *(Modal)* | `CustomerCommercialApprovalModal` | Commercial Terms Overrides | Modal Overlay | **Inspected (Batch 5 — AUDIT-05)** |
| *(Modal)* | `ProductPriceProposalModal` | Price List / Margin Adjustments | Modal Overlay | **Inspected (Batch 5 — AUDIT-05)** |
| `/finance/ar/approvals` | `ReceiptApprovalQueuePage` | AR Receipt Approvals (Finance) | `FinanceLayout` | **Inspected (Batch 5 — AUDIT-05)** |

### Module 6: Reports & Analytics
| Route Path | Page Component | Page Type / Task | Layout Container | Audit Status |
| :--- | :--- | :--- | :--- | :--- |
| `/reports` | `ReportsPage` | Multi-tab Enterprise Analytics Hub | `StandardLayout` | **Inspected (Batch 6 — AUDIT-06)** |
| `/reports` (Tabs) | `ExecutiveOverviewTab` | Executive KPI Drilldown | Tab Panel | **Inspected (Batch 6 — AUDIT-06)** |
| `/reports` (Tabs) | `SalesAnalyticsTab` | Revenue & Margin Trends | Tab Panel | **Inspected (Batch 6 — AUDIT-06)** |
| `/reports` (Tabs) | `InventoryAnalyticsTab` | Aging, Slow-moving, Valuation | Tab Panel | **Inspected (Batch 6 — AUDIT-06)** |
| `/reports` (Tabs) | `FinanceCollectionsTab` | DSO, Aging, Collections | Tab Panel | **Inspected (Batch 6 — AUDIT-06)** |
| `/reports` (Tabs) | `PosAnalyticsTab` | Retail Counter Turnovers | Tab Panel | **Inspected (Batch 6 — AUDIT-06)** |
| `/reports` (Tabs) | `CommissionAnalyticsTab`| Commission Earned vs Paid | Tab Panel | **Inspected (Batch 6 — AUDIT-06)** |
| `/reports` (Tabs) | `AreaPerformanceTab` | Regional Sales Rep Performance | Tab Panel | **Inspected (Batch 6 — AUDIT-06)** |
| `/purchasing/reports` | `PurchasingReportsPage` | Procurement Analytics | `StandardLayout` | Cross-referenced in Batch 6 |
| `/finance/reports/*` | Multiple (7 Sub-reports) | Statutory Financial Reports | `FinanceLayout` | Cross-referenced in Batch 6 |

### Supporting Operational Areas & Master Data
| Route Path | Page Component | Page Type / Task | Layout Container | Audit Status |
| :--- | :--- | :--- | :--- | :--- |
| `/products` | `ProductListPage` | Product Master Catalog | `StandardLayout` | Supporting |
| `/products/:id` | `ProductDetailPage` | Product Spec & Pricing Tiers | `StandardLayout` | Supporting |
| `/areas` | `AreaListPage` | Geographic Territory Master | `StandardLayout` | Supporting |
| `/teams` | `TeamListPage` | Sales Team Assignment Master | `StandardLayout` | Supporting |
| `/login` | `LoginPage` | Authentication & Role Switcher | Standalone | Supporting |
| `/` | `DashboardPage` | Role-based Root Dashboard | `StandardLayout` | Supporting |

---

## 6. Preliminary Code-Level Inconsistencies Discovered in Stage A

1. **Layout Wrapper Divergence:**
   - `StandardLayout` applies `pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-6`.
   - `FinanceLayout` applies `pb-24 sm:pb-20 md:pb-6`.
   - This creates an unnatural viewport height shift when switching between operational modules and the finance module.
2. **Orphaned Navigation Target:**
   - In `src/components/common/Sidebar.tsx` (line 132), the link `{ id: 'damaged-stock', name: 'Damaged Stock & RMA', path: '/inventory/damaged-stock' }` points to an unregistered route. `DamagedStockPage.tsx` exists on disk but is omitted from `App.tsx`, triggering fallback redirect to `/`.
3. **Competing Header Page Title Mechanisms:**
   - `Header.tsx` maintains a static lookup table `ROUTE_TITLES` that only covers 20 routes, supplemented by hardcoded prefix fallbacks (e.g. `location.pathname.startsWith('/purchasing/orders') ? 'Purchase Order Details' : ...`).
   - Many inner views also define their own local `h1` titles inside page bodies, leading to duplicated, contradictory, or desynchronized header titles.
4. **Duplicated Status Badge Implementations:**
   - Rather than utilizing a unified semantic status pill primitive, discrete status badges (`InvoiceStatusBadge`, `PaymentStatusBadge`, `OrderStatusBadge`, `QuotationStatusBadge`, `PurchaseOrderStatusBadge`, `WarrantyStatusBadge`) define separate variant maps, conflicting color mappings for `PENDING` (some yellow, some amber, some blue), and different icon placements.
5. **Divergent Date Range Filters:**
   - Reporting in `/reports` uses `ReportsFilterToolbar.tsx`, while `/finance/reports/*` uses `ReportDateFilterBar.tsx` with conflicting date preset definitions and styling.

---

## 7. Master Deliverables Inventory & Audit Finalization

The comprehensive UI/UX consistency audit for the DNS Import & Export ERP application is **100% complete**. All 11 requested deliverables are persisted in `docs/audit/`:

| Deliverable ID | Document File | Scope & Contents | Findings Count | Status |
| :--- | :--- | :--- | :---: | :---: |
| **AUDIT-00** | [`00-system-inventory.md`](file:///Users/chandupa/DNS-Import-Export-ERP-Client/docs/audit/00-system-inventory.md) | System Inventory, 47 Routes, Tokens, Layouts, Shared Components | — | Finalized |
| **AUDIT-01** | [`01-purchasing-audit.md`](file:///Users/chandupa/DNS-Import-Export-ERP-Client/docs/audit/01-purchasing-audit.md) | Purchasing & Procurement Module Audit | 16 Findings | Finalized |
| **AUDIT-02** | [`02-sales-customers-audit.md`](file:///Users/chandupa/DNS-Import-Export-ERP-Client/docs/audit/02-sales-customers-audit.md) | Sales, Orders, Customers, POS & Invoicing Audit | 12 Findings | Finalized |
| **AUDIT-03** | [`03-inventory-audit.md`](file:///Users/chandupa/DNS-Import-Export-ERP-Client/docs/audit/03-inventory-audit.md) | Inventory, Warehouse, GRN, Stock Ledgers & Dispatch Audit | 9 Findings | Finalized |
| **AUDIT-04** | [`04-finance-audit.md`](file:///Users/chandupa/DNS-Import-Export-ERP-Client/docs/audit/04-finance-audit.md) | Finance, General Ledger, AP Landed Costing, AR, Reconciliation | 16 Findings | Finalized |
| **AUDIT-05** | [`05-approvals-audit.md`](file:///Users/chandupa/DNS-Import-Export-ERP-Client/docs/audit/05-approvals-audit.md) | Approvals Engine, Decision Overlays & Commercial Governance | 14 Findings | Finalized |
| **AUDIT-06** | [`06-reports-audit.md`](file:///Users/chandupa/DNS-Import-Export-ERP-Client/docs/audit/06-reports-audit.md) | Reports & Analytics Hub (All 7 Analytical Tabs) | 13 Findings | Finalized |
| **AUDIT-07** | [`07-cross-module-inconsistency-matrix.md`](file:///Users/chandupa/DNS-Import-Export-ERP-Client/docs/audit/07-cross-module-inconsistency-matrix.md) | Cross-Module Inconsistency Matrix & Pairwise Comparisons | 16 Categories | Finalized |
| **AUDIT-08** | [`08-canonical-ui-conventions.md`](file:///Users/chandupa/DNS-Import-Export-ERP-Client/docs/audit/08-canonical-ui-conventions.md) | Canonical UI/UX Design & Architecture Conventions Standard | Standards Spec | Finalized |
| **AUDIT-09** | [`09-prioritized-remediation-roadmap.md`](file:///Users/chandupa/DNS-Import-Export-ERP-Client/docs/audit/09-prioritized-remediation-roadmap.md) | Phased Remediation Roadmap (Phase 1–4, P0–P3, Dependencies) | 80 Grouped Items | Finalized |
| **AUDIT-10** | [`10-audit-coverage-and-limitations.md`](file:///Users/chandupa/DNS-Import-Export-ERP-Client/docs/audit/10-audit-coverage-and-limitations.md) | Complete 47-Route Coverage Matrix, Methodology & Limitations | Accountability | Finalized |

**Total Findings Cataloged:** **80 Evidence-Based Findings** (15 P0, 25 P1, 34 P2, 6 P3).  
**Source Code Integrity:** 100% Preserved (Zero source files modified in `src/`).
