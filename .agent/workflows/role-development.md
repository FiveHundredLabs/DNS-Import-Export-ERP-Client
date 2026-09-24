# Workflow: Role-Based Experience Development

1. Identify role privileges across the 8 ERP personas:
   - Director
   - Manager
   - Sales Manager
   - Finance Manager
   - Area Manager
   - Sales Representative
   - Stock Keeper
   - Cashier / POS
2. Configure permission flags in `src/rules/permissions.ts`.
3. Provide dedicated dashboard layouts matching the exact operational mandate of each role.
4. Filter navigation menus and routes so unauthorized modules are strictly inaccessible.
5. Hide or disable action buttons (e.g. "Approve Order", "Override Discount") for unauthorized roles.
