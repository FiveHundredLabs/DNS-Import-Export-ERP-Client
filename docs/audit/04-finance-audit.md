# Module Audit: Finance & Accounting (Phase 1 Executive Master)

**Audit Target:** `src/features/finance/`  
**Inspected Routes:** 22 active routes, 2 redirect/legacy routes (`/finance/desk`, `/finance/payment-approvals`), 23 primary page & component files  
**Status:** Audit Completed  
**Finding Count:** 16 Findings (`FIN-001` through `FIN-016`)  
**Severity Breakdown:** 4 Critical (P0) | 4 High (P1) | 7 Medium (P2) | 1 Low (P3)  

---

## 1. Executive Summary

The Finance & Accounting module serves as the core double-entry general ledger, landed cost allocation, accounts payable (AP), accounts receivable (AR), cash/bank reconciliation, and statutory financial reporting engine for the DNS Import & Export ERP.

While the module displays sophisticated financial logic—such as `decimal.js`-backed precision math, maker-checker journal approval workflows, interactive double-entry hover badges (`DoubleEntryHoverBadge`), RAMIS IRD tax schedule exports, and automated FIFO debt settlement—the audit uncovered **critical architectural fractures and operational blind spots**:

1. **Complete Decoupling from Upstream Operations (P0):**
   - The Landed Cost & Vendor Bill engine (`VendorBillCostingPage.tsx` / `apService.ts`) does **not** read goods receipts from warehouse GRN submissions (`GRNService.ts` / `IGRNRepository`). It clones static `MOCK_GRNS` in memory. Real goods received at the warehouse cannot be costed or billed.
   - AR Collections and Receipt Approvals (`ReceiptApprovalQueuePage.tsx` / `arService.ts`) operate on a hardcoded array of `MOCK_OPEN_INVOICES`. Sales invoices created in the Sales & Invoicing module (`InvoiceService.ts`) never appear for debt settlement.
   - Restoring goods to physical inventory on customer credit notes (`customerCreditNoteService.ts`) posts general ledger debit/credit vouchers but **never** updates warehouse inventory balances in `inventoryService`, creating immediate physical-to-book valuation divergence.

2. **Severe Foreign Exchange (FX) Blindness in Import Landed Costing (P0):**
   - In an ERP explicitly designed for import and export operations, `VendorBillCostingPage.tsx` completely lacks multi-currency support, exchange rate inputs, or customs tariff conversions. Foreign invoices (USD, CNY, EUR) entered by accountants are recorded as nominal LKR amounts, corrupting unit landed costs, commercial margins, and selling price proposals.

3. **Substantial Code Debt & Abandoned Legacy Artifacts (P1):**
   - Over **1,850 lines of dead code** exist in production bundles. Two massive legacy pages (`FinanceDeskPage.tsx` [622 lines] and `PaymentApprovalPage.tsx` [650 lines]) are imported in `App.tsx` and retained in test suites, but permanently bypassed by router redirects to `/finance/journal/new` and `/finance/ar/approvals`. Associated components (`DebitCreditRow.tsx`, `BalancingBar.tsx`, `FinancePricingModal.tsx`) remain abandoned.

4. **High-Risk Financial UX Patterns (P1):**
   - Disbursement and debit note forms (`SupplierAdvancePaymentsPage.tsx`, `BatchSupplierPaymentPage.tsx`) execute `useEffect` hooks that automatically pre-select `suppliers[0].id` on mount, creating catastrophic financial risk of disbursing company funds against the wrong vendor if unspotted.
   - Widespread degradation to unsearchable native HTML `<select>` tags across high-volume accounting forms, including in-cell product dropdowns mapping `MOCK_PRODUCTS`.

---

## 2. In-Depth Audit Findings

