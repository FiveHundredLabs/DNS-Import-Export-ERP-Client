# Module Audit: Approvals Engine & Commercial Governance

**Audit Target:** `src/features/approvals/`, `src/components/approval/`, and Cross-Module Approval Integrations  
**Inspected Routes & Overlays:**
- `/approvals` (`ApprovalsPage.tsx`)
- `/approvals/orders/:id` (`OrderApprovalDetailPage.tsx`)
- `CustomerCommercialApprovalModal.tsx`
- `ProductPriceProposalModal.tsx`
- `ApprovalActionDialog.tsx`, `ApprovalTimeline.tsx`, `ApprovalBadge.tsx`
- Cross-module comparison with `/finance/ar/approvals`, `/purchasing/orders/:id`, `/inventory/grn/:id`, `/quotations/:id`, `/finance/journal/new`  
**Status:** Audit Completed  
**Finding Count:** 14 Findings (`APR-001` through `APR-014`)  
**Severity Breakdown:** 4 Critical (P0) | 4 High (P1) | 5 Medium (P2) | 1 Low (P3)  

---

## 1. Executive Summary

The Approvals Engine is architecturally designed to act as the central governance clearinghouse for the DNS Import & Export ERP, providing multi-tier hierarchical approvals across sales discounts, credit limits, pricing proposals, purchase orders, goods receipts, and financial disbursements.

While the core underlying data types (`ApprovalRequest`, `ApprovalHistoryEntry`) and rules (`approvalRules.ts`) define a structured approval taxonomy, **the execution and UI integration across modules suffer from critical routing failures, broken links, dead ends, and dual conflicting decision UIs**:

1. **Broken Deep Links & Approver Misdirection (P0):**
   - **Broken Route Link:** Payment receipt approvals in `ApprovalsPage.tsx` point to `/finance/ar/receipt-approvals`. This route does not exist in `App.tsx` (the real route is `/finance/ar/approvals`). Clicking the link drops approvers onto the root homepage `/`.
   - **Dead-End Review:** Customer commercial approvals link to `/customers/:id` (`CustomerDetailPage.tsx`), but that page contains **zero** commercial terms review controls or approval actions. The required modal (`CustomerCommercialApprovalModal.tsx`) exists only on the customer list page.
   - **Warehouse Misdirection:** Product price proposals link to `/inventory` (the physical warehouse dashboard) instead of `/products`. Executives reviewing commercial margins are dumped into warehouse bin stock metrics.
   - **Domain Mismatch:** Inbound GRN physical receipt approvals link to Finance Landed Costing (`/finance/ap/bills/new`) instead of `/inventory/grn/:id` (`GRNDetailPage.tsx`).

2. **Severe Filtering Gaps (P1):**
   - In `ApprovalsPage.tsx`, the domain category filter bar contains tabs for Orders, Quotations, GRNs, and Finance, but **completely omits Purchase Orders (`PURCHASE_ORDER`) and Product Price Proposals (`PRODUCT_PRICE_CHANGE`)**. Whenever an approver selects any category tab, all purchase orders and price proposals vanish from the queue.

3. **Dual Competing Decision Dialogs (P1):**
   - Special Sales Orders have two competing approval dialogs: `ApprovalActionDialog.tsx` (used in the central queue) and an inline `Dialog` inside `OrderDetailPage.tsx`. Each uses different styling, different button colors, and different action handlers.
   - Central approvals use `ApprovalTimeline.tsx`, while order details use `OrderActivityTimeline.tsx`.

4. **Accessibility & Visual Deficiencies (P2):**
   - Step icons in `ApprovalTimeline.tsx` apply `text-white` on `bg-primary-light` (`#EEF1F9`), producing an illegible ~1.2:1 contrast ratio that renders icons invisible.
   - In `ApprovalActionDialog.tsx`, approving is selected with an emerald green pill, but the final confirm button renders as Navy primary (`bg-primary`), conflicting with emerald green confirmation buttons used across the rest of the application.

---

## 2. In-Depth Audit Findings

