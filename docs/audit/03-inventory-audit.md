# ERP UI/UX Consistency Audit — Module 3: Inventory and Warehouse

**Document ID:** `AUDIT-03-INVENTORY`  
**Module:** Inventory & Warehouse (Warehouse Hub, GRN, Stock Balance, Movements, Picking, Dispatch, Delivery Notes, Damaged Stock)  
**Audit Stage:** Stage B — Batch 3  
**Status:** Completed  
**Inspected Date:** October 2026  
**Auditor:** UI Consistency Sentinel  

---

## 1. Executive Summary

This report delivers a comprehensive, evidence-based UI/UX consistency audit of the **Inventory and Warehouse** module of the DNS Import & Export ERP application.

The audit inspected all **11 active route endpoints**, **1 orphaned sidebar route**, and **18 supporting components and modals**. While the module provides advanced warehouse capabilities (such as unit-level barcode generation, multi-ply delivery notes, multi-step inbound GRN steppers, and serial number scanning), critical code-level defects and workflow breaks were uncovered:
1. **Hardcoded Mock Purchase Orders in Goods Receiving (P0):** When warehouse stock keepers create a Goods Received Note (GRN), the purchase order selector maps a static mock array (`MOCK_PURCHASE_ORDERS`), completely detached from the live, approved Purchase Orders generated in Module 1 (`PurchaseOrderService`). Live approved orders cannot be received.
2. **Hardcoded Brand Filter Silently Hiding Inventory (P0):** The Storekeeper Inventory Hub (`InventoryDashboardPage.tsx`) enforces a hardcoded string filter (`isPowerToolItem`) checking for specific brand names (`bosch`, `makita`, `dewalt`, `milwaukee`, `stanley`, etc.). Any inventory item outside these specific power tool brands is silently dropped from the dashboard ledger.
3. **Hardcoded Static Suppliers Array in Manual GRN (P0):** Manual receiving in `GRNCreateEditPage.tsx` hardcodes an array of 4 vendor names, bypassing the canonical supplier directory from `useFinanceLedger()`.
4. **Orphaned Navigation Target (`/inventory/damaged-stock`) (P1):** The sidebar links to `Damaged Stock & RMA`, where an 849-line workflow page exists on disk (`DamagedStockPage.tsx` with debit note creation and disposal workflows), but the route was omitted from `App.tsx`, causing unexpected fallback redirection to `/`.
5. **Legacy Divergent Delivery Note Modal in Dispatch (P1):** `DispatchPage.tsx` uses a legacy `DeliveryNoteModal` with hardcoded driver details, bypassing the dedicated `delivery-notes/` sub-module.
6. **Company Branding Inconsistency (P2):** Printable delivery notes brand the company as `DNS ENGINEERING & ELECTRICALS (PVT) LTD`, while purchase orders, invoices, and thermal receipts brand it as `DNS DISTRIBUTION (PVT) LTD`.

A total of **9 findings** were identified: **3 Critical (P0)**, **2 High (P1)**, **4 Medium (P2)**, and **0 Low (P3)**.

---

## 2. In-Scope Routes & Screen Inventory

| Route Path | Page Component | Primary User Task | Container Layout | Inspection Status |
| :--- | :--- | :--- | :--- | :--- |
| `/inventory` | `InventoryDashboardPage.tsx` | Stock keeper hub, unit barcode studio, quarantine | `StandardLayout` | **Inspected (UI & Code)** |
| `/inventory/grn` | `GRNListPage.tsx` | Inward receiving register, KPI charts, inspection | `StandardLayout` | **Inspected (UI & Code)** |
| `/inventory/grn/new` | `GRNCreateEditPage.tsx` | Multi-step GRN creation (Counts, Serials, Barcodes) | `StandardLayout` | **Inspected (UI & Code)** |
| `/inventory/grn/:id` | `GRNDetailPage.tsx` | GRN inspection detail, verification sign-off | `StandardLayout` | **Inspected (UI & Code)** |
| `/inventory/stock` | `StockBalancePage.tsx` | Stock on hand by location (Warehouse/Showroom) | `StandardLayout` | **Inspected (UI & Code)** |
| `/inventory/movements` | `StockMovementsPage.tsx` | Perpetual immutable inventory movement audit log | `StandardLayout` | **Inspected (UI & Code)** |
| `/inventory/picking` | `OrderPickingPage.tsx` | Order picking slip allocation and stock issue | `StandardLayout` | **Inspected (UI & Code)** |
| `/inventory/dispatch` | `DispatchPage.tsx` | Staging area dispatch, delivery note trigger | `StandardLayout` | **Inspected (UI & Code)** |
| `/inventory/delivery-notes` | `DeliveryNoteListPage.tsx` | Outbound delivery note register, transit tracking | `StandardLayout` | **Inspected (UI & Code)** |
| `/inventory/delivery-notes/new` | `DeliveryNoteCreatePage.tsx` | Delivery note generation from invoice/order | `StandardLayout` | **Inspected (UI & Code)** |
| `/inventory/delivery-notes/:id` | `DeliveryNoteDetailPage.tsx` | Proof of delivery (POD), driver logs, rejections | `StandardLayout` | **Inspected (UI & Code)** |
| `/inventory/damaged-stock` | `DamagedStockPage.tsx` | Damaged stock quarantine, vendor RMA debit notes | *None (Orphaned)* | **Blocked / Orphaned** |