### FIN-001: Complete Isolation of Inbound GRNs in Vendor Bill Landed Costing
- **Finding ID:** `FIN-001`
- **Module & Route:** Finance (`/finance/ap/bills/new`)
- **Page Type & Task:** Transaction Processing / Landed Cost Allocation & Vendor Bill Creation
- **Issue Category:** 3.2 Workflow & Page Structure / Data Pipeline Integrity
- **Severity:** **P0 (Critical)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/ap/VendorBillCostingPage.tsx` (lines 76–78)
  - `src/features/finance/services/apService.ts` (lines 515–524)
  - `src/services/GRNService.ts` (lines 6–15)
- **Observed Behavior / Code Evidence:**
  In `VendorBillCostingPage.tsx`:
  ```tsx
  const [grnRefreshKey, setGrnRefreshKey] = useState(0);
  const availableGRNs = useMemo(() => apService.getAvailableGRNs(), [grnRefreshKey]);
  ```
  In `apService.ts`:
  ```typescript
  getAvailableGRNs(): GRN[] {
    const list = JSON.parse(JSON.stringify(MOCK_GRNS)) as GRN[];
    return list.map((g) => {
      const overrideStatus = this.grnStatuses[g.id];
      if (overrideStatus) {
        return { ...g, status: overrideStatus === 'PRICED' ? 'APPROVED' : overrideStatus };
      }
      return g;
    });
  }
  ```
  When the warehouse receiving team submits a genuine GRN via `GRNService.submitGRN()` in `/inventory/grn/new`, the record is persisted into `IGRNRepository`. However, `apService.getAvailableGRNs()` does **not** query `GRNService` or `IGRNRepository`; it clones static mock data (`MOCK_GRNS`) from `src/mock/mockInventory.ts`.
- **Why It Matters:**
  Live shipments received at the warehouse never appear in the Finance Landed Costing workspace. The accounts payable team cannot perform freight allocation, landed duty apportionment, or post vendor bills against real inbound shipments.
- **Recommended Direction:**
  Refactor `apService.getAvailableGRNs()` to inject and query `grnRepository.getAll()`. Filter for GRNs with status `SUBMITTED` or `APPROVED` where `costingStatus !== 'COSTED'`.

---

### FIN-002: Total Absence of Multi-Currency & FX Governance in Import Landed Costing
- **Finding ID:** `FIN-002`
- **Module & Route:** Finance (`/finance/ap/bills/new`)
- **Page Type & Task:** Cost Accounting / Overseas Vendor Bill Landed Cost Calculation
- **Issue Category:** 3.6 Pricing, Costing, and Discounts / Multi-Currency Integrity
- **Severity:** **P0 (Critical)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/ap/VendorBillCostingPage.tsx` (lines 2140–2160, 2370–2385)
  - `src/features/finance/components/CurrencyInput.tsx` (lines 20–25)
- **Observed Behavior / Code Evidence:**
  `VendorBillCostingPage.tsx` manages a 4-step landed costing workflow across 3,012 lines of code. However, grep inspection for `currency`, `exchangeRate`, `foreign`, or `fx` reveals **zero** currency selection inputs or exchange rate fields.
  All numeric inputs rely on `CurrencyInput` with `prefix = 'LKR'`. When an overseas invoice arrives (e.g., from an overseas manufacturer invoiced in USD $25,000), if an accountant enters `25000`, the system records it as LKR 25,000 rather than converting it via the spot/customs exchange rate (e.g., ~LKR 7,500,000 at 300 LKR/USD).
- **Why It Matters:**
  Landed unit costs become distorted by orders of magnitude (pennies per unit). Consequently, Step 4 ("Selling Prices") calculates margins and proposed retail prices based on bogus cost bases, destroying commercial profitability or pricing products out of the market.
- **Recommended Direction:**
  Introduce an explicit Foreign Currency selector (LKR, USD, EUR, CNY, GBP) and Customs/Spot Exchange Rate field in Step 1. Display base currency equivalents (`Total in LKR: Rs. ...`) beside all foreign cost lines, and mandate FX conversion before landed freight apportionment.

