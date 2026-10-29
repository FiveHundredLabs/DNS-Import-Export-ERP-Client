# Master System-Wide Functional Requirements Traceability Matrix

**Project:** DNS Import & Export ERP  
**Document ID:** `docs/implementation/00-requirements-traceability.md`  
**Execution Blueprint:** Functional Gap Reconciliation & Role Capability Enforcement  
**Baseline Date:** 2026-10-29  

---

## 1. Traceability Index by Functional Domain

| Requirement ID | Domain | Description | Canonical Target Component / Service | Implementation Status |
|---|---|---|---|---|
| **BR-01** | Inventory / Purchasing | Mandatory Purchase Order linkage on all new GRN creation and receiving paths. No unlinked GRNs allowed. | `GRNCreateEditPage.tsx`, `GRNService.ts` | **In Progress (Batch 1)** |
| **BR-02** | Inventory / Receiving | Official Print-ready GRN (A4 format) with linked PO, batch & serial logs, Stock Manager & Finance sign-off blocks. | `PrintableGRN.tsx`, `GRNDetailPage.tsx`, `PurchasingGRNDetailPage.tsx` | **In Progress (Batch 1)** |
| **BR-03** | Retail POS | Server-validated POS discount authorization key workflow for cashier discounts exceeding standard 5% limit. | `ShowroomPOSTerminal.tsx`, `posRules.ts`, `POSService.ts` | **Pending (Batch 3)** |
| **BR-04** | Sales & Invoicing | Multiple sales invoices permitted against a single Sales Order with line-item invoiced vs remaining quantity tracking. | `InvoiceService.ts`, `OrderCreateEditPage.tsx`, `OrderDetailPage.tsx` | **Pending (Batch 2)** |
| **BR-05** | Sales & Orders | Full and partial Sales Order closure with non-destructive audit preservation. | `orderService.ts`, `OrderDetailPage.tsx` | **Pending (Batch 2)** |
| **BR-06** | Finance / Collections | Unified Payment Collection interface supporting invoice-wise breakdown and one-click complete collection for selected invoice. | `PaymentCollectionPage.tsx`, `PaymentService.ts` | **Pending (Batch 4)** |
| **BR-07** | Sales Operations | Sales Representative next-24-hours collections due view with portfolio filtering and reminder action. | `CustomerCollectionsPage.tsx`, `CollectionService.ts` | **Pending (Batch 5)** |
| **BR-08** | Purchasing / AP | Supplier returns create and link an Accounts Payable Debit Note with double-entry ledger impact. | `SupplierReturnsPage.tsx`, `SupplierDebitNotesPage.tsx`, `FinanceAPService.ts` | **Pending (Batch 6)** |
| **BR-09** | Finance / Banking | Cash Book workflow integrated through Payment Vouchers linked directly to Account 1010 (Cash in Hand). | `CashBookPage.tsx`, `PaymentVoucherModal.tsx`, `MockFinanceRepository.ts` | **Pending (Batch 7)** |
| **BR-10** | Inventory Control | Traceable damaged-stock recovery flow returning inspected items into usable inventory. | `DamagedStockPage.tsx`, `DamagedStockRecoveryModal.tsx`, `InventoryService.ts` | **Pending (Batch 8)** |

---

## 2. Role-Based Traceability Matrix

### 2.1 Sales Representative (`SALES_REP`)
- `SR-01`: Quotation creation and modification within authorized discount thresholds (<= 5%).
- `SR-02`: Enterprise Sales Order entry with customer credit checking and stock availability warning.
- `SR-03`: Customer collection logging (Cash, Cheque, Bank Transfer) with receipt generation.
- `SR-04`: 24-hour collections due dashboard view for assigned dealer portfolio.
- `SR-05`: Mobile-optimized warranty claim submission with serial barcode scan.
- `SR-06`: Read-only view of commission accruals and tier status.
- `SR-07`: Strict boundary enforcement: No access to unassigned customer accounts, ledger journals, purchasing, or stock adjustments.

### 2.2 Area Manager (`AREA_MANAGER`)
- `AM-01`: Approval review of Sales Representative orders exceeding standard discount thresholds (up to 10%).
- `AM-02`: Territory performance tracking and aggregate sales vs quota reporting.
- `AM-03`: Customer portfolio reassignment and territory sales rep management.
- `AM-04`: Credit limit increase endorsement to Sales Manager / Finance Director.

### 2.3 Sales Manager (`SALES_MANAGER`)
- `SM-01`: Commercial approval for discount requests up to 15% and overdue balance credit overrides.
- `SM-02`: Multi-invoice dispatch coordination and partial order delivery sign-off.
- `SM-03`: Full and partial Sales Order cancellation/closure with recorded reason codes.
- `SM-04`: Sales representative commission structure administration and period sign-off.
- `SM-05`: Territory performance and quarterly revenue forecasting.

### 2.4 Purchasing Officer (`PURCHASING_OFFICER`)
- `PO-01`: Purchase Order creation against approved suppliers with supplier catalog pricing.
- `PO-02`: PO status tracking from Draft -> Submitted -> Approved -> Partially Received -> Completed.
- `PO-03`: Read-only inspection of warehouse Goods Received Notes linked to created POs.
- `PO-04`: Supplier return request drafting for defective or rejected inbound shipments.

### 2.5 Purchasing Manager (`PURCHASING_MANAGER`)
- `PM-01`: Purchase Order approval for procurement budgets within authorized threshold.
- `PM-02`: Supplier return authorization and AP Debit Note issuance coordination.
- `PM-03`: Supplier performance, on-time delivery rates, and vendor credit agreement reviews.

### 2.6 Stock Keeper (`STOCK_KEEPER`)
- `SK-01`: Mandatory Purchase Order selection before generating Goods Received Notes.
- `SK-02`: Line-by-line item verification (received vs damaged vs rejected) and batch/serial logging.
- `SK-03`: Print official A4 Goods Received Note for warehouse physical filing.
- `SK-04`: Warehouse dispatch picking and Delivery Note generation against invoiced orders.
- `SK-05`: Showroom POS terminal operation (retail checkout, shift management, barcode scanning).
- `SK-06`: Damaged stock logging and physical quarantine staging.
- `SK-07`: Strict boundary enforcement: No pricing edits, no invoice cancellation, no GL posting.

### 2.7 Stock Manager (`STOCK_MANAGER`)
- `ST-01`: Inbound Goods Received Note physical audit and quarantine clearance.
- `ST-02`: Damaged-stock recovery authorization: move recovered stock from quarantine back to active sellable inventory.
- `ST-03`: Inter-warehouse stock transfers and annual physical inventory cycle count reconciliation.

### 2.8 Manager (`MANAGER`)
- `MG-01`: High-tier discount approvals (>15%) and special credit terms overrides.
- `MG-02`: Payment Voucher and Cash Book disbursement approval.
- `MG-03`: Cross-module operational monitoring (Sales, Warehouse, Procurement, Collections).
- `MG-04`: Escalated warranty claims and write-off reviews.

### 2.9 Director (`DIRECTOR`)
- `DR-01`: Executive approval of large procurement POs and capital expenditure vouchers.
- `DR-02`: Full write-off and irreversible stock loss approval.
- `DR-03`: Executive financial statements (Profit & Loss, Balance Sheet, Cash Flow).
- `DR-04`: Enterprise user management, role assignments, and governance policy overrides.
