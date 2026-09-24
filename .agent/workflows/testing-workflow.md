# Workflow: Testing & Verification

1. **Unit Verification**: Run tests on pure business rules (`discountRules`, `creditRules`, `approvalRules`).
2. **Component & Form Verification**: Validate form schemas with valid and boundary invalid payloads.
3. **Master Data Integrity Verification**: Verify that Product Master and Customer Master changes propagate predictably without mutating past invoices.
4. **Security Verification**: Attempt unauthorized status mutations and verify that RBAC guards prevent execution.
5. **Execution**: All automated tests run via `npm run test` or `vitest run`.