---

### FIN-003: Physical Inventory Drift on Customer Credit Note Stock Return
- **Finding ID:** `FIN-003`
- **Module & Route:** Finance (`/finance/ar/credit-notes`)
- **Page Type & Task:** Transaction Processing / Customer Credit Note & Merchandise Return
- **Issue Category:** 3.2 Workflow & Page Structure / Cross-Module Sub-Ledger Sync
- **Severity:** **P0 (Critical)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/ar/CustomerCreditNotesPage.tsx` (lines 51–65)
  - `src/features/finance/services/customerCreditNoteService.ts` (lines 196–265)
- **Observed Behavior / Code Evidence:**
  In `customerCreditNoteService.ts`:
  ```typescript
  // 4 & 5. Return merchandise to physical stock (Debit 1100 Inventory, Credit 5010 COGS)
  if (returnToStock && totalCostAmount > 0 && inventoryAcc && cogsAcc) {
    journalLines.push({
      accountId: inventoryAcc.id,
      debit: totalCostAmount,
      credit: 0,
      description: `Physical stock restoration for return ${creditNoteNumber}`,
    });
    journalLines.push({
      accountId: cogsAcc.id,
      debit: 0,
      credit: totalCostAmount,
      description: `COGS reversal for returned stock: ${creditNoteNumber}`,
    });
  }
  ```
  When a credit note is created with `returnToStock = true`, the accounting service debits GL Account 1100 (Inventory Asset) and credits GL Account 5010 (COGS). However, **it never calls `inventoryService` or `IInventoryRepository.saveBalance()`**. No physical stock movement is recorded, and warehouse available quantities remain unchanged.
- **Why It Matters:**
  The General Ledger inventory balance increases in financial accounts, but warehouse stock counts in `/inventory` do not reflect the returned merchandise. Physical audits will report unexplained stock discrepancies.
- **Recommended Direction:**
  Import `inventoryService` into `customerCreditNoteService.ts`. When `returnToStock` is checked, require destination warehouse selection and call `inventoryService.recordStockMovement()` with type `RETURN_INWARD`.

---

### FIN-004: Disconnected Invoicing Dataset in AR Receipt Approvals and Collections
- **Finding ID:** `FIN-004`
- **Module & Route:** Finance (`/finance/ar/approvals`, `/finance/ar/allocate`)
- **Page Type & Task:** Cash Verification & Accounts Receivable Debt Allocation
- **Issue Category:** 3.2 Workflow & Page Structure / Master Data Isolation
- **Severity:** **P0 (Critical)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/ar/ReceiptApprovalQueuePage.tsx` (lines 31–34)
  - `src/features/finance/pages/ar/ARCollectionAllocationPage.tsx` (lines 45–60)
  - `src/features/finance/services/arService.ts` (lines 142–290)
- **Observed Behavior / Code Evidence:**
  In `arService.ts`:
  ```typescript
  private init() {
    // ...
    this.openInvoices = JSON.parse(JSON.stringify(MOCK_OPEN_INVOICES));
  }
  ```
  `arService` maintains a static internal array `MOCK_OPEN_INVOICES` (126 lines of mock invoice records). It has zero integration with `InvoiceService` from `src/services/InvoiceService.ts`. Invoices issued to customers in `/invoices/new` or orders finalized in POS never flow into `arService`.
- **Why It Matters:**
  When cashiers or finance managers approve sales representative collection receipts or run FIFO allocation, they can only allocate cash against mock invoices from 2026-09. Real sales invoices generated in the Sales module remain permanently unpaid in Accounts Receivable.
- **Recommended Direction:**
  Deprecate `MOCK_OPEN_INVOICES` in `arService`. Wire `arService` directly to `InvoiceService.getAllInvoices()`, filtering for invoices with `status !== 'PAID'` and `balanceDue > 0`.

---