---

## 3. Detailed Audit Findings

```
Severity Breakdown:
┌──────────────┬───────┐
│ P0 Critical  │   3   │
│ P1 High      │   2   │
│ P2 Medium    │   4   │
│ P3 Low       │   0   │
│ Total        │   9   │
└──────────────┴───────┘
```

---

### Finding INV-001: Orphaned Navigation Route Target (`/inventory/damaged-stock`)
- **Module & Affected Routes:** Inventory — `/inventory/damaged-stock`
- **Page Type & Task:** Damaged Stock Quarantine, Scrap Write-Off & Supplier Debit Note Generation
- **Issue Category:** 3.2 Workflow and page structure / 3.8 Navigation and branding
- **Observed Behavior & Evidence:**
  - In `src/components/common/Sidebar.tsx` (line 132), the navigation rail declares:
    `{ id: 'damaged-stock', name: 'Damaged Stock & RMA', path: '/inventory/damaged-stock', icon: ShieldAlert, category: 'inventory' },`
  - In `src/features/inventory/DamagedStockPage.tsx`, an 849-line component exists with complete workflows:
    - Lists all inventory balances with `damagedQuantity > 0`.
    - "Return to Vendor" modal linked to `apService` to create a `SupplierDebitNote`.
    - "Scrap / Write-off" modal posting stock adjustments.
    - "In-House Repair" modal returning stock to good available inventory.
  - However, in `src/App.tsx`, this route was never declared. Clicking `Damaged Stock & RMA` triggers React Router's fallback redirect (`<Route path="*" element={<Navigate to="/" replace />} />`), stranding users on the root dashboard.
- **Why It Matters:** High-value operational workflows for damaged inventory and vendor returns are completely inaccessible from the user interface.
- **Severity & Confidence:** **P1 (High)** | Confirmed (Code-level inspection)
- **Related Screens:** `/purchasing/returns`, `/finance/ap/debit-notes`
- **Component Paths:** `src/App.tsx`, `src/components/common/Sidebar.tsx`, `src/features/inventory/DamagedStockPage.tsx`
- **Recommended Direction:** Register `<Route path="inventory/damaged-stock" element={<ProtectedRoute><DamagedStockPage /></ProtectedRoute>} />` in `App.tsx` and export from `InventoryPages.ts`.
- **Scope & Fix Type:** Route registration fix.
- **Dependencies & Business Rules:** Preserves inventory write-off audit trails.

---

### Finding INV-002: CRITICAL — Hardcoded Mock Purchase Orders in Goods Receiving (`GRNCreateEditPage.tsx`)
- **Module & Affected Routes:** Inventory & Purchasing — `/inventory/grn/new` (`GRNCreateEditPage.tsx`)
- **Page Type & Task:** Inward Goods Receiving (Inbound GRN from Purchase Order)
- **Issue Category:** 3.2 Workflow and page structure / 3.3 Shared selectors and overlays
- **Observed Behavior & Evidence:**
  - In `src/features/inventory/GRNCreateEditPage.tsx`:
    - Line 16: `import { MOCK_PURCHASE_ORDERS } from '../../mock/mockInventory';`
    - Line 153: `const po = MOCK_PURCHASE_ORDERS.find((p) => p.id === poId);`
    - Line 1105:
      ```tsx
      {MOCK_PURCHASE_ORDERS.map((po) => (
        <SelectItem key={po.id} value={po.id}>
          {po.poNumber} — {po.supplierName} ({po.items.length} lines)
        </SelectItem>
      ))}
      ```