### APR-001: Broken Navigation Link to Non-Existent Route in Payment Receipt Approvals
- **Finding ID:** `APR-001`
- **Module & Route:** Approvals Engine (`/approvals`)
- **Page Type & Task:** Central Approval Inbox / Deep Navigation
- **Issue Category:** 3.8 Navigation and Branding / Dead Link
- **Severity:** **P0 (Critical)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/approvals/ApprovalsPage.tsx` (line 49)
  - `src/App.tsx` (line 618)
- **Observed Behavior / Code Evidence:**
  In `ApprovalsPage.tsx`:
  ```tsx
  const getDocumentLink = (app: ApprovalRequest): string | null => {
    if (app.documentType === 'PAYMENT_RECEIPT') return `/finance/ar/receipt-approvals`;
    // ...
  };
  ```
  However, `App.tsx` line 618 declares:
  ```tsx
  <Route path="ar/approvals" element={<ReceiptApprovalQueuePage />} />
  ```
  The route `/finance/ar/receipt-approvals` does not exist in `App.tsx`.
- **Why It Matters:**
  When a Finance Manager or Director clicks the reference number link of any payment receipt approval item in the central approval queue, the application attempts to navigate to the non-existent route, matches `<Route path="*" element={<Navigate to="/" replace />} />`, and immediately redirects the approver to the dashboard `/`. Approvers cannot inspect supporting deposit slips or payment remittance records.
- **Recommended Direction:**
  Update `getDocumentLink` in `ApprovalsPage.tsx` to return `/finance/ar/approvals`.

---

### APR-002: Approver Dead-End on Customer Commercial Review Link
- **Finding ID:** `APR-002`
- **Module & Route:** Approvals Engine (`/approvals`) to Customers (`/customers/:id`)
- **Page Type & Task:** Master Data Governance / Customer Commercial Terms Review
- **Issue Category:** 3.2 Workflow and Page Structure / Broken Workflow Handoff
- **Severity:** **P0 (Critical)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/approvals/ApprovalsPage.tsx` (line 53)
  - `src/features/customers/CustomerDetailPage.tsx`
  - `src/features/customers/CustomerListPage.tsx` (line 197)
  - `src/features/customers/CustomerCommercialApprovalModal.tsx`
- **Observed Behavior / Code Evidence:**
  In `ApprovalsPage.tsx`:
  ```tsx
  if (app.documentType === 'CUSTOMER_CREATION') return `/customers/${app.documentId}`;
  ```
  When an approver clicks a customer review request (`DLR-GAM-004`), the app navigates to `/customers/cust-004` (`CustomerDetailPage.tsx`).
  However, `CustomerDetailPage.tsx` contains **no commercial terms review controls, no credit limit override actions, and no integration with `CustomerCommercialApprovalModal`**. The review modal is only rendered on `CustomerListPage.tsx`.
- **Why It Matters:**
  The Sales Manager or Director who clicked the approval link arrives on a static customer detail screen with no ability to review proposed credit limits, credit days, or default discounts, and no way to approve or reject the request.
- **Recommended Direction:**
  Mount `CustomerCommercialApprovalModal` inside `CustomerDetailPage.tsx`, or render an explicit commercial review banner on the detail page with a "Review Commercial Terms" button when `approvalStage === 'PENDING_SALES_REVIEW'` or `'PENDING_MANAGER_APPROVAL'`.

---