### FIN-005: 1,850+ Lines of Dead/Orphaned Legacy Components and Bypassed Routes
- **Finding ID:** `FIN-005`
- **Module & Route:** Finance (`/finance/desk`, `/finance/payment-approvals`, components)
- **Page Type & Task:** Technical Architecture / Dead Code & Legacy Route Divergence
- **Issue Category:** 3.8 Navigation & Branding / Technical Maintainability
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/App.tsx` (lines 48, 50, 605–606)
  - `src/features/finance/pages/FinanceDeskPage.tsx` (622 lines)
  - `src/features/finance/pages/PaymentApprovalPage.tsx` (650 lines)
  - `src/features/finance/components/DebitCreditRow.tsx` (215 lines)
  - `src/features/finance/components/BalancingBar.tsx` (150 lines)
  - `src/features/finance/components/FinancePricingModal.tsx` (380 lines)
- **Observed Behavior / Code Evidence:**
  In `src/App.tsx`:
  ```tsx
  import { PaymentApprovalPage } from './features/finance/pages/PaymentApprovalPage';
  import { FinanceDeskPage } from './features/finance/pages/FinanceDeskPage';
  // ...
  <Route path="desk" element={<Navigate to="/finance/journal/new" replace />} />
  <Route path="payment-approvals" element={<Navigate to="/finance/ar/approvals" replace />} />
  ```
  `FinanceDeskPage` and `PaymentApprovalPage` are imported at the root of `App.tsx` and retained in test files (`src/test/financeDeskComponents.test.tsx`), but their router paths immediately redirect to `/finance/journal/new` and `/finance/ar/approvals`.
  Furthermore:
  - `DebitCreditRow.tsx` and `BalancingBar.tsx` are only consumed by `FinanceDeskPage.tsx`. `ManualJournalPage.tsx` hand-rolled its own inline table and balancing calculations.
  - `FinancePricingModal.tsx` was replaced by `FinancePricingInlineSection.tsx` inside `VendorBillCostingPage.tsx` and is only referenced in a mock test.
- **Why It Matters:**
  Over 1,850 lines of obsolete, confusing duplicate code are bundled into the application. Developers maintaining the journal form or payment approvals risk modifying dead files instead of active production workflows.
- **Recommended Direction:**
  Safely decommission `FinanceDeskPage.tsx`, `PaymentApprovalPage.tsx`, `DebitCreditRow.tsx`, `BalancingBar.tsx`, and `FinancePricingModal.tsx`. Remove unused imports from `App.tsx` and update legacy unit tests.

---

### FIN-006: Dangerous Auto-Selection of First Supplier on Financial Disbursement Forms
- **Finding ID:** `FIN-006`
- **Module & Route:** Finance (`/finance/ap/advances`, `/finance/ap/payments/new`)
- **Page Type & Task:** Data Capture / Cash Disbursement & Advance Payment Forms
- **Issue Category:** 3.4 Forms and Input Anatomy / Ergonomic Safety
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/ap/SupplierAdvancePaymentsPage.tsx` (lines 111–115)
  - `src/features/finance/pages/ap/BatchSupplierPaymentPage.tsx` (lines 59–63)
- **Observed Behavior / Code Evidence:**
  In `SupplierAdvancePaymentsPage.tsx`:
  ```typescript
  // Auto-select first supplier if none selected
  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);
  ```
  In `BatchSupplierPaymentPage.tsx`:
  ```typescript
  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);
  ```
- **Why It Matters:**
  In financial accounting, auto-selecting the first alphabetical vendor on payment forms violates basic maker-checker safety principles. If an accountant opens the form to log a payment and fills out the amount and bank account without noticing the pre-selected vendor, the payment voucher is posted against the wrong supplier ledger.
- **Recommended Direction:**
  Remove the auto-selection `useEffect`. Initialize `selectedSupplierId` as empty (`""`). Enforce mandatory manual selection with explicit validation error: `"Please select a supplier before proceeding"`.

---

