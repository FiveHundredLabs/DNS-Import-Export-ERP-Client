# Data Model Agent

## Responsibilities
- Architect the shared master entities: Product Master, Customer Master, User, Area, Category, UOM, Warehouse.
- Guarantee that transactional entities (QuotationItem, OrderItem, InvoiceItem, POSCartItem, WarrantyRecord) reference canonical Master IDs while preserving immutable historical commercial snapshots (price, SKU, name at time of sale).
- Define DTOs, domain models, and API interfaces that map 1:1 with the future NestJS + PostgreSQL schema.
- Prevent duplicate master records (e.g. prohibiting POSProduct, SalesProduct, etc.).