### APR-003: Approver Misdirection to Warehouse for Commercial Price Proposals
- **Finding ID:** `APR-003`
- **Module & Route:** Approvals Engine (`/approvals`) to Inventory (`/inventory`)
- **Page Type & Task:** Commercial Governance / Product Selling Price & Margin Approval
- **Issue Category:** 3.8 Navigation and Branding / Erroneous Route Target
- **Severity:** **P0 (Critical)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/approvals/ApprovalsPage.tsx` (line 54)
  - `src/features/products/ProductListPage.tsx` (line 160)
  - `src/features/products/ProductPriceProposalModal.tsx`
- **Observed Behavior / Code Evidence:**
  In `ApprovalsPage.tsx`:
  ```tsx
  if (app.documentType === 'PRODUCT_PRICE_CHANGE') return `/inventory`;
  ```
  Price proposals represent commercial pricing governance (cost price vs proposed selling price, margin floor < 15%, price reductions > 10%). However, `getDocumentLink` directs approvers to `/inventory` (the warehouse stock and bin management dashboard).
  The actual proposal workflow (`ProductPriceProposalModal.tsx`) lives on `ProductListPage.tsx` (`/products`).
- **Why It Matters:**
  Directors reviewing product price cuts and margin floor exceptions are sent to the warehouse operations screen, which displays physical stock quantities, bin allocations, and reorder points, with zero commercial pricing data.
- **Recommended Direction:**
  Change `getDocumentLink` for `PRODUCT_PRICE_CHANGE` to return `/products/${app.documentId}` or `/products?priceReview=${app.documentId}`.

---

### APR-004: Misrouted GRN Physical Receipt Approval to Accounts Payable Landed Costing
- **Finding ID:** `APR-004`
- **Module & Route:** Approvals Engine (`/approvals`) to Finance AP (`/finance/ap/bills/new`)
- **Page Type & Task:** Warehouse Governance / Inbound Goods Receipt Verification
- **Issue Category:** 3.2 Workflow and Page Structure / Domain Misrouting
- **Severity:** **P0 (Critical)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/approvals/ApprovalsPage.tsx` (line 52)
  - `src/features/inventory/GRNDetailPage.tsx`
  - `src/features/finance/pages/ap/VendorBillCostingPage.tsx`
- **Observed Behavior / Code Evidence:**
  In `ApprovalsPage.tsx`:
  ```tsx
  if (app.documentType === 'GRN_RECEIPT') return `/finance/ap/bills/new?grnId=${app.documentId}`;
  ```
  When an inbound GRN physical receipt requires manager authorization (e.g. damaged stock received, quantity discrepancy, missing barcodes), clicking the reference link opens the Finance Landed Costing and Vendor Bill creation form (`VendorBillCostingPage.tsx`).
  The actual warehouse receiving inspection view is `GRNDetailPage.tsx` (`/inventory/grn/:id`).
- **Why It Matters:**
  A warehouse manager approving a physical goods receipt needs to inspect received vs PO quantities, damaged items, and serial barcode scans in `GRNDetailPage.tsx`. In `VendorBillCostingPage.tsx`, the warehouse manager is presented with freight charge allocations and customs duty forms instead of physical warehouse verification.
- **Recommended Direction:**
  Update `getDocumentLink` for `GRN_RECEIPT` to return `/inventory/grn/${app.documentId}`.

---

### APR-005: Purchase Orders and Price Proposals Disappear Upon Applying Category Filters
- **Finding ID:** `APR-005`
- **Module & Route:** Approvals Engine (`/approvals`)
- **Page Type & Task:** Central Queue / Category Filtering
- **Issue Category:** 3.2 Workflow and Page Structure / Filter Incompleteness
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/approvals/ApprovalsPage.tsx` (lines 60–72, 144–149)
  - `src/types/approval.ts` (lines 4–12)
- **Observed Behavior / Code Evidence:**
  In `ApprovalsPage.tsx`:
  ```tsx
  {(
    [
      { label: 'All Queue Items', value: 'ALL', icon: Layers },
      { label: 'Sales Orders & Exceptions', value: 'ORDERS', icon: ShoppingCart },
      { label: 'Quotations', value: 'QUOTATIONS', icon: FileText },
      { label: 'Inbound GRNs', value: 'GRN', icon: Warehouse },
      { label: 'Customers & Finance', value: 'FINANCE_CUSTOMERS', icon: Landmark },
    ] as const
  ).map((cat) => ...)}
  ```
  The category filter bar defines only 4 category filters. There is no category filter for `PURCHASE_ORDER` or `PRODUCT_PRICE_CHANGE`.
  In `filteredApprovals`:
  ```tsx
  if (categoryFilter === 'ORDERS' && app.documentType !== 'SPECIAL_SALES_ORDER') return false;
  if (categoryFilter === 'QUOTATIONS' && app.documentType !== 'QUOTATION_DISCOUNT') return false;
  if (categoryFilter === 'GRN' && app.documentType !== 'GRN_RECEIPT') return false;
  if (categoryFilter === 'FINANCE_CUSTOMERS' && ...) return false;
  ```
- **Why It Matters:**
  Purchase orders and price proposals are completely excluded from all category filters. The moment an executive clicks any tab (e.g. looking for procurement items under Orders), purchase orders are invisible. They only appear when `categoryFilter === 'ALL'`.
- **Recommended Direction:**
  Add explicit filter tabs for `Purchase Orders` (`PURCHASE_ORDER`) and `Pricing Proposals` (`PRODUCT_PRICE_CHANGE`), or expand `ORDERS` to encompass both Sales Orders and Purchase Orders.

---

### APR-006: Dual Competing Approval Dialogs in Special Sales Orders
- **Finding ID:** `APR-006`
- **Module & Route:** Approvals (`/approvals`) vs Order Details (`/approvals/orders/:id`, `/orders/:id`)
- **Page Type & Task:** Transaction Approval / Decision Execution
- **Issue Category:** 3.3 Shared Selectors and Overlays / Component Duplication
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/components/approval/ApprovalActionDialog.tsx` (lines 20–180)
  - `src/features/orders/OrderDetailPage.tsx` (lines 873–955)
  - `src/features/approvals/ApprovalsPage.tsx` (lines 272–288)
