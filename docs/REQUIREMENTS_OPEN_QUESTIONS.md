# Requirements Open Questions & Ambiguities

As mandated by Section 87 and Section 105 of the Master Implementation Guide:
*Do not silently invent business rules when requirements are unclear; document them as REQUIRES CONFIRMATION and apply safe sensible defaults.*

| ID | Item | Ambiguity / Baseline Observation | Safe Assumption Applied | Status |
|---|---|---|---|---|
| Q-001 | Maximum Allowed Rep Discount Threshold | Baseline specifies reps have discount limits, but doesn't specify if it is fixed across all reps or per category. | Configured as a rep-level default threshold (e.g. 5%) and customer-tier allowed discount (e.g. 10%). Any discount exceeding both triggers Special Approval. | REQUIRES CONFIRMATION |
| Q-002 | Credit Days Escalation Threshold | Guide states standard customer terms route to Manager, while non-standard (e.g. high credit days) route to Director. | Credit days <= 30 route to Manager; credit days > 30 days or credit limit > 1,000,000 LKR route to Director. | REQUIRES CONFIRMATION |
| Q-003 | Minimum Margin for Product Selling Price | Guide mentions Manager sets selling price, and Director approval is required if exceptional. | If selling price margin is below 15% over cost price, Director approval is mandated. | REQUIRES CONFIRMATION |
| Q-004 | Barcode Generation Scheme | Guide states restocking existing products must reuse existing barcode without duplicating identities, but format for newly created items is unspecified. | Use standard EAN-13 compatible or Code-128 numeric prefix (`890` + 10-digit sequential SKU). | REQUIRES CONFIRMATION |
| Q-005 | IRD Tax Format Details | Master guide specifies IRD-compatible invoice format without finalizing exact legal tax schedule. | Provide configurable Tax Breakdown (VAT 18%, SSCL 2.5%, or Exempt) with preview and export. | REQUIRES CONFIRMATION |
| Q-006 | Cashier POS Maximum Cash Variance | When closing a cashier shift, allowed cash discrepancy before manager sign-off is required. | Variance > 500 LKR flags warning and requires manager override note. | REQUIRES CONFIRMATION |
