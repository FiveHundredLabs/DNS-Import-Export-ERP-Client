# DNS ERP — Architecture & Component Dependency Map

**Document ID:** `docs/implementation/02-architecture-and-dependency-map.md`  
**Application Type:** Single Page Application (React 18 + Vite + Tailwind CSS + Lucide React)  

---

## 1. Directory & Layer Organization

```
src/
├── components/          # Shared atomic and domain components
│   ├── common/          # PageHeader, StatusBadge, DocumentActionBar, FormSection, FormField
│   ├── selectors/       # CustomerSelector, SupplierSelector, ProductSelector, SummaryCards
│   ├── ui/              # Canonical primitives (Button, Card, Badge, Dialog, Input, Table)
│   └── approval/        # ApprovalActionDialog, ApprovalTimeline
├── features/            # Business feature domains
│   ├── purchasing/      # POs, Suppliers, Purchasing GRN views, Reports, Returns
│   ├── orders/          # Sales Orders, Tracking, Multi-Invoicing, Order Closures
│   ├── quotations/      # Quotation creation, discount calculation, conversion
│   ├── inventory/       # GRN receiving, Stock balance, Damaged stock, Movements, Dispatch
│   ├── invoices/        # Sales Invoices, PDF print, AR posting
│   ├── payments/        # Collections, Receipts, 24h collections due view
│   ├── pos/             # Showroom Point of Sale terminal, Shifts, Receipt modal
│   ├── finance/         # Chart of Accounts, Cash Book, Journal, AP/AR ledgers
│   ├── approvals/       # Multi-tier approval dashboard and detail routing
│   └── reports/         # Enterprise analytics and module dashboards
├── services/            # Mock/Live repositories, state stores & business operations
│   ├── GRNService.ts    # BR-01 PO validation, stock updates
│   ├── InvoiceService.ts# BR-04 Multi-invoicing, line item remaining balances
│   ├── OrderService.ts  # BR-05 Order closures, credit evaluation
│   ├── POSService.ts    # BR-03 POS transactions, supervisor discount keys
│   ├── PaymentService.ts# BR-06 Unified payment collections
│   └── InventoryService.ts # BR-10 Damaged stock recovery, batches
├── rules/               # Pure business domain rules & validation engines
│   ├── permissions.ts   # Role-based route & action authorization
│   ├── discountRules.ts # Multi-tier discount thresholds & approver resolution
│   ├── posRules.ts      # POS checkout and discount limit validation
│   └── creditRules.ts   # Customer credit limit & days breach detection
└── types/               # TypeScript interfaces & domain models
```

---

## 2. Key Data Flow and Entity Links

1. **Purchasing to Receiving:**
   `PurchaseOrder (Approved)` ──(1:N)──> `GoodsReceivedNote` ──> `BatchInventory` & `StockBalance`
   *Rule: No GRN without an approved Purchase Order (`BR-01`).*

2. **Sales to Invoicing to Dispatch:**
   `SalesOrder (Approved)` ──(1:N)──> `Invoice (Draft/Issued)` ──(1:N)──> `DeliveryNote (Dispatched)`
   *Rule: Order tracks cumulative `invoicedQuantity` per line item (`BR-04`).*

3. **Invoicing to Collection:**
   `Invoice (Issued)` ──(1:N)──> `PaymentCollection (Receipt)` ──> `GeneralLedger` (AR credit, Cash/Bank debit)
   *Rule: Invoice-wise or complete collection with real-time balance reduction (`BR-06`).*

4. **Quarantine to Sellable Inventory:**
   `DamagedStock (Quarantine)` ──(Recovered)──> `StockMovement (RECOVERY)` ──> `StockBalance (Available)`
   *Rule: Audited recovery with authorized Stock Manager role (`BR-10`).*