### FIN-007: Proliferation of Raw HTML `<select>` Elements and Unsearchable Entity Pickers
- **Finding ID:** `FIN-007`
- **Module & Route:** Finance (`/finance/ap/advances`, `/finance/ap/debit-notes`, `/finance/ar/credit-notes`)
- **Page Type & Task:** Form Input / Entity Selection
- **Issue Category:** 3.3 Shared Selectors and Overlays / Component Consistency
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/ap/SupplierAdvancePaymentsPage.tsx` (lines 356–362)
  - `src/features/finance/pages/ap/SupplierDebitNotesPage.tsx` (lines 383, 400, 446, 500–510, 644)
  - `src/features/finance/pages/ar/CustomerCreditNotesPage.tsx` (lines 493, 790, 822, 981–990)
- **Observed Behavior / Code Evidence:**
  Across AP and AR transaction pages, entity selection degrades to unstyled, unsearchable native HTML `<select>` tags:
  ```tsx
  <select
    value={item.productId}
    onChange={(e) => handleUpdateLine(idx, 'productId', e.target.value)}
    className="flex h-8 w-full rounded-md border border-slate-200/90 bg-white px-2 py-1 text-xs text-slate-900..."
  >
    {MOCK_PRODUCTS.map((p) => (
      <option key={p.id} value={p.id}>
        {p.name} ({p.sku})
      </option>
    ))}
  </select>
  ```
  This appears in 5 separate locations in `SupplierDebitNotesPage.tsx` and 4 locations in `CustomerCreditNotesPage.tsx`, mapping `MOCK_PRODUCTS` directly into table cells.
- **Why It Matters:**
  A company with 500+ SKUs or 100+ suppliers cannot use an unsearchable `<select>` element. Users are forced to scroll through long lists without search, category filtering, or SKU matching. This also introduces visual divergence from modern comboboxes used elsewhere.
- **Recommended Direction:**
  Replace native `<select>` controls with the shared `ProductSelectorModal` / combobox and canonical `SupplierSelector`.

---

### FIN-008: Inconsistent Supplier Master Duplication Across Purchasing and Finance
- **Finding ID:** `FIN-008`
- **Module & Route:** Finance (`/finance/suppliers`) vs Purchasing (`/purchasing/suppliers`)
- **Page Type & Task:** Master Data Management / Supplier Directory
- **Issue Category:** 3.8 Navigation & Branding / Cross-Module Consistency
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/SuppliersPage.tsx` (337 lines)
  - `src/features/purchasing/PurchasingSuppliersPage.tsx` (583 lines)
  - `src/features/finance/components/SupplierModal.tsx`
- **Observed Behavior / Code Evidence:**
  The system provides two entirely distinct pages for managing the same entity:
  - `/purchasing/suppliers` contains PO summary cards, a PO drill-down modal, "Create PO" shortcut buttons, and custom status pills.
  - `/finance/suppliers` contains a different table layout with Bank Name, Account Number, SWIFT code, Tax/VAT numbers, Edit, and Delete actions.
  Both consume `useFinanceLedger()` and `SupplierModal`, but represent divergent UX interfaces for the exact same entity directory.
- **Why It Matters:**
  Navigation ambiguity for procurement and accounting personnel. Purchasing users cannot see banking details, while finance users cannot see active purchase commitments.
- **Recommended Direction:**
  Consolidate into a unified Supplier Hub with tabs for "Commercial & Orders" and "Financial & Banking", or share a canonical Supplier Table component.

---

