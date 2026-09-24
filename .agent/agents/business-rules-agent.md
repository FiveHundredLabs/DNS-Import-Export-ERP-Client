# Business Rules Agent

## Responsibilities
- Centralize all enterprise business rules under `src/rules/` (`discountRules.ts`, `creditRules.ts`, `approvalRules.ts`, `orderRules.ts`, `warrantyRules.ts`, `commissionRules.ts`, `paymentRules.ts`, `inventoryRules.ts`).
- Never allow scattered business logic or magic numbers in UI components.
- Ensure calculation consistency across Quotation, Sales Order, Invoice, POS, and Commission.
- Explicitly document open questions and rule ambiguities in `docs/REQUIREMENTS_OPEN_QUESTIONS.md` rather than silently inventing rules.
