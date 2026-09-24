# Enterprise Domain Model

## Core Entities & Relationships

### 1. Master Data Entities
- **User**: `id`, `name`, `email`, `role`, `areaId`, `status`, `phone`
- **Area**: `id`, `code`, `name`, `areaManagerId`, `salesManagerId`, `status`
- **Customer**: `id`, `code`, `name`, `type` (Dealer, Showroom, Direct), `areaId`, `assignedRepId`, `contactPerson`, `phone`, `email`, `address`, `creditLimit`, `creditDays`, `discountTier`, `approvalStatus`, `status`
- **Product**: `id`, `sku`, `name`, `description`, `categoryId`, `uomId`, `costPrice`, `sellingPrice`, `minSellingPrice`, `barcode`, `warrantyPeriodMonths`, `isPromotional`, `approvalStatus`, `status`
- **Category**: `id`, `name`, `code`, `description`
- **UnitOfMeasure**: `id`, `code`, `name`, `symbol`
- **Warehouse**: `id`, `code`, `name`, `type` (Main, Showroom, Transit), `location`

### 2. Transactional & Operational Entities
- **StockBalance**: `id`, `productId`, `warehouseId`, `availableQty`, `damagedQty`, `reservedQty`
- **StockMovement**: `id`, `productId`, `warehouseId`, `type` (GRN, ISSUE, TRANSFER, RETURN, DAMAGE_WRITE_OFF), `quantity`, `referenceId`, `createdAt`
- **Quotation**: `id`, `quotationNumber`, `customerId`, `salesRepId`, `items`, `subtotal`, `discountAmount`, `taxAmount`, `totalAmount`, `status` (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, CONVERTED_TO_ORDER), `validUntil`
- **SalesOrder**: `id`, `orderNumber`, `quotationId` (optional), `customerId`, `salesRepId`, `items`, `subtotal`, `discountAmount`, `totalAmount`, `requestedCreditDays`, `isSpecialOrder`, `specialReason`, `status` (DRAFT, PENDING_APPROVAL, SPECIAL_APPROVAL, APPROVED, PICKING, ISSUED, INVOICED, DISPATCHED, DELIVERED, REJECTED, CANCELLED)
- **Invoice**: `id`, `invoiceNumber`, `orderId`, `customerId`, `items`, `subtotal`, `taxAmount`, `totalAmount`, `paidAmount`, `balanceAmount`, `dueDate`, `status` (ISSUED, PARTIALLY_PAID, PAID, OVERDUE)
- **Payment**: `id`, `receiptNumber`, `customerId`, `invoiceId` (optional allocation), `amount`, `paymentMethod` (CASH, CHEQUE, BANK_TRANSFER), `chequeNumber`, `chequeDate`, `status` (PENDING_FINANCE_APPROVAL, APPROVED, REJECTED), `collectedById`
- **ApprovalRequest**: `id`, `documentType` (CUSTOMER, PRODUCT_PRICE, QUOTATION, ORDER, GRN, PAYMENT), `documentId`, `initiatorId`, `currentApproverRole`, `status`, `history`
- **WarrantyRecord**: `id`, `productId`, `invoiceId`, `customerId`, `serialNumber`, `soldDate`, `warrantyExpiryDate`, `notes`
- **WarrantyClaim**: `id`, `warrantyRecordId`, `customerId`, `productId`, `complaintDate`, `complaintReason`, `resolutionStatus`, `resolutionDetails`
- **CashierShift**: `id`, `cashierId`, `openedAt`, `closedAt`, `openingFloat`, `expectedCash`, `actualCash`, `variance`, `status` (OPEN, CLOSED)
- **AuditLog**: `id`, `userId`, `role`, `module`, `action`, `recordId`, `previousState`, `newState`, `reason`, `timestamp`

### 3. Historical Snapshot Pattern
Transactional line items (`QuotationItem`, `SalesOrderItem`, `InvoiceItem`, `POSCartItem`) encapsulate:
```typescript
interface TransactionItemSnapshot {
  productId: string;
  productSkuSnapshot: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  discountPercentage: number;
  discountAmount: number;
  quantity: number;
  total: number;
}
```
This guarantees that price changes to `Product` never retroactively mutate past sales orders or invoices.
