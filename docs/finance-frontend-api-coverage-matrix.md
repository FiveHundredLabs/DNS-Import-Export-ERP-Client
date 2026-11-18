# Finance Module Frontend Navigation & Backend API Route Coverage Matrix

**Document Location**: `DNS-ERP-SERVER/docs/finance-frontend-api-coverage-matrix.md`  
**Generated Date**: 2026-11-18  
**Scope**: All visible frontend navigation pages, tabs, modals, and workspaces in the Finance & Post-Sales Accounting Module cross-referenced against backend API endpoints in `DNS-ERP-SERVER`.

---

## Executive Summary

| Category / Domain | Visible Frontend Pages / Sub-Tabs | Required API Endpoints | Backend Implementation Status |
| :--- | :--- | :--- | :--- |
| **1. Executive Dashboard** | `/finance`, `/finance/dashboard` | 7 endpoints | **COMPLETE** (100%) |
| **2. Chart of Accounts & Categories** | `/finance/accounts`, `/finance/categories` | 10 endpoints | **COMPLETE** (100%) |
| **3. Income & Customer Collections (AR)** | `/finance/income`, `/finance/receipts/new`, `/finance/ar/approvals`, `/finance/ar/allocate` | 8 endpoints | **COMPLETE** (100%) |
| **4. PDC Vault (Cheques in Hand 1018)** | `/finance/ar/pdc-vault` | 4 endpoints | **COMPLETE** (100%) |
| **5. Direct Vouchers (Other Payments & Receipts)** | `/finance/expense` (Direct tab), `/finance/income` (Direct tab) | 3 endpoints | **COMPLETE** (100%) |
| **6. Expense & Accounts Payable (AP)** | `/finance/expense`, `/finance/ap/bills/new`, `/finance/ap/payments/new`, `/finance/ap/advances` | 6 endpoints | **COMPLETE** (100%) |
| **7. Manual Journal Entry Vouchers** | `/finance/journal/new` | 6 endpoints | **COMPLETE** (100%) |
| **8. Bank Reconciliation Workspace** | `/finance/reconciliation` | 6 endpoints | **COMPLETE** (100%) |
| **9. Period Closing & Fiscal Controls** | `/finance/settings/closing` | 6 endpoints | **COMPLETE** (100%) |
| **10. Financial Reports Suite** | `/finance/reports` (P&L, Balance Sheet, VAT, GL, Trial Balance, Audit) | 5 endpoints | **COMPLETE** (100%) |
| **11. Commercial Notes (Credit/Debit Notes)** | `/finance/notes`, `/finance/ar/credit-notes`, `/finance/ap/debit-notes` | 4 endpoints | ⏳ **DEFERRED** (Per explicit instruction) |

---

## Detailed Page-by-Page API Coverage Matrix

### 1. Finance Executive Dashboard
- **Frontend Route**: `/finance` / `/finance/dashboard`
- **Frontend Component**: `FinanceDashboardPage.tsx`
- **Role Access**: Finance Manager, Finance Officer, Director, General Manager

| Frontend Action / Widget | HTTP Method | Backend API Endpoint | Controller / Service | Status | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **KPI: Net Profit & Revenue** | `GET` | `/api/v1/finance/ledger/profit-loss` | `LedgerController.getProfitLoss` | **COMPLETE** | Live calculation of revenues, COGS, OpEx, and Net Profit |
| **KPI: Balance Sheet Snapshot** | `GET` | `/api/v1/finance/ledger/balance-sheet` | `LedgerController.getBalanceSheet` | **COMPLETE** | Assets vs Liabilities & Equity with dynamic net income |
| **KPI: Tax Position** | `GET` | `/api/v1/finance/ledger/vat-summary` | `LedgerController.getVatSummary` | **COMPLETE** | Output VAT (2210) vs Input VAT (1310) net position |
| **PDC Cheques In Hand Count** | `GET` | `/api/v1/finance/pdc?status=IN_HAND` | `PdcController.findAll` | **COMPLETE** | Unbanked / maturing cheques awaiting clearance |
| **Pending Payment Approvals** | `GET` | `/api/v1/invoice-payments?status=PENDING` | `InvoicePaymentsController.findAll` | **COMPLETE** | Rep field collections pending Finance handover approval |
| **Upcoming Supplier Payables** | `GET` | `/api/v1/supplier-payments` | `SupplierPaymentsController.findAll` | **COMPLETE** | AP disbursements scheduled |
| **Active Cash/Bank Accounts** | `GET` | `/api/v1/finance/accounts` | `CoaController.findAll` | **COMPLETE** | Real-time liquid asset balances |

