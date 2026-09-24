# Workflow: Feature Development

1. **Understand Requirement**: Review master requirement matrix and determine involved roles.
2. **Domain Model & Types**: Define clean TypeScript types under `src/types/`. Ensure reference to canonical master data (Product Master, Customer Master).
3. **Business Rules**: Implement logic in `src/rules/` with pure functions. Add unit tests for edge conditions.
4. **Mock Repository & Service**: Implement repository interface and mock implementation under `src/repositories/` and `src/services/`.
5. **UI & Forms**: Build components with React Hook Form + Zod validation. Connect via custom hooks.
6. **State Handling**: Add loading skeletons, error states with retry, empty states with call to action.
7. **Role RBAC**: Gate routes and action buttons according to the permission matrix.
8. **Toast & Feedback**: Trigger Sonner toasts for mutations with explanatory messages.
9. **Automated Tests**: Write component and workflow tests.
10. **Phase Gate**: Verify no lint errors, passing test suite, and documented decisions.