- **Observed Behavior / Code Evidence:**
  When approving a sales order from `ApprovalsPage.tsx`, the application opens `ApprovalActionDialog.tsx`, which executes `ApprovalService.processAction()`.
  When approving from `/approvals/orders/:id` (which wraps `OrderDetailPage.tsx`), it ignores `ApprovalActionDialog` and renders its own custom inline `Dialog` (lines 873–955 of `OrderDetailPage.tsx`) which calls `orderService.approveOrder()`.
  The two dialogs have conflicting button color palettes, different escalation input styles, and different explanatory label requirements.
- **Why It Matters:**
  Inconsistent UX for approvers depending on whether they act from the queue or from the detail screen. Two distinct code paths must be maintained for recording approval reasons and actor roles.
- **Recommended Direction:**
  Standardize on `ApprovalActionDialog.tsx` as the single canonical approval modal primitive across both `ApprovalsPage` and `OrderDetailPage`.

---

### APR-007: Missing Exception Context in Order Approval Decision View
- **Finding ID:** `APR-007`
- **Module & Route:** Approvals (`/approvals/orders/:id`)
- **Page Type & Task:** Approver Decision Review / Order Detail Page
- **Issue Category:** 3.9 Approvals and Cross-Workflow Context / Information Loss
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/approvals/OrderApprovalDetailPage.tsx` (lines 6–32)
  - `src/features/orders/OrderDetailPage.tsx`
- **Observed Behavior / Code Evidence:**
  `OrderApprovalDetailPage.tsx` is a bare 34-line wrapper:
  ```tsx
  export function OrderApprovalDetailPage() {
    return (
      <div className="w-full space-y-4">
        {/* Header Breadcrumb */}
        <OrderDetailPage />
      </div>
    );
  }
  ```
  It does not pass any exception metadata (`isSpecialScenario`, `specialReason`, `targetApproverRole`) to `OrderDetailPage`.
  In `OrderDetailPage.tsx`, the approver sees the standard order layout without any highlighted banner stating **why** the order was halted (e.g. `"Customer discount of 16% exceeds the 15% maximum allowed"` or `"Order total LKR 450,000 exceeds available credit limit of LKR 120,000"`).
- **Why It Matters:**
  Approvers are forced to manually audit line-item discount percentages against customer tier rules and credit balances to figure out what triggered the escalation, slowing decision times and increasing review friction.
- **Recommended Direction:**
  Mount a sticky "Approval Justification & Exception Banner" at the top of `OrderApprovalDetailPage.tsx` showing the initiator's notes, the exact policy breached, and permitted vs requested parameters.

---

### APR-008: Complete Omission of General Ledger Journal Entry Approvals
- **Finding ID:** `APR-008`
- **Module & Route:** Approvals Engine (`/approvals`) vs Finance (`/finance/journal/new`)
- **Page Type & Task:** Governance Integration / Finance Maker-Checker Vouchers
- **Issue Category:** 3.9 Approvals and Cross-Workflow Context / Governance Completeness
- **Severity:** **P1 (High)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/types/approval.ts` (lines 4–12)
  - `src/features/finance/pages/journal/ManualJournalPage.tsx` (lines 1420–1490)
  - `src/features/approvals/ApprovalsPage.tsx`