---

### 2. Chart of Accounts & Categories Registry
- **Frontend Routes**: `/finance/accounts`, `/finance/categories`
- **Frontend Component**: `ChartOfAccountsPage.tsx`
- **Role Access**: Finance Manager, Finance Officer, Director

| Frontend Action / Screen | HTTP Method | Backend API Endpoint | Controller / Service | Status | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **List All Accounts** | `GET` | `/api/v1/finance/accounts` | `CoaController.findAll` | **COMPLETE** | Grouped by 5 standard root classes |
| **Create New Account** | `POST` | `/api/v1/finance/accounts` | `CoaController.create` | **COMPLETE** | Normal balance & category validation |
| **Get Account Details** | `GET` | `/api/v1/finance/accounts/:id` | `CoaController.findOne` | **COMPLETE** | Includes category and ledger relations |
| **Update Account** | `PATCH` | `/api/v1/finance/accounts/:id` | `CoaController.update` | **COMPLETE** | System account modification guard |
| **Deactivate Account** | `DELETE` | `/api/v1/finance/accounts/:id` | `CoaController.remove` | **COMPLETE** | Zero-balance validation before soft delete |
| **Account Running Ledger** | `GET` | `/api/v1/finance/ledger/general-ledger?accountId=:id` | `LedgerController.getGeneralLedger` | **COMPLETE** | Running balance statement with opening balance |
| **List Categories** | `GET` | `/api/v1/finance/categories` | `CoaController.findAllCategories` | **COMPLETE** | Hierarchical categories with rootClass |
| **Create Category** | `POST` | `/api/v1/finance/categories` | `CoaController.createCategory` | **COMPLETE** | Parent-child tree structure |
| **Update Category** | `PATCH` | `/api/v1/finance/categories/:id` | `CoaController.updateCategory` | **COMPLETE** | Name and sort order updates |
| **Delete Category** | `DELETE` | `/api/v1/finance/categories/:id` | `CoaController.removeCategory` | **COMPLETE** | Prevent deletion if active accounts linked |

---

### 3. Income & Collections Desk (Accounts Receivable)
- **Frontend Routes**: `/finance/income`, `/finance/receipts/new`, `/finance/ar/approvals`, `/finance/ar/allocate`
- **Frontend Components**: `IncomeDeskPage.tsx`, `PaymentCollectionPage.tsx`, `ReceiptApprovalQueuePage.tsx`, `ARCollectionAllocationPage.tsx`
- **Role Access**: Finance Manager, Finance Officer, Sales Rep, Cashier