- **Why It Matters:** When a warehouse keeper selects "From Purchase Order" to receive inbound goods, the dropdown renders only static, hardcoded dummy orders from `mockInventory.ts`. Live purchase orders created and approved in the Purchasing Module (`PurchaseOrderService` / `usePurchaseOrders()`) never appear! The physical receiving workflow is completely severed from the procurement workflow.
- **Severity & Confidence:** **P0 (Critical)** | Confirmed (Code-level inspection)
- **Related Screens:** `/purchasing/orders`, `/purchasing/orders/:id`
- **Component Paths:** `src/features/inventory/GRNCreateEditPage.tsx`, `src/services/PurchaseOrderService.ts`, `src/hooks/usePurchaseOrders.ts`
- **Recommended Direction:** Replace `MOCK_PURCHASE_ORDERS` with live orders from `usePurchaseOrders({ status: ['APPROVED', 'SENT_TO_SUPPLIER', 'PARTIALLY_RECEIVED'] })`.
- **Scope & Fix Type:** Cross-module service integration.
- **Dependencies & Business Rules:** Must only allow receiving against `APPROVED`, `SENT_TO_SUPPLIER`, or `PARTIALLY_RECEIVED` POs.

---

### Finding INV-003: CRITICAL — Hardcoded Static Suppliers Array in Manual Inward Receiving
- **Module & Affected Routes:** Inventory — `/inventory/grn/new` (`GRNCreateEditPage.tsx`)
- **Page Type & Task:** Manual Inward Goods Receiving
- **Issue Category:** 3.3 Shared selectors and overlays / 3.11 Text quality
- **Observed Behavior & Evidence:**
  - In `GRNCreateEditPage.tsx` (lines 52–57):
    ```ts
    const SUPPLIERS = [
      { id: 'sup-01', name: 'Schneider Electric Lanka (Pvt) Ltd' },
      { id: 'sup-02', name: 'ABB Power Products' },
      { id: 'sup-03', name: 'Havells India Limited' },
      { id: 'sup-04', name: 'Siemens Industrial Automation' },
    ];
    ```
  - When intake mode is set to `MANUAL` (line 1140), the supplier selector iterates over this static array of 4 brands rather than loading real suppliers from `useFinanceLedger()` or `SupplierService`.
- **Why It Matters:** Any vendor added via `/purchasing/suppliers` or `/finance/suppliers` cannot be selected when creating a manual GRN in the warehouse.
- **Severity & Confidence:** **P0 (Critical)** | Confirmed (Code-level inspection)
- **Related Screens:** `/purchasing/suppliers`, `/finance/suppliers`
- **Component Paths:** `src/features/inventory/GRNCreateEditPage.tsx`, `src/features/finance/hooks/useFinanceLedger.ts`
- **Recommended Direction:** Source suppliers dynamically from `useFinanceLedger().suppliers` or the canonical `SupplierSelector`.
- **Scope & Fix Type:** Shared service consumption.
- **Dependencies & Business Rules:** Preserves supplier code and tax snapshot attributes on created GRNs.

---

