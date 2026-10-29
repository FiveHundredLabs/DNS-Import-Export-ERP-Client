# DNS ERP — Business Workflow Gap Analysis & Design Reconciliations

**Document ID:** `docs/implementation/03-business-workflow-gaps.md`  
**Scope:** Reconciling legacy/mock discrepancies against Master Specification  

---

## 1. Discovered Gaps and Reconciliations

### Gap 1: Historical GRN Records lacking PO Link (`BR-01`)
- **Discovery:** In `src/mock/mockInventory.ts`, legacy mock seeds (`GRN-2025-002` through `GRN-2025-006` and `GRN-2025-050`) have no `purchaseOrderId` or `purchaseOrderNumber`.
- **Conflict:** Master rule strictly stipulates: *"Prevent unlinked GRN creation across all applicable UI and API entry points."*
- **Reconciliation Decision:** 
  1. Enforce strict mandatory PO validation on **all new GRN creation and submission paths** (UI forms, `createGRN()`, `submitGRN()`).
  2. For historical read queries (`getGRNById()`, list tables), gracefully render `— (Legacy unlinked record)` without throwing runtime validation errors.

### Gap 2: Invoicing Cardinality (`BR-04`)
- **Discovery:** `src/services/InvoiceService.ts:61` checked `if (order.status === 'INVOICED') throw new Error(...)` treating Order-to-Invoice as 1:1.
- **Master Rule:** Multiple sales invoices can be issued against a single Sales Order until line item quantities are fully exhausted.
- **Reconciliation Decision:** Upgrade `SalesOrderItem` and `InvoiceService` to track cumulative `invoicedQuantity` and remaining billable quantity. Order transitions to `PARTIALLY_INVOICED` until all line items are 100% invoiced, at which point it becomes `INVOICED`.

### Gap 3: POS Discount Thresholds & Supervisor Authorization (`BR-03`)
- **Discovery:** `src/rules/posRules.ts` hardcoded maximum discount at 5% and threw an error on anything higher.
- **Master Rule:** Cashiers can apply up to 5%. For discounts exceeding 5%, a supervisor authorization key must be prompted and verified against active manager/director credentials.
- **Reconciliation Decision:** Implement authorization key validation service in `POSService.ts` and modal prompt in `ShowroomPOSTerminal.tsx`.

### Gap 4: Customer Selection UX Inconsistency
- **Discovery:** Quotations used an inline search dropdown, while earlier Sales Orders opened an intrusive modal dialog.
- **Reconciliation Decision:** Standardize both pages on the canonical `CustomerSelector` with `CustomerSummaryCard` for seamless in-place selection and customer switching without disruptive modal overlays.

### Gap 5: Showroom POS Terminal Layout Cutoff
- **Discovery:** Negative margins and fixed `calc(100vh-4rem)` combined with `StandardLayout` padding caused vertical clipping of the checkout button.
- **Reconciliation Decision:** In `StandardLayout.tsx`, detect `/pos` route and render a zero-padding full-bleed container, allowing `ShowroomPOSTerminal` to cleanly occupy 100% of the viewport height.