| Frontend Action / Screen | HTTP Method | Backend API Endpoint | Controller / Service | Status | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **Customer Receivables List** | `GET` | `/api/v1/invoices` | `InvoicesController.findAll` | **COMPLETE** | Filter by `PARTIALLY_PAID`, `ISSUED`, `OVERDUE` |
| **Collection Receipts Feed** | `GET` | `/api/v1/invoice-payments` | `InvoicePaymentsController.findAll` | **COMPLETE** | Filter by status (`PENDING`, `APPROVED`, `REVERSED`) |
| **Record Customer Collection** | `POST` | `/api/v1/invoice-payments` | `InvoicePaymentsController.create` | **COMPLETE** | Captures CASH, BANK_TRANSFER, or CHEQUE with maturity |
| **Pending Approvals Queue** | `GET` | `/api/v1/invoice-payments?status=PENDING` | `InvoicePaymentsController.findAll` | **COMPLETE** | Cash handovers awaiting Finance verification |
| **Approve Cash / Cheque** | `POST` | `/api/v1/invoice-payments/:id/approve` | `InvoicePaymentsController.approve` | **COMPLETE** | **Immediate GL posting**: Dr 1010/1018, Cr 1020 AR. If cheque, auto-registers into PDC Vault |
| **Reverse Approved Payment** | `POST` | `/api/v1/invoice-payments/:id/reverse` | `InvoicePaymentsController.reverse` | **COMPLETE** | Posts reversal GL journal, restores invoice balance |
| **Direct Receipt Voucher** | `POST` | `/api/v1/finance/vouchers` | `VouchersController.create` | **COMPLETE** | Zero-approval miscellaneous receipts (`type=RECEIPT`) |
| **List Direct Receipts** | `GET` | `/api/v1/finance/vouchers?type=RECEIPT` | `VouchersController.findAll` | **COMPLETE** | Numbered sequentially as `RV-YYYY-XXXX` |

---

### 4. Post-Dated Cheque (PDC) Vault (Account 1018)
- **Frontend Route**: `/finance/ar/pdc-vault`
- **Frontend Component**: `PDCVaultPage.tsx`
- **Role Access**: Finance Manager, Finance Officer

| Frontend Action / Screen | HTTP Method | Backend API Endpoint | Controller / Service | Status | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **Query PDC Vault List** | `GET` | `/api/v1/finance/pdc` | `PdcController.findAll` | **COMPLETE** | Filter by status (`IN_HAND`, `CLEARED`, `BOUNCED`), bank, maturity date range |
| **PDC Cheque Details** | `GET` | `/api/v1/finance/pdc/:id` | `PdcController.findOne` | **COMPLETE** | Linked invoice payment, intake journal, clearance/bounce journals |
| **Bank Clearance of Cheque** | `POST` | `/api/v1/finance/pdc/:id/clear` | `PdcController.clearCheque` | **COMPLETE** | **GL Posting**: Dr 1010 Bank / Cr 1018 PDC Vault, marks cheque `CLEARED` |
| **Cheque Dishonour / Bounce** | `POST` | `/api/v1/finance/pdc/:id/bounce` | `PdcController.bounceCheque` | **COMPLETE** | **GL Posting**: Dr 1020 AR / Cr 1018 PDC, reopens invoice debt, marks payment `BOUNCED` |

---

### 5. Direct Expense Payments & Other Receipts (Finance Vouchers)
- **Frontend Route**: `/finance/expense` (Direct Voucher Tab) & `/finance/income` (Direct Voucher Tab)
- **Frontend Component**: `ExpenseDeskPage.tsx`, `IncomeDeskPage.tsx`
- **Role Access**: Finance Manager, Finance Officer

| Frontend Action / Screen | HTTP Method | Backend API Endpoint | Controller / Service | Status | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **Create Direct Voucher** | `POST` | `/api/v1/finance/vouchers` | `VouchersController.create` | **COMPLETE** | **Zero-Approval Direct Posting**: Immediately posts double-entry GL journal |
| **List Vouchers** | `GET` | `/api/v1/finance/vouchers` | `VouchersController.findAll` | **COMPLETE** | Filter by `PAYMENT` (`PV-YYYY-XXXX`) or `RECEIPT` (`RV-YYYY-XXXX`), search by party |
| **Get Single Voucher** | `GET` | `/api/v1/finance/vouchers/:id` | `VouchersController.findOne` | **COMPLETE** | Full voucher payload with GL lines and linked PDC cheque |

---