### Finding INV-004: CRITICAL — Hardcoded Brand Filter Silently Hiding Inventory in Dashboard
- **Module & Affected Routes:** Inventory — `/inventory` (`InventoryDashboardPage.tsx`)
- **Page Type & Task:** Stock Keeper Inventory Hub & Items Ledger
- **Issue Category:** 3.5 Tables and line-item presentation / 3.11 Text quality
- **Observed Behavior & Evidence:**
  - In `InventoryDashboardPage.tsx` (lines 102–120):
    ```ts
    // Helper: Strict Power Tools classification filter for Stock Keeper Inventory Hub
    function isPowerToolItem(item: { productId?: string; sku?: string; categoryName?: string; productName?: string }): boolean {
      if (item.productId?.startsWith('prod-pt-')) return true;
      if (item.sku?.startsWith('DNS-PT-')) return true;
      if (item.categoryName?.toLowerCase().includes('power tool')) return true;
      const name = (item.productName || '').toLowerCase();
      return (
        name.includes('bosch') ||
        name.includes('makita') ||
        name.includes('dewalt') ||
        name.includes('milwaukee') ||
        name.includes('stanley') ||
        name.includes('rotary hammer') ||
        name.includes('angle grinder') ||
        name.includes('impact wrench') ||
        name.includes('circular saw') ||
        name.includes('demolition breaker') ||
        name.includes('jigsaw') ||
        name.includes('router') ||
        name.includes('multi-tool')
      );
    }
    ```
  - In line 148:
    ```ts
    // Filter: Storekeeper inventory hub strictly keeps ONLY realistic power tools!
    if (!isPowerToolItem({ productId: item.productId, sku: pSku, categoryName: pCategory, productName: pName })) {
      return;
    }
    ```
- **Why It Matters:** DNS Import & Export distributes industrial electricals, switchgear, automation equipment, and lighting in addition to power tools. Because of this hardcoded brand/keyword check, any inventory item that is not a power tool is silently dropped from the Stock Keeper's inventory ledger. Storekeepers and warehouse managers cannot view or print barcodes for non-tool inventory lines.
- **Severity & Confidence:** **P0 (Critical)** | Confirmed (Code-level inspection)
- **Related Screens:** `/inventory/stock` (`StockBalancePage.tsx`), `/products`
- **Component Paths:** `src/features/inventory/InventoryDashboardPage.tsx`
- **Recommended Direction:** Remove the hardcoded brand keyword filtering, or convert it into an explicit, selectable Category Filter dropdown (`All Categories`, `Power Tools`, `Switchgear`, etc.) defaulting to `All`.
- **Scope & Fix Type:** Business logic fix.
- **Dependencies & Business Rules:** None.

---

### Finding INV-005: Legacy/Duplicate Delivery Note Modal in `DispatchPage.tsx`
- **Module & Affected Routes:** Inventory — `/inventory/dispatch` vs `/inventory/delivery-notes/*`
- **Page Type & Task:** Staging Dispatch & Delivery Note Issuance
- **Issue Category:** 3.2 Workflow and page structure / 3.3 Shared selectors and overlays
- **Observed Behavior & Evidence:**
  - `src/features/inventory/DispatchPage.tsx` (line 19) imports and opens `DeliveryNoteModal` (`src/features/inventory/DeliveryNoteModal.tsx`), an older 298-line modal simulation with hardcoded driver details:
    `const [driverName, setDriverName] = useState('Nimal Bandara');`
    `const [vehicleNumber, setVehicleNumber] = useState('WP CAD-8890');`
  - Meanwhile, a modern, dedicated sub-module exists in `src/features/inventory/delivery-notes/` (`DeliveryNoteListPage`, `DeliveryNoteCreatePage`, `DeliveryNoteDetailPage`, `PrintableDeliveryNote`, `CustomerRejectionModal`).
  - Dispatching an order in `DispatchPage` does NOT route to or integrate with `DeliveryNoteCreatePage`.
- **Why It Matters:** Two competing delivery note concepts exist in the same module. The dispatch page creates orphaned modal printouts with hardcoded driver dummy data instead of generating trackable Delivery Note entities in `DeliveryNoteListPage`.
- **Severity & Confidence:** **P1 (High)** | Confirmed (Code-level inspection)
- **Related Screens:** `/inventory/delivery-notes`, `/inventory/delivery-notes/new`
- **Component Paths:** `src/features/inventory/DispatchPage.tsx`, `src/features/inventory/DeliveryNoteModal.tsx`, `src/features/inventory/delivery-notes/DeliveryNoteCreatePage.tsx`
- **Recommended Direction:** Retire `DeliveryNoteModal.tsx` and have the "Create Delivery Note" action on `DispatchPage.tsx` navigate to `/inventory/delivery-notes/new?orderId=${order.id}`.
- **Scope & Fix Type:** Workflow consolidation.
- **Dependencies & Business Rules:** Must advance order fulfillment status to `DISPATCHED`.

---