### FIN-009: Sub-Ledger Control Tagging Uses Hardcoded Mock Customer Directory
- **Finding ID:** `FIN-009`
- **Module & Route:** Finance (`/finance/journal/new`)
- **Page Type & Task:** General Ledger Journal Entry / Sub-Ledger Tagging
- **Issue Category:** 3.4 Forms and Input Anatomy / Master Data Integrity
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/journal/ManualJournalPage.tsx` (lines 16, 549–550, 669–670, 1207–1217)
- **Observed Behavior / Code Evidence:**
  In `ManualJournalPage.tsx`:
  ```tsx
  import { MOCK_CUSTOMERS } from '../../../../mock/mockCustomers';
  // ...
  {MOCK_CUSTOMERS.map((c) => (
    <option key={c.id} value={c.id}>
      {c.name} ({c.code})
    </option>
  ))}
  ```
  When an accountant enters a journal line touching GL Account `1020` (Accounts Receivable Control), the system enforces mandatory customer tagging. However, the customer dropdown options are populated strictly from static `MOCK_CUSTOMERS`.
- **Why It Matters:**
  Any customer created dynamically through `/customers` or POS cannot be tagged in manual journal entries. Adjusting entries, bad debt write-offs, or opening balance journals cannot be assigned to live customers.
- **Recommended Direction:**
  Replace `MOCK_CUSTOMERS` with `customerService.getAllCustomers()` or dynamic customer context.

---

### FIN-010: Disconnected Commission Sub-Ledger from Sales Commission Engine
- **Finding ID:** `FIN-010`
- **Module & Route:** Finance (`/finance/commissions`)
- **Page Type & Task:** Sub-Ledger Review / Sales Representative Commission Accruals
- **Issue Category:** 3.9 Approvals and Cross-Workflow Context / Operational Integration
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/FinanceCommissionsPage.tsx` (lines 23–60)
  - `src/features/sales/commissions/CommissionManagementPage.tsx`
- **Observed Behavior / Code Evidence:**
  In `FinanceCommissionsPage.tsx`:
  ```typescript
  const MOCK_COMMISSION_ACCRUALS: CommissionLedgerItem[] = [
    {
      id: 'comm-acc-1',
      repId: 'usr-106',
      repName: 'Kasun Wickramasinghe',
      // ...
    },
  ];
  ```
  The finance commission page renders a static, hardcoded array of accruals from September 2026. It does not pull data from the sales commission engine (`commissionService` / `CommissionManagementPage.tsx`), nor does it provide a button to post the monthly commission expense voucher (Debit 6010 Commission Expense, Credit 2030 Commission Payable) to the General Ledger.
- **Why It Matters:**
  Finance controllers cannot reconcile actual sales rep earnings computed in the sales module with general ledger accruals.
- **Recommended Direction:**
  Connect `FinanceCommissionsPage` to the sales commission repository. Add an action button: `"Post Accrual Voucher to General Ledger"`.

---