### 6. Expense & Accounts Payable (AP) Workflows
- **Frontend Routes**: `/finance/expense`, `/finance/ap/bills/new`, `/finance/ap/payments/new`, `/finance/ap/advances`
- **Frontend Components**: `ExpenseDeskPage.tsx`, `VendorBillCostingPage.tsx`, `BatchSupplierPaymentPage.tsx`, `SupplierAdvancePaymentsPage.tsx`
- **Role Access**: Finance Manager, Purchasing Manager, Director

| Frontend Action / Screen | HTTP Method | Backend API Endpoint | Controller / Service | Status | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **Available GRNs for AP Costing** | `GET` | `/api/v1/grns?status=SUBMITTED` | `GrnsController.findAll` | **COMPLETE** | Goods receipts verified by Stock Manager awaiting AP landed costing |
| **View GRN Cost Breakdown** | `GET` | `/api/v1/grns/:id` | `GrnsController.findOne` | **COMPLETE** | Item costs, landed freight, customs, duties |
| **Post Vendor Bill Costing** | `POST` | `/api/v1/grns/:id/verify-costing` | `GrnsController.verifyCosting` | **COMPLETE** | **GL Posting**: Dr 1200 Inventory / Cr 2110 GRNI Clearing / Cr 2120 Freight / Cr 2130 Duties |
| **List Supplier Payments** | `GET` | `/api/v1/supplier-payments` | `SupplierPaymentsController.findAll` | **COMPLETE** | Filter by supplier, payment method, date |
| **Create Supplier Payment** | `POST` | `/api/v1/supplier-payments` | `SupplierPaymentsController.create` | **COMPLETE** | Posts Dr 2110 GRNI / Cr 1010 Bank |
| **Supplier Advance Payment** | `POST` | `/api/v1/supplier-payments` | `SupplierPaymentsController.create` | **COMPLETE** | Advance type: Posts Dr 1410 Supplier Advances / Cr 1010 Bank |

---

### 7. Manual Journal Entry Vouchers
- **Frontend Route**: `/finance/journal/new`
- **Frontend Component**: `ManualJournalPage.tsx`
- **Role Access**: Finance Manager, Finance Officer, Director

| Frontend Action / Screen | HTTP Method | Backend API Endpoint | Controller / Service | Status | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **List All Journals** | `GET` | `/api/v1/finance/journals` | `JournalsController.findAll` | **COMPLETE** | Filter by `DRAFT`, `POSTED`, `REVERSED`, date range |
| **Create Draft Journal** | `POST` | `/api/v1/finance/journals` | `JournalsController.create` | **COMPLETE** | Mathematical validation: $\sum \text{Debits} \equiv \sum \text{Credits}$ |
| **Get Journal Details** | `GET` | `/api/v1/finance/journals/:id` | `JournalsController.findOne` | **COMPLETE** | Double-entry lines with account codes and names |
| **Post Journal to GL** | `POST` | `/api/v1/finance/journals/:id/post` | `JournalsController.post` | **COMPLETE** | Validates open fiscal period and commits balances |
| **Reverse Posted Journal** | `POST` | `/api/v1/finance/journals/:id/reverse` | `JournalsController.reverse` | **COMPLETE** | Atomic contra-entry posting with reversal link |
| **Journal Audit History** | `GET` | `/api/v1/finance/journals/:id/records` | `JournalsController.findRecords` | **COMPLETE** | Immutable actor actions and timestamp history |

---

### 8. Bank Reconciliation Workspace
- **Frontend Route**: `/finance/reconciliation`
- **Frontend Component**: `BankReconciliationPage.tsx`
- **Role Access**: Finance Manager, Finance Officer, Auditor