- **Observed Behavior / Code Evidence:**
  In `types/approval.ts`, `ApprovalDocumentType` includes:
  `CUSTOMER_CREATION | PRODUCT_PRICE_CHANGE | QUOTATION_DISCOUNT | SPECIAL_SALES_ORDER | GRN_RECEIPT | PAYMENT_RECEIPT | EXPENSE_CLAIM | PURCHASE_ORDER`.
  It completely omits `JOURNAL_ENTRY`.
  In `ManualJournalPage.tsx`, accountants create manual journal vouchers with status `PENDING_APPROVAL`. However, these vouchers never create an `ApprovalRequest` in `ApprovalService`. Financial managers can only approve them by visiting `/finance/journal/new` and scrolling down to the bottom drafts table.
- **Why It Matters:**
  A Finance Manager or Director checking the enterprise approval inbox will see customer approvals and purchase orders, but will never see high-value manual accounting adjustments pending authorization.
- **Recommended Direction:**
  Add `JOURNAL_ENTRY` to `ApprovalDocumentType`. Wire `ManualJournalPage.tsx` to create an `ApprovalRequest` when a journal is submitted for maker-checker review.

---

### APR-009: Severed Dual Receipt Approval Queues Across Enterprise and Finance
- **Finding ID:** `APR-009`
- **Module & Route:** Approvals (`/approvals`) vs Finance (`/finance/ar/approvals`)
- **Page Type & Task:** Workflow Convergence / Cash Collection Approvals
- **Issue Category:** 3.2 Workflow and Page Structure / Competing Implementations
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/approvals/ApprovalsPage.tsx`
  - `src/features/finance/pages/ar/ReceiptApprovalQueuePage.tsx` (1,000 lines)
  - `src/mock/mockApprovals.ts`
  - `src/features/finance/services/arService.ts`
- **Observed Behavior / Code Evidence:**
  The system maintains two completely independent payment receipt approval queues:
  1. `ApprovalsPage.tsx` renders `PAYMENT_RECEIPT` items loaded from `MockApprovalRepository`.
  2. `ReceiptApprovalQueuePage.tsx` renders AR receipts loaded from `arService.getReceipts()`.
  Approving a payment in `ReceiptApprovalQueuePage.tsx` updates `arService` and commits a GL journal entry, but leaves the `PAYMENT_RECEIPT` record in `ApprovalsPage.tsx` as `PENDING`.
- **Why It Matters:**
  Controllers face conflicting approval queues with desynchronized approval statuses.
- **Recommended Direction:**
  Unify payment receipt approvals into `ReceiptApprovalQueuePage.tsx`, and remove standalone `PAYMENT_RECEIPT` mock items from `ApprovalsPage.tsx`, or wire `ReceiptApprovalQueuePage` to resolve the corresponding `ApprovalRequest`.

---

### APR-010: Severe Contrast Accessibility Defect in Approval Timeline Icons
- **Finding ID:** `APR-010`
- **Module & Route:** Approvals (`ApprovalTimeline.tsx`)
- **Page Type & Task:** Visual Presentation / Step History Icons
- **Issue Category:** 3.1 Layout and Responsive Behavior / Accessibility Contrast
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/components/approval/ApprovalTimeline.tsx` (lines 55–65)
- **Observed Behavior / Code Evidence:**
  In `ApprovalTimeline.tsx`:
  ```tsx
  <div
    className={cn(
      'absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full text-white',
      isApprove && 'bg-emerald-500',
      isReject && 'bg-rose-500',
      isEscalate && 'bg-primary-light',
      isSubmit && 'bg-primary-light',
      isCancel && 'bg-slate-500',
      isPick && 'bg-amber-500',
      isIssue && 'bg-primary-light',
      // ...
    )}
  >
    {isEscalate && <ArrowUpRight className="h-3 w-3" />}
    {isSubmit && <Send className="h-2.5 w-2.5" />}
    {isIssue && <PackageCheck className="h-3 w-3" />}
  </div>
  ```
  `bg-primary-light` is defined as `#EEF1F9` (a very faint, light lavender tint).
  The parent container sets `text-white`. Consequently, the white SVG icons inside `isEscalate`, `isSubmit`, and `isIssue` badges render white-on-light-tint with a contrast ratio of ~1.2:1.
