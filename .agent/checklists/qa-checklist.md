# Quality Assurance Checklist

- [ ] Unit tests pass: `npm run test` (Vitest)
- [ ] TypeScript typecheck passes: `npx tsc --noEmit`
- [ ] Production build succeeds: `npm run build`
- [ ] Tested across all 8 user roles (Director down to Cashier)
- [ ] Approval workflow tested for standard and exceptional cases
- [ ] Master data integrity verified: price edit doesn't mutate existing invoice
- [ ] Mobile/tablet touch interactions responsive