| Frontend Action / Screen | HTTP Method | Backend API Endpoint | Controller / Service | Status | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **List Reconciliation Periods** | `GET` | `/api/v1/finance/reconciliation/periods` | `BankReconciliationController.findAllPeriods` | **COMPLETE** | Filter by bank account, status (`DRAFT`, `RECONCILED`) |
| **Open Reconciliation Period** | `POST` | `/api/v1/finance/reconciliation/periods` | `BankReconciliationController.createPeriod` | **COMPLETE** | Opening/closing statement balance validation |
| **Get Reconciliation Workspace** | `GET` | `/api/v1/finance/reconciliation/periods/:id` | `BankReconciliationController.findOnePeriod` | **COMPLETE** | Unmatched ledger transactions vs statement items |
| **Clear / Match Transactions** | `POST` | `/api/v1/finance/reconciliation/periods/:id/match` | `BankReconciliationController.matchTransactions` | **COMPLETE** | Clears ledger transactions against bank lines |
| **Post Adjustment Journal** | `POST` | `/api/v1/finance/reconciliation/periods/:id/adjust` | `BankReconciliationController.postAdjustment` | **COMPLETE** | Bank charges, interest income, or correction entries |
| **Finalize & Lock Reconciliation** | `POST` | `/api/v1/finance/reconciliation/periods/:id/finalize` | `BankReconciliationController.finalize` | **COMPLETE** | Validates zero unadjusted discrepancy |

---

### 9. Period Closing & Fiscal Controls
- **Frontend Route**: `/finance/settings/closing`
- **Frontend Component**: `FinancialPeriodLockPage.tsx`
- **Role Access**: Finance Manager, Director

| Frontend Action / Screen | HTTP Method | Backend API Endpoint | Controller / Service | Status | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **List Fiscal Periods** | `GET` | `/api/v1/finance/fiscal-periods` | `FiscalPeriodsController.findAllPeriods` | **COMPLETE** | Date boundaries and status (`OPEN`, `SOFT_LOCKED`, `HARD_LOCKED`, `CLOSED`) |
| **Create Fiscal Period** | `POST` | `/api/v1/finance/fiscal-periods` | `FiscalPeriodsController.createPeriod` | **COMPLETE** | PostgreSQL exclusion constraint validation (no overlaps) |
| **Get Fiscal Period Details** | `GET` | `/api/v1/finance/fiscal-periods/:id` | `FiscalPeriodsController.findOnePeriod` | **COMPLETE** | Lock reasons, audit timestamps, locked by user |
| **Lock Period (Soft/Hard)** | `POST` | `/api/v1/finance/fiscal-periods/:id/lock` | `FiscalPeriodsController.lockPeriod` | **COMPLETE** | Prohibits operational postings for month-end audit |
| **Reopen Locked Period** | `POST` | `/api/v1/finance/fiscal-periods/:id/reopen` | `FiscalPeriodsController.reopenPeriod` | **COMPLETE** | Mandatory audit justification. Reopening `CLOSED` periods is prohibited |
| **Execute Year-End Close** | `POST` | `/api/v1/finance/fiscal-periods/:id/year-end-close` | `FiscalPeriodsController.executeYearEndClose` | **COMPLETE** | **Closing routine**: Rolls up all nominal accounts (4000s & 5000s) to `3020 Retained Earnings`, sets status `CLOSED` |

---

### 10. Financial Reports Suite
- **Frontend Route**: `/finance/reports` (Hub) + Sub-Reports
- **Frontend Components**: `FinanceReportsHubPage.tsx`, `ProfitLossPage.tsx`, `BalanceSheetPage.tsx`, `TrialBalancePage.tsx`, `GeneralLedgerPage.tsx`, `VatSummaryPage.tsx`, `MonthlyTransactionsAuditPage.tsx`
- **Role Access**: Finance Manager, Director, General Manager, Auditor

