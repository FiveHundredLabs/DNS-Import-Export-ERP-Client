# Architectural Rules

1. **Single Source of Truth**: Exactly one Product Master and one Customer Master across the entire application. Prohibit `POSProduct`, `SalesCustomer`, etc.
2. **Layer Inversion**: UI -> Hooks -> Services -> Repositories -> API. No direct local storage or raw mock array access in JSX.
3. **Transaction Snapshots**: Completed documents (Quotations, Orders, Invoices) capture point-in-time snapshots of product names, SKUs, and unit prices so master data edits do not corrupt historical data.
4. **State Machine Integrity**: Document statuses can only transition through authorized events, accompanied by audit trail records.
