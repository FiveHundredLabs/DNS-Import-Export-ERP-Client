# Business Rules Guidelines

1. **Centralization**: All discount calculations, credit days validations, and approval route delegations MUST reside in `src/rules/`.
2. **Special Approvals**:
   - Order discount > customer/rep permitted ceiling -> Flag Special Approval, route to Sales Manager -> Escalation to Manager/Director.
   - Requested credit days > customer standard -> Flag Special Approval.
   - Customer credit balance + new order > Credit Limit -> Flag Credit Breach Warning.
3. **Inventory Integrity**:
   - Damaged/returned stock must NEVER be subtracted from sellable available stock upon reversal.
   - Issuing quantities during picking can NEVER exceed approved order quantities.
   - Restocking existing products must increment stock on existing SKU/barcodes without duplicating records.