### FIN-011: Statutory Financial Statements Feature Hardcoded Signatories and Fake Signatures
- **Finding ID:** `FIN-011`
- **Module & Route:** Finance (`/finance/reports/*`)
- **Page Type & Task:** Statutory Reporting / Formal Financial Presentation
- **Issue Category:** 3.11 Text Quality and Production Readiness / Governance Authenticity
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/components/CorporateSignatureBlock.tsx` (lines 13–20, 40–70)
  - `src/features/finance/components/CorporateReportHeader.tsx` (lines 28–42)
- **Observed Behavior / Code Evidence:**
  In `CorporateSignatureBlock.tsx`:
  ```tsx
  export const CorporateSignatureBlock: React.FC<CorporateSignatureBlockProps> = ({
    preparedByName = 'K. M. Jayawardena, ACMA',
    preparedByTitle = 'Senior Financial Accountant',
    reviewedByName = 'H. P. Samarasekara, ACA',
    reviewedByTitle = 'Head of Finance / Controller',
    approvedByName = 'D. N. Senanayake',
    approvedByTitle = 'Managing Director / CEO',
  }) => {
    // ...
    <span className="font-serif italic text-slate-700 text-sm">
      K. M. Jayawardena
    </span>
  ```
  In `CorporateReportHeader.tsx`:
  Company registration `PV 0029384`, VAT `VAT-102938475`, SVAT `SVAT-009988`, and Nawam Mawatha address are hardcoded strings. The signature block renders simulated handwritten cursive signatures using `<span className="font-serif italic">`.
- **Why It Matters:**
  Hardcoding specific individual names, professional qualifications, and simulated signatures into reusable statutory reports is inappropriate for enterprise production software. If printed or exported for audit or tax submission, it misrepresents governance certifications.
- **Recommended Direction:**
  Derive company registration and officer names dynamically from company settings / authenticated user roles. Provide blank signature lines or cryptographic approval badges for export instead of fake script fonts.

---

### FIN-012: Technical Database Schema Leakage Exposed to Business Users
- **Finding ID:** `FIN-012`
- **Module & Route:** Finance (`/finance/reports/monthly-audit`)
- **Page Type & Task:** Statutory Audit / Transaction Journal Inspection
- **Issue Category:** 3.11 Text Quality and Production Readiness / Technical Exposure
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/reports/MonthlyTransactionsAuditPage.tsx` (lines 32–60, 240–255)
- **Observed Behavior / Code Evidence:**
  In `MonthlyTransactionsAuditPage.tsx`:
  The expandable detail row renders a prominent section titled:
  `"Underlying Database Tables & Mutated Entities"` with technical badges such as:
  - `Table: journal_entries (INSERT)`
  - `Table: journal_lines (INSERT)`
  - `Table: chart_of_accounts (UPDATE)`
  - `Table: accounts_receivable_subledger (INSERT)`
- **Why It Matters:**
  Exposing internal relational database table names and SQL DML mutation verbs (`INSERT`, `UPDATE`) to financial auditors and business controllers clutters the UI with internal engineering diagnostics rather than business audit trails.
- **Recommended Direction:**
  Rephrase technical table badges into business accounting concepts: `"Master Journal Voucher Created"`, `"General Ledger Balances Adjusted"`, `"Customer Sub-Ledger Entry Posted"`.

---

### FIN-013: Hardcoded Historic Reporting Period Defaults in Financial Statements
- **Finding ID:** `FIN-013`
- **Module & Route:** Finance (`/finance/reports/pnl`, `/finance/reports/vat`)
- **Page Type & Task:** Financial Reporting / Statement Date Filtering
- **Issue Category:** 3.10 Reports / Filter Ergonomics
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/reports/ProfitLossPage.tsx` (lines 57–60)
  - `src/features/finance/pages/reports/VatSummaryPage.tsx` (lines 33–37)
  - `src/features/finance/services/ramisExportService.ts` (lines 18–19)
- **Observed Behavior / Code Evidence:**
  In `ProfitLossPage.tsx`:
  ```typescript
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: 'THIS_MONTH',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  });
  ```
  In `VatSummaryPage.tsx`:
  ```typescript
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: 'THIS_MONTH',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  });
  ```
  Even though the preset is labeled `'THIS_MONTH'`, the start and end dates are hardcoded to September 2026 instead of dynamically computing the current calendar month.
- **Why It Matters:**
  Whenever an executive or auditor opens P&L or VAT statements, the screen displays stale data from September 2026 until the user manually adjusts the dates.
- **Recommended Direction:**
  Compute default dates dynamically using the current calendar month:
  `startDate = new Date(now.getFullYear(), now.getMonth(), 1)` and `endDate = now`.

---

### FIN-014: Hardcoded Tax Rate in Navigation Header and Tab Routing
- **Finding ID:** `FIN-014`
- **Module & Route:** Finance (`/finance/reports/vat`, navigation tabs)
- **Page Type & Task:** Navigation / Statutory Tax Reporting
- **Issue Category:** 3.8 Navigation and Branding / Hardcoded Business Rules
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/reports/ReportHeaderNav.tsx` (line 17)
  - `src/features/finance/pages/FinanceDashboardPage.tsx` (line 162)