### Finding INV-006: Company Branding Text Inconsistency in Printable Delivery Note
- **Module & Affected Routes:** Inventory — `/inventory/delivery-notes/:id`, `PrintableDeliveryNote.tsx`
- **Page Type & Task:** Printable A4 Dispatch Document
- **Issue Category:** 3.8 Navigation and branding / 3.11 Text quality
- **Observed Behavior & Evidence:**
  - In `PrintableDeliveryNote.tsx` (line 59):
    `DNS ENGINEERING & ELECTRICALS (PVT) LTD`
  - In `StandardPurchaseOrderTemplate.tsx` (line 147):
    `DNS DISTRIBUTION (PVT) LTD`
  - In `StandardInvoiceTemplate.tsx`:
    `DNS DISTRIBUTION (PVT) LTD`
  - In `ThermalReceiptModal.tsx`:
    `DNS DISTRIBUTION (PVT) LTD`
- **Why It Matters:** Printing formal commercial documents with conflicting registered company names (`DNS Engineering & Electricals` vs `DNS Distribution`) creates legal and corporate identity inconsistencies for consignees and transport authorities.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** All printable documents across Purchasing, Sales, and Inventory.
- **Component Paths:** `src/features/inventory/delivery-notes/PrintableDeliveryNote.tsx`
- **Recommended Direction:** Standardize the company trading name across all printed document headers to `DNS DISTRIBUTION (PVT) LTD`.
- **Scope & Fix Type:** Branding copy alignment.
- **Dependencies & Business Rules:** None.

---

### Finding INV-007: Modal Overlay Print vs Dedicated Print Route for Delivery Notes
- **Module & Affected Routes:** Delivery Notes vs Purchase Orders & Invoices
- **Page Type & Task:** Document Printing & Physical A4 Formatting
- **Issue Category:** 3.1 Layout and responsive behavior / 3.8 Navigation and branding
- **Observed Behavior & Evidence:**
  - Delivery Notes render printable A4 sheets via a full-screen fixed overlay modal (`PrintableDeliveryNote.tsx` with `fixed inset-0 z-50 ... print:static`).
  - Purchase Orders use a dedicated print preview route (`/purchasing/orders/:id/print`) with `A4PurchaseOrderViewer.tsx`, responsive container scaling, zoom buttons (75%, 100%, 125%, Fit), and multi-page pagination.
  - Invoices use `A4InvoiceViewer.tsx` inside `InvoiceDetailPage.tsx`.
- **Why It Matters:** Inconsistent document preview UX. Modal printing obscures the viewport and lacks zoom controls, while dedicated print preview routes provide realistic paper inspection.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/purchasing/orders/:id/print`, `/invoices/:id`
- **Component Paths:** `src/features/inventory/delivery-notes/PrintableDeliveryNote.tsx`, `src/features/purchasing/components/A4PurchaseOrderViewer.tsx`
- **Recommended Direction:** Align Delivery Note printing to the canonical `A4DocumentViewer` pattern with zoom and multi-page pagination controls.
- **Scope & Fix Type:** Shared component adoption.
- **Dependencies & Business Rules:** None.

---

### Finding INV-008: Stripped, Bare Page Headers in `OrderPickingPage.tsx` and `DispatchPage.tsx`
- **Module & Affected Routes:** Inventory — `/inventory/picking`, `/inventory/dispatch`
- **Page Type & Task:** Warehouse Picking Slips & Outbound Staging
- **Issue Category:** 3.8 Navigation and branding
- **Observed Behavior & Evidence:**
  - In `OrderPickingPage.tsx` (line 93):
    `<h1 className="text-2xl font-bold">Order Picking</h1>`
  - In `DispatchPage.tsx` (line 86):
    `<h1 className="text-2xl font-bold">Dispatch &amp; Delivery</h1>`
  - Both screens present bare headings with zero descriptive captions, zero icons, zero role badges, and no breadcrumbs.
  - In contrast, `GRNListPage.tsx`, `DeliveryNoteListPage.tsx`, and `InventoryDashboardPage.tsx` render rich enterprise headers with icons, role badges, and summary subtitles.
- **Why It Matters:** Visual hierarchy degradation between adjacent screens in the same warehouse workflow.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/inventory/grn`, `/inventory/delivery-notes`
- **Component Paths:** `src/features/inventory/OrderPickingPage.tsx`, `src/features/inventory/DispatchPage.tsx`
- **Recommended Direction:** Upgrade headers to follow the standard layout: icon + page title + subtitle caption.
- **Scope & Fix Type:** Local layout polish.
- **Dependencies & Business Rules:** None.

