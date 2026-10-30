# DNS ERP — Role & Permission Enforcement Matrix

**Document ID:** `docs/implementation/01-role-permission-matrix.md`  
**Security Reference File:** `src/rules/permissions.ts`  
**Test Suite Reference:** `src/test/roleSecurity.test.ts`  

---

## 1. Permission Keys and Definition

| Permission Key | Description | Module Domain |
|---|---|---|
| `quotations:read` | View quotation lists and detail views | Sales |
| `quotations:create` | Create new customer quotations | Sales |
| `quotations:edit` | Edit draft quotations | Sales |
| `orders:read` | View sales orders and tracking | Sales |
| `orders:create` | Place new enterprise sales orders | Sales |
| `orders:edit` | Edit orders in Draft or Pending states | Sales |
| `orders:close` | Full or partial Sales Order closure | Sales |
| `invoices:read` | View sales invoices | Invoicing |
| `invoices:create` | Generate sales invoice from Sales Order | Invoicing |
| `payments:read` | View payment collections and receipts | Finance |
| `payments:collect` | Execute payment collections against invoices | Finance |
| `inventory:read` | View stock balances, movements, and stock cards | Inventory |
| `inventory:movements` | Log stock adjustments and movements | Inventory |
| `inventory:damaged` | View and manage damaged stock quarantine | Inventory |
| `inventory:recovery` | Authorize and execute damaged-stock recovery | Inventory |
| `inventory:grn` | Create and review Goods Received Notes | Inventory |
| `inventory:dispatch` | Create Delivery Notes and pick orders | Inventory |
| `pos:operate` | Operate Showroom Point of Sale terminal & shifts | POS |
| `pos:override_discount`| Authorize POS cashier discount override via key | POS / Retail |
| `purchasing:read` | View purchase orders and suppliers | Purchasing |
| `purchasing:create` | Create draft purchase orders | Purchasing |
| `purchasing:returns` | Manage purchase returns and debit notes | Purchasing |
| `finance:read` | View general ledger, trial balance, and reports | Finance |
| `finance:journal` | Post double-entry manual journal entries | Finance |
| `finance:cashbook` | Manage Cash Book and Payment Vouchers | Finance |
| `approvals:orders` | Commercial approval for sales orders and discounts | Approvals |
| `approvals:purchasing`| Procurement approval for purchase orders | Approvals |
| `approvals:vouchers` | Disbursement approval for payment vouchers | Approvals |
| `reports:executive` | View company-wide executive reports and analytics | Analytics |

---

## 2. Role-to-Permission Mapping Matrix

| Permission | `SALES_REP` | `AREA_MANAGER` | `SALES_MANAGER` | `PURCHASING_OFFICER` | `PURCHASING_MANAGER` | `STOCK_KEEPER` | `STOCK_MANAGER` | `MANAGER` | `DIRECTOR` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `quotations:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `quotations:create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `orders:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `orders:create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `orders:close` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `invoices:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `invoices:create` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `payments:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `payments:collect` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `inventory:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `inventory:grn` | ❌ | ❌ | ❌ | ✅ (Read) | ✅ (Read) | ✅ | ✅ | ✅ | ✅ |
| `inventory:dispatch` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `inventory:damaged` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `inventory:recovery`| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `pos:operate` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `pos:override_discount`|❌| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `purchasing:read` | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `purchasing:create` | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `purchasing:returns`| ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `finance:cashbook` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `finance:journal` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `approvals:orders` | ❌ | ✅ (<=10%)| ✅ (<=15%)| ❌ | ❌ | ❌ | ❌ | ✅ (>15%) | ✅ |
| `approvals:purchasing`|❌| ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `approvals:vouchers`| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `reports:executive` | ❌ | ❌ | ✅ (Sales) | ❌ | ✅ (Proc.) | ❌ | ❌ | ✅ | ✅ |
