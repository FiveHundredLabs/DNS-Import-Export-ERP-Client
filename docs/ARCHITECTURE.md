# Enterprise Frontend Architecture

## 1. System Vision
The Distribution ERP frontend is engineered as a professional, type-safe enterprise single-page application (SPA) prepared for seamless integration with a future NestJS + PostgreSQL backend without requiring UI rewrites.

## 2. Layered Architecture
```text
┌────────────────────────────────────────────────────────┐
│                      UI Layer                          │
│   React Pages, Components, Shadcn/ui, Modals, Forms    │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 Domain Hooks Layer                     │
│    useProducts, useCustomers, useAuth, useApproval     │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 Business Rules Layer                   │
│  discountRules, creditRules, approvalRules, orderRules │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                    Service Layer                       │
│    ProductService, CustomerService, ApprovalService    │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│               Repository Interface Layer               │
│          IProductRepository, ICustomerRepository       │
└──────────────────────────┬─────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
┌────────────────────────┐   ┌───────────────────────────┐
│ Mock Repository (Now)  │   │ NestJS HTTP Client (Later)│
│ In-memory typed store  │   │ Axios / Fetch REST API    │
└────────────────────────┘   └───────────────────────────┘
```

## 3. Directory Layout
```text
src/
  app/                    # App root, providers, router configuration
  components/
    ui/                   # Reusable atomic UI (button, input, dialog, card, badge, table)
    common/               # Shared compound components (Header, Sidebar, StatCard, EmptyState)
    data-table/           # Generalized enterprise data table with search, filter, pagination
    approval/             # ApprovalTimeline, ApprovalBadge, ApprovalActionDialog
  features/
    auth/                 # Login, session state, permissions
    dashboard/            # Role-specific dashboard views (Director, Manager, Rep, etc.)
    products/             # Single Product Master (list, detail, create, edit, pricing)
    customers/            # Single Customer Master (list, detail, create, commercial terms)
    quotations/           # Quotation generation, approval, and conversion
    sales-orders/         # Standard vs Special Sales Orders and tracking
    inventory/            # Stock balances, movements, GRN, picking, dispatch
    invoices/             # Invoice rendering, PDF snapshot, WhatsApp sharing
    payments/             # Payment collection, receipt printing, Finance approval
    pos/                  # Showroom point of sale, barcode search, cash session
    finance/              # Expenses, petty cash running balance, statements
    commissions/          # Sales targets, achievement tiers, rep payouts
    warranty/             # Warranty records, shop follow-ups, claims
    reports/              # Multi-dimensional analytics and charts
    audit/                # Searchable audit logs
  hooks/                  # Custom React hooks
  repositories/           # Repository interfaces and mock implementations
  services/               # Domain service orchestrators
  rules/                  # Centralized business logic pure functions
  types/                  # Central TypeScript domain models, DTOs, and enums
  mock/                   # Realistic enterprise seed datasets
  utils/                  # Formatting, helpers, date manipulation
```

## 4. Master Data Single-Source-of-Truth
The application strictly treats Product Master and Customer Master as singular authoritative entities. All downstream operations (orders, picking, invoices, showroom POS, warranty claims, payments) consume references to these records. Historical documents store immutable transaction snapshots to prevent retroactive data corruption upon master updates.