- **Why It Matters:**
  The icons for submission, escalation, and stock issue steps are completely invisible to users and fail WCAG 2.1 AA non-text contrast requirements (minimum 3:1).
- **Recommended Direction:**
  For `isEscalate`, `isSubmit`, and `isIssue`, either use `bg-primary` (solid navy `#263183`) with `text-white`, or use `bg-primary-light` with `text-primary`.

---

### APR-011: Color Semantic Inconsistency in Approval Action Confirmations
- **Finding ID:** `APR-011`
- **Module & Route:** Approvals (`ApprovalActionDialog.tsx`)
- **Page Type & Task:** Modal Dialog / Action Button Styling
- **Issue Category:** 3.7 Actions, Statuses, and Permissions / Semantic Color Conflict
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/components/approval/ApprovalActionDialog.tsx` (lines 78–82, 172)
- **Observed Behavior / Code Evidence:**
  In `ApprovalActionDialog.tsx`:
  ```tsx
  <button
    type="button"
    onClick={() => setAction('APPROVE')}
    className={action === 'APPROVE' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500' : ...}
  >
    Approve
  </button>
  // ...
  <Button
    type="submit"
    size="sm"
    disabled={loading}
    variant={action === 'REJECT' ? 'destructive' : 'default'}
  >
    {loading ? 'Processing...' : `Confirm ${action}`}
  </Button>
  ```
  When the user selects "Approve", the selection pill is styled with emerald green semantics. But the final execution button at the bottom of the dialog renders with `variant="default"` (Navy primary `bg-primary`).
  In contrast, `OrderDetailPage.tsx:943` uses `bg-emerald-600 hover:bg-emerald-700 text-white` for "Confirm Action".
- **Why It Matters:**
  Inconsistent semantic feedback. Users expect positive approval actions to maintain green coloration through confirmation, rather than flipping to brand navy.
- **Recommended Direction:**
  Style the submit button conditionally: emerald green for `APPROVE`, rose red for `REJECT`, and sky blue for `ESCALATE`.

---

### APR-012: Hardcoded Role Escalation Matrix in Approval Dialog
- **Finding ID:** `APR-012`
- **Module & Route:** Approvals (`ApprovalActionDialog.tsx`)
- **Page Type & Task:** Action Dialog / Escalation Role Selection
- **Issue Category:** 3.4 Forms and Input Anatomy / Business Rule Decoupling
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/components/approval/ApprovalActionDialog.tsx` (lines 117–146)
  - `src/rules/approvalRules.ts`
- **Observed Behavior / Code Evidence:**
  In `ApprovalActionDialog.tsx`:
  Escalation target roles are determined via hardcoded inline JSX checks on `currentUser.role`:
  ```tsx
  {currentUser.role === 'SALES_MANAGER' && (
    <>
      <option value="MANAGER">Operational Manager</option>
      <option value="DIRECTOR">Director (Executive Escalation)</option>
    </>
  )}
  ```
  This duplicates and contradicts `approvalRules.ts`, which already provides `determineCustomerApprovalRoute` and `determinePriceApprovalRoute`.
- **Why It Matters:**
  If organizational escalation hierarchies change, developers must update raw JSX dropdown options in the modal rather than adjusting central business rules in `approvalRules.ts`.
- **Recommended Direction:**
  Move escalation target resolution into a helper in `approvalRules.ts` (`getEscalationTargets(actorRole, documentType)`).

---

### APR-013: Missing ApprovalTimeline in Purchase Order Review
- **Finding ID:** `APR-013`
- **Module & Route:** Purchasing (`/purchasing/orders/:id`)
- **Page Type & Task:** Transaction Detail / PO Approval Card
- **Issue Category:** 3.5 Tables and Line-Item Presentation / Component Inconsistency
- **Severity:** **P2 (Medium)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/purchasing/PurchaseOrderDetailPage.tsx` (lines 410–440)
  - `src/components/approval/ApprovalTimeline.tsx`
- **Observed Behavior / Code Evidence:**
  `PurchaseOrderDetailPage.tsx` implements a plain card with a raw textarea and approve/reject buttons. It completely omits `ApprovalTimeline.tsx`, unlike Sales Orders (`OrderDetailPage.tsx`) and the Approvals Engine (`ApprovalsPage.tsx`), which display multi-step timeline entries.
- **Why It Matters:**
  Purchasing managers cannot see prior submission notes, revision logs, or escalation reasons directly on the PO detail screen.
- **Recommended Direction:**
  Embed `ApprovalTimeline` in `PurchaseOrderDetailPage.tsx` to provide visual parity with Sales Orders.

---

### APR-014: Redundant Header Breadcrumb Banner in Order Approval Review
- **Finding ID:** `APR-014`
- **Module & Route:** Approvals (`/approvals/orders/:id`)
- **Page Type & Task:** Wrapper Header / Breadcrumb Presentation
- **Issue Category:** 3.8 Navigation and Branding / UI Redundancy
- **Severity:** **P3 (Low)**
- **Confidence:** Confirmed Code Inspection
- **Component Paths:**
  - `src/features/approvals/OrderApprovalDetailPage.tsx` (lines 12–25)
- **Observed Behavior / Code Evidence:**
  `OrderApprovalDetailPage.tsx` renders a top banner with `"Back to Approvals Engine | Special Sales Order Approval Review"`. Immediately below this, `OrderDetailPage` renders its own full page header with back button, breadcrumbs, order number, and status pills, resulting in stacked, competing back-navigation buttons.
- **Why It Matters:**
  Duplicate back buttons and redundant header copy waste vertical space without providing additional utility.
- **Recommended Direction:**
  Pass a `backTo="/approvals"` prop into `OrderDetailPage` so it can render a single unified header.

---

## 3. Cross-Module Approval Comparison Matrix

| Document / Domain | Origin Route | Trigger Condition | Central Queue Presence | Decision View Path | Decision Component | Timeline Component |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **Special Sales Order** | `/orders/new` | Discount > ceiling or Credit Days > limit | Yes (`SPECIAL_SALES_ORDER`) | `/approvals/orders/:id` | Inline Dialog in `OrderDetailPage` | `OrderActivityTimeline` |
| **Quotation Discount** | `/quotations/new` | Line discount > permitted | Yes (`QUOTATION_DISCOUNT`) | `/quotations/:id` | Inline Card in `QuotationDetailPage` | None |
| **Purchase Order** | `/purchasing/orders/new` | Nominal Total > 500k | Yes (Hidden if filtered) | `/purchasing/orders/:id` | Inline Card in `PurchaseOrderDetailPage` | None |
| **Inbound GRN** | `/inventory/grn/new` | Damage / Discrepancy | Yes (`GRN_RECEIPT`) | **Misrouted to AP Costing** | Finance Costing / `GRNDetailPage` | None |
| **Customer Commercial** | `/customers/new` | Credit > 1M or Days > 30 | Yes (`CUSTOMER_CREATION`) | **Dead End** (`/customers/:id`) | Modal on `CustomerListPage` only | `ApprovalTimeline` (in queue) |
| **Product Price Change** | `/products` | Margin < 15% or Cut > 10% | Yes (Hidden if filtered) | **Misrouted to `/inventory`** | Modal on `ProductListPage` only | `ApprovalTimeline` (in queue) |
| **AR Payment Receipt** | Field / POS Cashier | Cash / Cheque Collected | Yes (Dead Link in queue) | `/finance/ar/approvals` | `ReceiptApprovalQueuePage` | None |
| **Manual Journal Voucher**| `/finance/journal/new` | Maker-checker review | **Missing entirely** | `/finance/journal/new` | Inline Draft Table in Journal Page | None |