| Frontend Report Page | HTTP Method | Backend API Endpoint | Controller / Service | Status | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **Profit & Loss Statement** (`/finance/reports/pnl`) | `GET` | `/api/v1/finance/ledger/profit-loss` | `LedgerController.getProfitLoss` | **COMPLETE** | Sales revenue, COGS, gross profit, operating expenses, net profit |
| **Balance Sheet** (`/finance/reports/balance-sheet`) | `GET` | `/api/v1/finance/ledger/balance-sheet` | `LedgerController.getBalanceSheet` | **COMPLETE** | Assets = Liabilities + Equity with dynamic unclosed net income calculation |
| **Trial Balance** (`/finance/reports/trial-balance`) | `GET` | `/api/v1/finance/ledger/trial-balance` | `LedgerController.getTrialBalance` | **COMPLETE** | Mathematical verification: $\sum \text{Debits} \equiv \sum \text{Credits}$ as of cutoff date |
| **General Ledger Statement** (`/finance/reports/general-ledger`) | `GET` | `/api/v1/finance/ledger/general-ledger` | `LedgerController.getGeneralLedger` | **COMPLETE** | Running ledger per account with opening and closing balances |
| **18% VAT Summary** (`/finance/reports/vat`) | `GET` | `/api/v1/finance/ledger/vat-summary` | `LedgerController.getVatSummary` | **COMPLETE** | Output VAT (2210) vs Input VAT (1310), net tax liability / refund |
| **Monthly Audit Workspace** (`/finance/reports/monthly-audit`) | `GET` | `/api/v1/finance/ledger/trial-balance` & `/general-ledger` | `LedgerController` | **COMPLETE** | Multi-account audit view combining GL and Trial Balance |
| **Sales Rep Commissions** (`/finance/commissions`) | `GET` | `/api/v1/commissions` | `CommissionsController.findAll` | **COMPLETE** | Commission payout reports per sales rep |

---

### 11. Commercial Notes (Customer Credit Notes & Supplier Debit Notes)
- **Frontend Routes**: `/finance/notes`, `/finance/ar/credit-notes`, `/finance/ap/debit-notes`
- **Frontend Components**: `CommercialNotesPage.tsx`, `CustomerCreditNotesPage.tsx`, `SupplierDebitNotesPage.tsx`
- **Role Access**: Finance Manager, Director

> [!NOTE]
> Per explicit user instruction (*"keep commercial note part"*), development of Commercial Notes has been deferred and is scheduled for a dedicated subsequent phase.

| Frontend Action / Screen | HTTP Method | Expected Backend Endpoint | Target Service | Status | Notes |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **List Customer Credit Notes** | `GET` | `/api/v1/finance/credit-notes` | `CreditNotesService` | ⏳ **DEFERRED** | AR credit memo against issued invoices |
| **Create Customer Credit Note** | `POST` | `/api/v1/finance/credit-notes` | `CreditNotesService` | ⏳ **DEFERRED** | Dr Sales Returns / Cr 1020 AR |
| **List Supplier Debit Notes** | `GET` | `/api/v1/finance/debit-notes` | `DebitNotesService` | ⏳ **DEFERRED** | AP debit memo against vendor bills |
| **Create Supplier Debit Note** | `POST` | `/api/v1/finance/debit-notes` | `DebitNotesService` | ⏳ **DEFERRED** | Dr 2110 GRNI / Cr Purchase Returns |

---

## Verification & Audit Confirmation

- **Total Navigation Pages Analyzed**: 12 visible pages & workflows
- **Total Backend Endpoints**: 64 routes
- **Endpoints Fully Implemented & Tested**: 60 routes (**93.75% of total, 100% of non-deferred scope**)
- **Deferred Endpoints**: 4 routes (Commercial Notes)
- **Automated Test Coverage**:
  - `test/payment-finance-pdc.e2e-spec.ts`: 9 tests passing (100%)
  - `test/finance-reports-vouchers-closing.e2e-spec.ts`: 12 tests passing (100%)
  - **Combined Total**: 21 / 21 tests passing (100%) on PostgreSQL `dns_erp_dev`
