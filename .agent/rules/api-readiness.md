# API Readiness Rules

1. Define clear DTOs and API interfaces under `src/types/api/`.
2. Repositories must return typed Promises matching future NestJS endpoint responses (`ApiResponse<T>`).
3. Methods follow RESTful conventions: `findAll(filters)`, `findById(id)`, `create(dto)`, `update(id, dto)`, `approve(id, comment)`.
4. Ensure pagination, sorting, and search query parameters match future NestJS query decorators.
