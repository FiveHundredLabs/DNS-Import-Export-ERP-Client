# Naming & Conventions

1. **Files & Directories**:
   - React components: PascalCase (e.g. `ProductTable.tsx`, `CustomerDetailModal.tsx`).
   - Hooks: camelCase with `use` prefix (e.g. `useProducts.ts`, `useAuth.ts`).
   - Domain rules: camelCase with `Rules` suffix (e.g. `discountRules.ts`).
   - Repositories: Interface `I{Entity}Repository.ts`, implementation `Mock{Entity}Repository.ts`.
   - Feature directories: kebab-case (e.g. `sales-orders`, `customer-hub`, `product-master`).
2. **Identifiers**:
   - Enums / Status constants: UPPER_SNAKE_CASE (e.g. `ORDER_STATUS.APPROVED`).
   - Types and Interfaces: PascalCase (e.g. `Product`, `Customer`, `ApprovalAction`).