---

### Finding INV-009: Inconsistent Movement Badges and Missing Table Pagination
- **Module & Affected Routes:** Inventory — `/inventory/movements` (`StockMovementsPage.tsx`)
- **Page Type & Task:** Perpetual Inventory Ledger & Audit Records
- **Issue Category:** 3.5 Tables and line-item presentation / 3.7 Actions, statuses, and permissions
- **Observed Behavior & Evidence:**
  - In `StockMovementsPage.tsx`, movement badges declare a local helper `getMovementColor()` with raw Tailwind classes (`bg-emerald-50`, `bg-blue-50`, `bg-orange-50`), differing from the rest of the system.
  - The movements table renders all historical records in a single unpaginated list without `PaginationControls`, causing performance degradation as transaction volume grows.
- **Why It Matters:** Unpaginated ledger tables create infinite DOM nodes and slow down warehouse tablets; local badge styling drifts from system badge tokens.
- **Severity & Confidence:** **P2 (Medium)** | Confirmed (Code-level inspection)
- **Related Screens:** `/inventory/stock`, `/orders/activity-log`
- **Component Paths:** `src/features/inventory/StockMovementsPage.tsx`, `src/components/common/PaginationControls.tsx`
- **Recommended Direction:** Add `<PaginationControls />` to `StockMovementsPage` and adopt semantic badge tokens.
- **Scope & Fix Type:** Local page enhancement.
- **Dependencies & Business Rules:** Must preserve immutable movement audit trail.

---

## 4. Inventory Module Inconsistency Summary Matrix

| Finding ID | Route(s) | Category | Severity | Confidence | Root Cause | Recommended Canonical Pattern |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **INV-001** | `/inventory/damaged-stock` | Workflow & Routing | **P1** | Confirmed | Complete page omitted from `App.tsx` | Register route in `App.tsx` |
| **INV-002** | `/inventory/grn/new` | Workflow & Selectors | **P0** | Confirmed | GRN receiving maps hardcoded `MOCK_PURCHASE_ORDERS` | Connect to live `PurchaseOrderService` |
| **INV-003** | `/inventory/grn/new` | Selectors & Overlays | **P0** | Confirmed | Hardcoded 4-supplier array in manual GRN | Connect to `useFinanceLedger().suppliers` |
| **INV-004** | `/inventory` | Tables & Logic | **P0** | Confirmed | Hardcoded brand filter drops non-power tool stock | Remove brand filter; use category selector |
| **INV-005** | `/inventory/dispatch` | Workflow & Modals | **P1** | Confirmed | Legacy modal with hardcoded driver details | Route to `/inventory/delivery-notes/new` |
| **INV-006** | `PrintableDeliveryNote.tsx` | Branding & Typography | **P2** | Confirmed | "DNS Engineering" vs "DNS Distribution" | Standardize on "DNS Distribution (Pvt) Ltd" |
| **INV-007** | `PrintableDeliveryNote.tsx` | Layout & Printing | **P2** | Confirmed | Modal overlay print vs dedicated A4 preview | Canonical `A4DocumentViewer` pattern |
| **INV-008** | `/inventory/picking`, `/dispatch` | Navigation & Branding | **P2** | Confirmed | Bare h1 headings lacking subtitles and icons | Canonical page header anatomy |
| **INV-009** | `/inventory/movements` | Tables & Pagination | **P2** | Confirmed | Unpaginated ledger table & local badge styling | Canonical `PaginationControls` + semantic badge |

---

## 5. Verification Status & Remaining Scope

- **Inspected Routes:** All 11 active Inventory routes + 1 orphaned route inspected across code, types, services, and templates.
- **Verification Method:** Static code inspection, route mapping, cross-module data flow analysis, and layout hierarchy review.
- **Status of Batch 3:** **Complete.**
- **Next Batch:** **Batch 4: Finance & Accounting Module** (`/finance/dashboard`, `/finance/accounts`, `/finance/suppliers`, `/finance/journal/new`, `/finance/ap/*`, `/finance/ar/*`, `/finance/reconciliation`, `/finance/settings/closing`, `/finance/reports/*`).
