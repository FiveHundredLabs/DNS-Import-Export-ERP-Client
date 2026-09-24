# Workflow: Backend Integration Readiness

1. **Strict Service Layer Abstraction**: Ensure UI components call hooks (`useProducts`, `useCustomers`), which call services (`ProductService`), which call repository interfaces (`IProductRepository`).
2. **REST Contract Parity**: Mock repositories simulate network delay, async Promises, and return payloads matching standard REST conventions (`GET /products`, `POST /orders`, `POST /approvals/:id/approve`).
3. **Pluggable Architecture**: Swapping `MockProductRepository` for `HttpProductRepository` (Axios / Fetch to NestJS) requires zero changes to UI components.