- **Observed Behavior / Code Evidence:**
  In `ReportHeaderNav.tsx`:
  ```typescript
  { name: '18% VAT Summary', path: '/finance/reports/vat', icon: Receipt }
  ```
  In `FinanceDashboardPage.tsx`:
  ```typescript
  title: 'VAT Summary (18%)',
  description: 'Statutory 18% VAT collected on supplies for IRD tax filing.'
  ```
- **Why It Matters:**
  Hardcoding `"18%"` into navigation buttons and card descriptions violates tax adaptability principles. If Sri Lanka changes the statutory VAT rate (e.g. from 18% to 15% or 20%), UI labels become inaccurate even if underlying tax rules are updated.
- **Recommended Direction:**
  Change label to `"VAT Statutory Summary"` or dynamically format using `TaxContext` (`${taxRate}% VAT Summary`).

---

### FIN-015: Developer Phase Badges and Milestone Tags Left in Production UI
- **Finding ID:** `FIN-015`
- **Module & Route:** Finance (`/finance/dashboard`, `/finance/reports/monthly-audit`)
- **Page Type & Task:** Page Headers / Title Presentation
- **Issue Category:** 3.8 Navigation and Branding / Text Quality
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/pages/FinanceDashboardPage.tsx` (lines 184–186)
  - `src/features/finance/pages/reports/MonthlyTransactionsAuditPage.tsx` (lines 247–249)
- **Observed Behavior / Code Evidence:**
  In `FinanceDashboardPage.tsx`:
  ```tsx
  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Finance & Accounting Command Hub</h1>
  <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
    Phase 1 Executive Master
  </Badge>
  ```
  In `MonthlyTransactionsAuditPage.tsx`:
  ```tsx
  <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-[11px]">
    Finance Manager Audit View
  </Badge>
  ```
- **Why It Matters:**
  Displaying internal project milestone tags (`Phase 1 Executive Master`) looks unpolished and signals incomplete prototype software.
- **Recommended Direction:**
  Remove internal sprint/milestone badges from production page headers.

---

### FIN-016: Hidden Scrollbar and Inconsistent Scroll Container in FinanceLayout
- **Finding ID:** `FIN-016`
- **Module & Route:** Finance (Global Module Layout)
- **Page Type & Task:** Layout Container / Viewport Scrolling
- **Issue Category:** 3.1 Layout and Responsive Behavior / Usability
- **Severity:** **P3 (Low)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/finance/FinanceLayout.tsx` (line 5)
- **Observed Behavior / Code Evidence:**
  In `FinanceLayout.tsx`:
  ```tsx
  <main className="flex-1 h-full overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-6 w-full pb-24 sm:pb-20 md:pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
    <Outlet />
  </main>
  ```
  The layout suppresses scrollbars completely via Tailwind arbitrary classes `[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`.
- **Why It Matters:**
  Hiding the vertical scrollbar removes visual affordances indicating page length and scroll position, particularly on Windows and Linux machines without overlay trackpads. Users have no visual cue that content extends below the fold.
- **Recommended Direction:**
  Remove scrollbar hiding classes. Standardize on the application-wide layout wrapper.

---

## 3. Summary Assessment of Finance Module

| Sub-Module / Workflow | Active Routes | Code Integrity | Upstream Integration | Risk Level |
| :--- | :---: | :---: | :---: | :---: |
| **Command Hub & COA** | 2 | High | Good | Low |
| **Accounts Payable (AP)** | 4 | Moderate | **Severed (MOCK_GRNS)** | **P0 (Critical)** |
| **Accounts Receivable (AR)** | 4 | Moderate | **Severed (MOCK_INVOICES)** | **P0 (Critical)** |
| **Bank Reconciliation** | 1 | High | Self-contained | Medium |
| **Governance & Period Lock** | 1 | High | Strong | Low |
| **Statutory Reports Hub** | 7 | High | Stale dates / Static mock | Medium |
| **Legacy / Dead Routes** | 2 | Deprecated | Bypassed by redirects | High (Code Debt) |
