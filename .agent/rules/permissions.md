# Role & Permission Rules

1. **Role Scope**:
   - `DIRECTOR`: Global visibility, final approval on special credits, price changes, exceptional discounts.
   - `MANAGER`: User management, area creation, GRN approval, operational oversight, escalation receiver.
   - `SALES_MANAGER`: Sales team management, standard order/quotation approvals, warranty claims, customer terms review.
   - `FINANCE_MANAGER`: Payment approvals, petty cash, expense categorization, financial health statements.
   - `AREA_MANAGER`: Area-assigned reps and customers, basic customer creation, field sales monitoring.
   - `SALES_REP`: Assigned customers only, mobile-first customer hub, quotation & order initiation, collection logging.
   - `STOCK_KEEPER`: Warehouse stock balances, GRN entry, picking, issue, dispatch, return inspection.
   - `CASHIER`: Showroom POS sales, cash session opening/closing, payment entry, receipt issuance.
2. **Access Control**:
   - Check permissions at route level via `ProtectedRoute`.
   - Check permissions in navigation items via `hasPermission()`.
   - Gate actionable buttons via `canExecuteAction()`.
