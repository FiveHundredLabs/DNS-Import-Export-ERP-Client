# Report Implementation Plan

This document outlines the step-by-step plan to develop and integrate all the missing and partially developed reports across the ERP system.

## 1. Sales Reports
- **Credit Limit & Credit-Exceeded Exception Report:** (Missing) 
  - *Data Source:* `CustomerService`, `OrderService`, `ApprovalService`.
  - *Implementation:* Create `getCreditExceptions()` in `ReportService` that tracks orders that triggered credit limits, their approval status, and the approving authority.
  - *UI:* Add a tab/section in the Sales Analytics tab or a new exceptions tab.
- **Commission-linked Sales:** (Missing)
  - *Data Source:* `CommissionService`, `InvoiceService`.
  - *Implementation:* Correlate invoice item sales with the applied commission rules and rates to show gross sales vs commissionable sales.
- **Customer-wise / Dealer-wise Sales:** (Partially Developed)
  - *Current State:* Summarized in Top Customers.
  - *Action:* Enhance `getSalesReport()` to provide detailed individual transactional volume and purchase history.
- **Product-wise Sales:** (Partially Developed)
  - *Current State:* Aggregated total sales.
  - *Action:* Integrate cost-to-selling margin calculation, current available quantity, and warehouse vs. showroom source tracking.
- **Cheque Realization & Collection Aging Report:** (Partially Developed)
  - *Current State:* Basic collections.
  - *Action:* Track collected cheque numbers, deposit dates, due dates, and clearance statuses from `PaymentService`.

## 2. Commission Reports (12.4)
- **Performance-Based Commission Report:** (Missing)
  - *Implementation:* Integrate tiered target achievement percentages to dynamically calculate payable commissions per rep.
- **Commission Adjustments & Override Audit Report:** (Missing)
  - *Implementation:* Log and retrieve any manual overrides or adjustments to standard commission payouts.
- **Weekly / Monthly Sales Performance & Payout Summary:** (Missing)
  - *Implementation:* Provide aggregated payout statements suitable for payroll integration.
- **Target-to-Achievement Commission Report:** (Partially Developed)
  - *Current State:* Shows target vs achievement.
  - *Action:* Add actual calculated commission payout output based on targets.

## 3. POS Reports (12.5)
- **Cashier Collection & Till Reconciliation Report:** (Missing)
  - *Implementation:* `getTillReconciliation()` in `ReportService`. Compares POS expected cash/card vs actual declared amounts.
- **Cheque Register / Pending Clearance Report (POS):** (Missing)
  - *Implementation:* List all cheques collected via POS awaiting clearance.
- **Void / Exception & Audit Log (POS):** (Missing)
  - *Implementation:* Track voided transactions, cancelled invoices, and deleted items.
- **Daily Showroom Sales Summary:** (Partially Developed)
  - *Current State:* Blended into `getSalesReport()`.
  - *Action:* Create a dedicated EOD showroom counter summary separating cash, card, and walk-in sales.

## 4. Inventory Reports (12.2)
- **Old Stock Tracking:** (Missing)
  - *Implementation:* Identify inventory that hasn't moved for over a specified threshold (e.g., 90/180 days).
- **GRN (Goods Received Note) Summary / Receiving Report:** (Missing)
  - *Implementation:* Summarize goods received from `GRNService` over time.
- **Batch-wise / Lot Stock Expiration & Age Report:** (Missing)
  - *Implementation:* Track batch numbers and expiry dates for perishable/warranty-sensitive items.
- **Stock Adjustment & Variance Report:** (Missing)
  - *Implementation:* Audit trail of manual stock adjustments and shrinkages.
- **Stock Movement & Consumption Audit Report:** (Missing)
  - *Implementation:* Track stock velocity between warehouse, showroom, and delivery vehicles.
- **Slow-moving and Fast-moving Analysis:** (Partially Developed)
  - *Current State:* Fast-moving available.
  - *Action:* Add slow-moving identification based on stock velocity metrics.

## Execution Strategy
1. **Types:** Define the TypeScript interfaces in `src/types/reports.ts` for all the above reports.
2. **Backend (Services):** Implement getter methods in `ReportService` that aggregate data from the respective domain services (POS, Invoice, Inventory, Commission, etc.).
3. **Frontend (Hooks/Context):** Update `useReports.ts` to fetch and store these new report data structures.
4. **Frontend (UI Components):** Add corresponding tabs (e.g., `CommissionAnalyticsTab.tsx`, `PosAnalyticsTab.tsx`) or sections in `ReportsPage.tsx` and the existing tabs to render these datasets using charts and tables.
