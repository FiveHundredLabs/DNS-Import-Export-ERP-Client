# Testing Rules

1. Never write tests that test implementation details; test behaviors and business contracts.
2. Every domain rule file in `src/rules/` must have a corresponding `.test.ts`.
3. Edge cases are required: 0 quantity, max discounts, boundary credit limits, empty lists, special escalation paths.
4. Verify non-regression on master data updates vs historical snapshots.
