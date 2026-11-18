# DNS ERP — Frontend–Backend Integration Guide
## Standard Reference for All Modules

**Version:** 1.0  
**Established:** 2026-11-18  
**Repository:** `d:\dns erp` (Frontend)  
**Author:** DNS ERP Engineering Team

> This guide defines the **mandatory standard** for every frontend–backend API integration across the DNS ERP system. All current and future modules must follow this workflow. Customer Onboarding is the pilot module that proves the pattern.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & Setup](#2-prerequisites--setup)
3. [Stage 1: Axios Client Foundation](#3-stage-1-axios-client-foundation)
4. [Stage 2: TanStack Query Global Config](#4-stage-2-tanstack-query-global-config)
5. [Stage 3: Zustand State Stores](#5-stage-3-zustand-state-stores)
6. [Stage 4: Module API Layer (Per Module)](#6-stage-4-module-api-layer-per-module)
7. [Stage 5: Connecting Pages to Real APIs](#7-stage-5-connecting-pages-to-real-apis)
8. [Stage 6: Removing Mock Data](#8-stage-6-removing-mock-data)
9. [Stage 7: Permission-Aware UI](#9-stage-7-permission-aware-ui)
10. [Stage 8: Performance Optimizations](#10-stage-8-performance-optimizations)
11. [Testing Each Integration](#11-testing-each-integration)
12. [Common Patterns Reference](#12-common-patterns-reference)
13. [What NEVER to Do](#13-what-never-to-do)
14. [Module Migration Checklist](#14-module-migration-checklist)

---

## 1. Architecture Overview

Every API integration in this system follows a strict 5-layer chain:

```
[Page / Component]
        │  reads data via / triggers mutation via
        ▼
[TanStack Query Hook]        src/api/<module>/<module>.hooks.ts
        │  calls pure function
        ▼
[Module API Service]         src/api/<module>/<module>.api.ts
        │  calls
        ▼
[Centralized Axios Client]   src/api/client.ts
        │  HTTP REST over network
        ▼
[NestJS Backend Controller]  /api/v1/<module>
```

**Key principle:** No page or component ever calls `axios` or `apiClient` directly. All network calls go through a module API service, which is consumed by a TanStack Query hook, which is consumed by the page.

### Directory Structure

```
src/
├── api/
│   ├── client.ts                  ← Single shared Axios instance
│   ├── customers/
│   │   ├── customers.api.ts       ← API functions (no React)
│   │   ├── customers.types.ts     ← TypeScript contracts (mirror backend DTOs)
│   │   └── customers.hooks.ts     ← TanStack Query hooks + query keys
│   ├── areas/
│   │   ├── areas.api.ts
│   │   ├── areas.types.ts
│   │   └── areas.hooks.ts
│   └── [one folder per module]
├── store/
│   ├── auth.store.ts              ← Zustand: current user, role, auth state
│   └── ui.store.ts               ← Zustand: sidebar, theme
└── hooks/
    ├── useDebounce.ts             ← Shared search debounce utility
    └── usePagination.ts           ← Shared pagination state utility
```

---

## 2. Prerequisites & Setup

Before implementing any module integration, ensure these one-time setups are complete.

### Check Package Availability

```bash
# In d:\dns erp
npm list @tanstack/react-query zustand axios
```

Expected: all three are already installed. If not:
```bash
npm install @tanstack/react-query zustand
```

### Verify Backend is Running

```bash
# In d:\dns erp-backend
npm run start:dev
```

Confirm `http://localhost:3000/api/v1/customers` returns a valid paginated response (requires auth cookie).

### TypeScript Baseline

Before touching any files, record the current error count:
```bash
cd "d:\dns erp"
npx tsc --noEmit 2>&1 | Measure-Object -Line
```
Save this number. After each stage, the count should not increase.

---

## 3. Stage 1: Axios Client Foundation

**File:** `src/api/client.ts`  
**Replace:** `src/api/axios.ts`  
**One-time setup — shared by all modules**

### What This File Does

- Holds the single Axios instance for the entire frontend.
- Injects JWT Bearer token on every request.
- Silently refreshes expired tokens (single-flight — no duplicate refresh calls).
- Handles 401 without a full page reload.
- Injects `X-Request-ID` on every request.
- Provides typed helper functions that unwrap the backend `{ success, data }` envelope.
- Passes `AbortSignal` from TanStack Query to Axios for automatic request cancellation.

### Key Differences from Old `axios.ts`

| Old Behaviour | New Behaviour |
|---|---|
| `window.location.replace('/login')` on 401 | Dispatch a custom `auth:logout` DOM event — React Router handles redirect without full reload |
| Callers receive `AxiosResponse<{ data: T }>` | Callers receive `T` directly |
| No AbortSignal support | `signal` parameter threaded through all helpers |

### Testing Stage 1

After creating `client.ts`:
1. Temporarily call `apiGet<{ message: string }>('/health')` from a test component.
2. Confirm the response arrives typed and unwrapped.
3. Confirm that navigating away mid-request does not throw an unhandled error (AbortController fires).
4. Remove the test call.

---

## 4. Stage 2: TanStack Query Global Config

**File:** `src/main.tsx`  
**One-time setup — shared by all modules**

### Configuration

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,            // 1 minute — operational list data
      gcTime: 300_000,              // 5 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: false,  // ERP app — no surprise refetches
    },
    mutations: {
      retry: 0,                     // Never retry mutations automatically
    },
  },
});
```

Wrap the root:
```tsx
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### Stale-Time Policy by Data Type

| Data Type | staleTime | Reason |
|---|---|---|
| Operational lists (customers, orders) | `60_000` | Frequently updated |
| Reference data (areas, roles, users) | `300_000` | Rarely changes |
| Financial data (invoices, payments, stock) | `0` | Always fresh — data integrity |
| Auth user profile | `Infinity` | Stored in Zustand, never re-fetched |

### Testing Stage 2

1. Run `npm run build` — confirm no errors.
2. Open React Query DevTools (install `@tanstack/react-query-devtools` for dev) to confirm `QueryClient` is active.

---

## 5. Stage 3: Zustand State Stores

**Files:** `src/store/auth.store.ts`, `src/store/ui.store.ts`  
**One-time setup — shared by all modules**

### Rule: Zustand vs TanStack Query

| State | Correct Tool |
|---|---|
| **Server data** (customers, orders, inventory) | ✅ TanStack Query |
| **Auth user identity** (who is logged in, their role) | ✅ Zustand |
| **UI state** (sidebar open, theme color, modal open) | ✅ Zustand |
| Duplicating TanStack cache data in Zustand | ❌ Never |

### Auth Store

```typescript
// src/store/auth.store.ts
import { create } from 'zustand';

interface AuthState {
  currentUser: AuthenticatedUser | null;
  isAuthenticated: boolean;
  setCurrentUser: (user: AuthenticatedUser | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  currentUser: null,
  isAuthenticated: false,
  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  clearAuth: () => set({ currentUser: null, isAuthenticated: false }),
}));
```

### Preserving the Existing `useAuth()` Interface

The existing `useAuth()` hook is used in 50+ components. Do not break it. Make it a thin wrapper:

```typescript
// src/hooks/useAuth.ts (updated)
import { useAuthStore } from '../store/auth.store';

export function useAuth() {
  const { currentUser, isAuthenticated, setCurrentUser, clearAuth } = useAuthStore();
  return { currentUser, isAuthenticated, setCurrentUser, clearAuth };
}
```

No consumer changes required — `useAuth()` continues to work identically.

### Testing Stage 3

1. Confirm `useAuth()` still returns the same shape.
2. `npm run typecheck` — zero new errors.

---

## 6. Stage 4: Module API Layer (Per Module)

This is repeated for **every module** that gets integrated. Customer Onboarding is the pilot.

### Step 4.1 — Create `<module>.types.ts`

Mirror the backend DTOs and Prisma model **exactly**. Do not invent field names.

For Customer module, check:
- `d:\dns erp-backend\src\modules\customers\dto\create-customer-step1.dto.ts`
- `d:\dns erp-backend\src\modules\customers\dto\complete-customer-step2.dto.ts`
- `d:\dns erp-backend\src\modules\customers\dto\customer-query.dto.ts`
- `d:\dns erp-backend\prisma\schema.prisma` → `model Customer`

The response interface must include:
- All `string | null` fields that are nullable in Prisma (not `string | undefined`)
- Decimal fields (`creditLimit`) as `string | null` — Prisma serializes `Decimal` as a string
- Nested relation objects exactly as the backend `select` clause returns them

### Step 4.2 — Create `<module>.api.ts`

```typescript
// src/api/customers/customers.api.ts
import { apiGet, apiPost, apiPatch, apiDelete } from '../client';
import type { CustomerApiResponse, CustomerListParams, PaginatedResponse } from './customers.types';

export const customersApi = {
  list: (params: CustomerListParams, signal?: AbortSignal) =>
    apiGet<PaginatedResponse<CustomerApiResponse>>('/customers', { params, signal }),

  getById: (id: string, signal?: AbortSignal) =>
    apiGet<CustomerApiResponse>(`/customers/${id}`, { signal }),

  getFinancials: (id: string, signal?: AbortSignal) =>
    apiGet<CustomerFinancialsResponse>(`/customers/${id}/financials`, { signal }),

  createStep1: (dto: CreateCustomerStep1Request) =>
    apiPost<CustomerApiResponse>('/customers/onboarding/step-1', dto),

  completeStep2: (id: string, dto: CompleteCustomerStep2Request) =>
    apiPatch<CustomerApiResponse>(`/customers/${id}/onboarding/step-2`, dto),

  updateCommercialTerms: (id: string, dto: UpdateCommercialTermsRequest) =>
    apiPatch<CustomerApiResponse>(`/customers/${id}/commercial-terms`, dto),

  approve: (id: string, dto: CustomerApprovalRequest) =>
    apiPost<CustomerApiResponse>(`/customers/${id}/approve`, dto),

  reject: (id: string, dto: CustomerApprovalRequest) =>
    apiPost<CustomerApiResponse>(`/customers/${id}/reject`, dto),

  updateStatus: (id: string, dto: UpdateCustomerStatusRequest) =>
    apiPatch<CustomerApiResponse>(`/customers/${id}/status`, dto),

  update: (id: string, dto: UpdateCustomerRequest) =>
    apiPatch<CustomerApiResponse>(`/customers/${id}`, dto),

  softDelete: (id: string) =>
    apiDelete<CustomerApiResponse>(`/customers/${id}`),
};
```

### Step 4.3 — Create `<module>.hooks.ts`

```typescript
// src/api/customers/customers.hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from './customers.api';
import type { CustomerListParams } from './customers.types';

// ─── Query Key Factory ────────────────────────────────────────────────────────
export const customerKeys = {
  all:       ['customers'] as const,
  lists:     () => [...customerKeys.all, 'list'] as const,
  list:      (params: CustomerListParams) => [...customerKeys.lists(), params] as const,
  details:   () => [...customerKeys.all, 'detail'] as const,
  detail:    (id: string) => [...customerKeys.details(), id] as const,
  financials:(id: string) => [...customerKeys.all, 'financials', id] as const,
};

// ─── Query Hooks ──────────────────────────────────────────────────────────────
export function useCustomers(params: CustomerListParams = {}) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: ({ signal }) => customersApi.list(params, signal),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: ({ signal }) => customersApi.getById(id, signal),
    enabled: !!id,
  });
}

export function useCustomerFinancials(id: string) {
  return useQuery({
    queryKey: customerKeys.financials(id),
    queryFn: ({ signal }) => customersApi.getFinancials(id, signal),
    enabled: !!id,
    staleTime: 0,  // Always fresh — financial data
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────
export function useCreateCustomerStep1() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCustomerStep1Request) => customersApi.createStep1(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: customerKeys.lists() }); },
  });
}

export function useCompleteCustomerStep2(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CompleteCustomerStep2Request) => customersApi.completeStep2(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.lists() });
      qc.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}

export function useApproveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CustomerApprovalRequest }) =>
      customersApi.approve(id, dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: customerKeys.lists() });
      qc.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}

// ... similar hooks for reject, update, updateStatus, softDelete
```

### Testing Stage 4

Before connecting to any page:
1. Import a hook in a throwaway test component and call it.
2. Verify TypeScript infers the correct response shape.
3. Open Network tab — confirm the HTTP request goes to `/api/v1/customers`.
4. Confirm the cache is populated in React Query DevTools.

---

## 7. Stage 5: Connecting Pages to Real APIs

**Per module — do one page at a time.**

### Process

1. Open the page component (e.g., `CustomerListPage.tsx`).
2. Identify every place that calls the old mock service:
   - `customerService.listCustomers(...)` → replace with `const { data } = useCustomers(params)`
   - `customerService.createCustomer(...)` → replace with `const { mutate } = useCreateCustomerStep1()`
   - etc.
3. Remove the old service import.
4. Remove the old `useState` + `useEffect` + `useCallback` data-fetching boilerplate.
5. Map the new typed response to what the UI expects (using updated field names).
6. Handle `isLoading`, `isError` from TanStack Query (map to existing loading spinners).

### Example — Replacing a Data Fetch

```typescript
// BEFORE (mock service + manual state):
const [customers, setCustomers] = useState<Customer[]>([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  customerService.listCustomers({ page: 1, pageSize: 20 })
    .then(res => { setCustomers(res.data); setLoading(false); });
}, []);

// AFTER (TanStack Query hook):
const { data, isLoading, isError } = useCustomers({ page, pageSize: 20, ...filters });
const customers = data?.data ?? [];
const total = data?.meta.total ?? 0;
const totalPages = Math.ceil(total / 20);
```

### Example — Replacing a Mutation

```typescript
// BEFORE:
const handleCreate = async (payload) => {
  await customerService.createCustomer(payload);
  await fetchCustomers(); // full re-fetch
};

// AFTER:
const { mutate: createStep1, isPending } = useCreateCustomerStep1();
const handleCreate = (payload: CreateCustomerStep1Request) => {
  createStep1(payload, {
    onSuccess: () => toast.success('Customer draft created.'),
    onError: (err) => toast.error(err.message),
  });
  // TanStack Query automatically invalidates the list cache on success
};
```

---

## 8. Stage 6: Removing Mock Data

**Only after the page is fully connected and tested on the real API.**

### Safe Removal Checklist Per Module

- [ ] All consumer pages load data from real API hooks.
- [ ] No `import ... from '../../mock/mock<Module>'` exists in any production file.
- [ ] No `import ... from '../../repositories/mock/Mock<Module>Repository'` exists.
- [ ] `npm run build` succeeds without the mock files.
- [ ] Manual test: navigate to the page, confirm real data loads.
- [ ] Delete mock data file from `src/mock/`.
- [ ] Delete mock repository file from `src/repositories/mock/`.
- [ ] Delete mock repository interface from `src/repositories/` if it has no other implementations.
- [ ] Run `npm run typecheck` — confirm zero errors.

> ⚠️ Do not delete a mock file if any other page still imports it. Use `grep` first:
> ```powershell
> Get-ChildItem 'src' -Recurse -Include '*.tsx','*.ts' | Select-String 'mockCustomers'
> ```

---

## 9. Stage 7: Permission-Aware UI

### Core Principle

**Backend is the authority. Frontend is the helper.**

- Backend `@RequirePermissions` guards **always** enforce authorization. Even if the frontend shows a button by mistake, the backend will return `403 Forbidden`.
- Frontend permission checks exist only to provide a better user experience (hide buttons, disable inputs, show appropriate messages).

### Standard Permission Check Pattern

```typescript
import { useAuthStore } from '../store/auth.store';

// In the component:
const { currentUser } = useAuthStore();
const role = currentUser?.role;

const canEditStep2 = role === 'SALES_MANAGER' || role === 'MANAGER' || role === 'DIRECTOR';
const canApprove   = role === 'SALES_MANAGER' || role === 'MANAGER' || role === 'DIRECTOR';
const canDelete    = role === 'MANAGER' || role === 'DIRECTOR';
```

Alternatively, use the existing `hasPermission()` utility from `src/rules/permissions.ts`:
```typescript
import { hasPermission } from '../rules/permissions';
const canEditStep2 = hasPermission(role, 'customers:complete-onboarding');
```

### Read-Only Mode Pattern (Area Manager / Step 2)

```tsx
// Make inputs read-only without changing their visual design:
<Input
  value={creditLimit ?? ''}
  disabled={!canEditStep2}
  readOnly={!canEditStep2}
  onChange={canEditStep2 ? handleChange : undefined}
/>

// Hide action buttons:
{canEditStep2 && (
  <Button onClick={handleCompleteStep2}>Complete Onboarding</Button>
)}

// Show informational badge for read-only mode:
{!canEditStep2 && (
  <Badge variant="outline">
    <Lock className="w-3 h-3 mr-1" />
    View Only — Completed by Sales Manager
  </Badge>
)}
```

---

## 10. Stage 8: Performance Optimizations

These are applied once per module (most are one-time cross-cutting improvements).

### 8.1 Route Lazy Loading (`src/App.tsx`)

```typescript
// Every page import in App.tsx:
const CustomerOnboardingPage = React.lazy(() =>
  import('./features/customers/CustomerOnboardingPage')
    .then(m => ({ default: m.CustomerOnboardingPage }))
);

// Wrap the router outlet:
<Suspense fallback={<div className="flex items-center justify-center h-screen">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
</div>}>
  <Routes>...</Routes>
</Suspense>
```

### 8.2 Search Debouncing

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Usage in a search input:
const [searchInput, setSearchInput] = useState('');
const debouncedSearch = useDebounce(searchInput, 350);

// Use debouncedSearch in the query params — only triggers an API call 350ms after typing stops:
const { data } = useCustomers({ search: debouncedSearch, page: 1, pageSize: 20 });
```

### 8.3 PdfService On-Demand Loading

Replace all static top-level `PdfService` imports with dynamic imports:

```typescript
// In any component with a print/download button:
const handleDownloadPdf = async () => {
  try {
    const { pdfService } = await import('../../services/PdfService');
    await pdfService.downloadInvoicePdf(invoice);
  } catch {
    toast.error('Could not generate PDF. Please try again.');
  }
};
```

---

## 11. Testing Each Integration

After completing each module integration, run this test sequence:

### 11.1 TypeScript Compile Check
```bash
cd "d:\dns erp"
npx tsc --noEmit
```
Expected: zero new errors compared to baseline.

### 11.2 Build Check
```bash
npm run build
```
Expected: build succeeds. After `App.tsx` lazy loading, see multiple `.js` chunks instead of one monolithic file.

### 11.3 Functional Test Matrix

For Customer Onboarding, test these exact scenarios:

| Scenario | Role | Expected Result |
|---|---|---|
| View customer list | Area Manager | Lists load from real API ✅ |
| Create customer draft (Step 1) | Area Manager | Customer created, appears in list with `DRAFT` status ✅ |
| View Step 2 on a DRAFT customer | Area Manager | Step 2 inputs visible but **disabled**; submit button hidden ✅ |
| Complete Step 2 | Sales Manager | Customer transitions to pending approval stage ✅ |
| Approve customer | Manager | Customer becomes `ACTIVE` ✅ |
| Reject customer | Sales Manager | Customer status shows `REJECT` (not `REJECTED`) ✅ |
| View DRAFT customer list | Any authorized role | `DRAFT` status customers visible ✅ |
| Attempt Step 2 via API directly | Area Manager | Backend returns `403 Forbidden` ✅ |

### 11.4 Network Validation

Open Browser DevTools → Network tab:
- Confirm requests go to `/api/v1/customers` (not mock data).
- Confirm **no duplicate requests** for the same data (TanStack Query deduplication working).
- After creating a customer, confirm the list automatically refreshes (cache invalidation working).
- After typing in search, confirm requests fire 350ms after typing stops (debounce working).

---

## 12. Common Patterns Reference

### Paginated List with Search and Filters

```typescript
const [page, setPage] = useState(1);
const [searchInput, setSearchInput] = useState('');
const [statusFilter, setStatusFilter] = useState<CustomerStatus | undefined>();
const debouncedSearch = useDebounce(searchInput);

// Reset to page 1 when filters change
useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

const { data, isLoading } = useCustomers({
  page,
  pageSize: 20,
  search: debouncedSearch || undefined,
  status: statusFilter,
});

const customers = data?.data ?? [];
const totalPages = data ? Math.ceil(data.meta.total / data.meta.pageSize) : 1;
```

### Mutation with Toast Feedback

```typescript
const { mutate: approve, isPending } = useApproveCustomer();

const handleApprove = () => {
  approve(
    { id: customer.id, dto: { reason: approvalNote } },
    {
      onSuccess: () => {
        toast.success(`${customer.displayName} has been approved.`);
        onClose(); // close modal
      },
      onError: (err) => {
        toast.error(err.message ?? 'Approval failed. Please try again.');
      },
    }
  );
};
```

### Backend Validation Error Handling

Backend returns `{ statusCode: 400, code: 'VALIDATION_ERROR', message: '...', details: ['field: message'] }`.
The Axios client converts this to a thrown `Error` with `error.message` set to the backend `message`. The `details` array can be accessed via a custom error type if needed.

### Query Key Invalidation Patterns

```typescript
// Invalidate all lists for a module (after create, delete):
qc.invalidateQueries({ queryKey: customerKeys.lists() });

// Invalidate a specific record (after update, approve, reject):
qc.invalidateQueries({ queryKey: customerKeys.detail(id) });

// Invalidate everything for a module (use sparingly):
qc.invalidateQueries({ queryKey: customerKeys.all });
```

---

## 13. What NEVER to Do

| ❌ Never | ✅ Instead |
|---|---|
| Call `apiClient.get(...)` directly in a component | Use a TanStack Query hook |
| Call `axios.get(...)` directly anywhere outside `client.ts` | Import from `src/api/client.ts` |
| Store server-fetched entity data in Zustand | Let TanStack Query own server state |
| Use `pageSize: 200` or higher for dropdown preloads | Use debounced search with `pageSize: 20` |
| Auto-retry mutations (`retry: 1`) | Keep `retry: 0` for all mutations |
| Hard-code `window.location.replace('/login')` | Use the auth event emitter |
| Leave `import ... from '../../mock/...'` in production files | Remove all mock imports |
| Use `'REJECTED'` for customer approval stage | Always use `'REJECT'` |
| Invent frontend field names that don't match backend | Match backend Prisma field names exactly |
| Optimistic updates for financial/stock data | Always wait for server confirmation |

---

## 14. Module Migration Checklist

Use this checklist when migrating any new module to the enterprise API standard.

```markdown
## Module: [Module Name]
**Date started:** ____  **Completed:** ____  **Engineer:** ____

### Stage 1 — Foundation (one-time, skip if done)
- [ ] `src/api/client.ts` created and tested
- [ ] `src/main.tsx` has `QueryClientProvider`
- [ ] `src/store/auth.store.ts` and `ui.store.ts` created
- [ ] `src/hooks/useDebounce.ts` created

### Stage 2 — Module API Layer
- [ ] `src/api/<module>/<module>.types.ts` created (matches backend DTOs exactly)
- [ ] `src/api/<module>/<module>.api.ts` created (all CRUD endpoints covered)
- [ ] `src/api/<module>/<module>.hooks.ts` created (query keys + all hooks)
- [ ] TypeScript compiles without errors on new files

### Stage 3 — Page Connections
- [ ] All pages in module migrated to use TanStack Query hooks
- [ ] All old `useState` + `useEffect` data-fetching boilerplate removed
- [ ] All old service imports removed from page files
- [ ] Permission-based UI rendering implemented (hide/disable where needed)
- [ ] Search inputs debounced

### Stage 4 — Mock Removal
- [ ] No mock imports remain in any production file for this module
- [ ] Mock data files deleted
- [ ] Mock repository files deleted
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` succeeds

### Stage 5 — Verification
- [ ] Manual smoke test: list, view, create, update, delete flows tested
- [ ] All user roles tested where permissions differ
- [ ] Network tab confirms: no duplicate requests, correct endpoints
- [ ] No `console.error` or unhandled promise rejections in browser
- [ ] Bundle analysis shows new lazy chunk for module pages
```

---

*This guide is a living document. Update it when new patterns emerge or backend contracts change. All deviations must be documented and reviewed before adoption.*
