# Mock Data Architecture Rules

1. **Enterprise Realism**: Use realistic names, SKUs, addresses, currency (LKR / USD), and tax calculations. Never use "Test 123", "John Doe", or "Foo".
2. **Isolation**: Mock data repositories reside under `src/repositories/mock/` and are injected through the service container.
3. **Immutability of Master Identity**: Mock records must maintain referential integrity. All transactional mock items reference real IDs from `mockProducts` and `mockCustomers`.
