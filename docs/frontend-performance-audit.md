# DNS ERP Frontend — Performance Audit Report

**Audit Date:** 2026-11-18  
**Auditor:** Senior React Performance Engineer (AI-assisted)  
**Scope:** `d:\dns erp` — React 18 / TypeScript / Vite 5 frontend  
**Status:** Audit-only. No source files were modified.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Frontend Architecture](#2-current-frontend-architecture)
3. [Baseline Measurements](#3-baseline-measurements)
4. [Identified Performance Bottlenecks](#4-identified-performance-bottlenecks)
5. [Evidence & Affected Files](#5-evidence--affected-files)
6. [Severity & User Impact](#6-severity--user-impact)
7. [Recommended Optimizations](#7-recommended-optimizations)
8. [Expected Benefits](#8-expected-benefits)
9. [Implementation Priority](#9-implementation-priority)
10. [Potential Risks & Regression Areas](#10-potential-risks--regression-areas)
11. [Testing Strategy](#11-testing-strategy)
12. [Before/After Measurement Plan](#12-beforeafter-measurement-plan)

---

## 1. Executive Summary

The DNS ERP frontend is a **React 18 / Vite 5 / TypeScript** single-page application serving approximately 20 feature modules. A comprehensive audit of the build output, source architecture, service layer, state management, and API patterns has uncovered **five critical bottlenecks** that significantly degrade application loading speed, runtime performance, and memory usage — particularly on low-spec client machines (4 GB RAM).

### Key Findings at a Glance

| Severity | Count | Headline |
|---|---|---|
| 🔴 Critical | 5 | Monolithic 4.7 MB JS bundle, pageSize:10000 report fetches, mock data in production build, PdfService eagerly bundled, no request deduplication |
| 🟠 High | 4 | Search without debounce, all custom hooks re-fetch on every mutation, no data caching layer, Recharts fully bundled |
| 🟡 Medium | 5 | Monolithic page components (60–130 KB), excessive useMemo in some pages, missing AbortController, setTimeout leaks in mock repos, unoptimized logo.png |
| 🟢 Low | 3 | Google Fonts blocking, missing font preload, no CSP/security headers configuration |

### Single Most Impactful Fix

Converting the **135 static imports in `App.tsx`** to `React.lazy()` / `Suspense` route-level splits will reduce the initial JS bundle from **4,677 KB → ≈ 200–350 KB** (measured baseline vs estimated post-fix), a **90%+ reduction** in initial download size on first load.

---

## 2. Current Frontend Architecture

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18.x |
| Language | TypeScript | Strict mode |
| Build tool | Vite | 5.x |
| Routing | React Router | v6 |
| State management | React Context + custom hooks | (no Zustand/Redux) |
| Data fetching | Custom `useEffect` hooks + Axios | (no TanStack Query) |
| UI library | Tailwind CSS + shadcn/ui primitives | — |
| Charts | Recharts | — |
| PDF generation | Custom `PdfService.ts` (HTML→print) | — |
| HTTP client | Axios with JWT refresh interceptor | — |
| Testing | Vitest | — |

### Source Code Overview

- **578 total** `.ts`/`.tsx` source files
- **376** `.tsx` component/page files
- **20 feature modules** under `src/features/`
- **19 custom hooks** under `src/hooks/`
- **2 React Contexts** (TaxContext, ThemeContext — minimal surface)
- **0 uses of TanStack React Query** (not used despite being listed in `package.json`)
- **0 uses of `React.lazy()`** anywhere in the codebase
- **16 mock repository files** under `src/repositories/mock/`
- **15 mock data files** under `src/mock/`

### Routing Architecture

All routes are defined in a single `App.tsx` file with **~135 static `import` statements** at the top. Every page component is imported eagerly, meaning Vite includes the entire application code in one JavaScript chunk at build time.

### Data-fetching Pattern

The application uses a **custom hook per entity** pattern (e.g., `useOrders`, `useCustomers`, `useProducts`). Each hook maintains its own `loading`, `error`, and data state using `useState` + `useEffect` + a `useCallback`. There is **no shared caching layer** — each hook instance fetches independently, with no request deduplication, no stale-while-revalidate, and no cache invalidation strategy beyond calling `fetchXxx()` after every mutation.

---

## 3. Baseline Measurements

> **Note:** Values marked ✅ **Measured** are confirmed from a production build run. Values marked 🔍 **Estimated** are derived from code analysis and industry benchmarks.

### Build Output (✅ Measured)

| Asset | Size (raw) | Size (gzip) |
|---|---|---|
| `dist/assets/index-BvP8rvJx.js` | **4,677.70 kB** | **1,016.17 kB** |
| `dist/assets/index-Bx5vuyi-.css` | 140.62 kB | 22.49 kB |

**Result:** Single monolithic JS chunk. Vite emits no code-split chunks because zero dynamic imports exist.

### Largest Source Files (✅ Measured)

| File | Size |
|---|---|
| `GRNCreateEditPage.tsx` | 129 KB |
| `PdfService.ts` | 115 KB |
| `ManualJournalPage.tsx` | 112 KB |
| `BankReconciliationPage.tsx` | 111 KB |
| `WarrantyHubPage.tsx` | 97 KB |
| `BatchSupplierPaymentPage.tsx` | 92 KB |
| `IncomeDeskPage.tsx` | 83 KB |
| `PaymentListPage.tsx` | 82 KB |

### Mock Data Bundled into Production (✅ Measured)

| File | Size |
|---|---|
| `mockOrders.ts` | 50 KB |
| `mockInventory.ts` | 34 KB |
| `mockInvoices.ts` | 26 KB |
| `mockWarranty.ts` | 23 KB |
| `mockProducts.ts` | 21 KB |
| `mockApprovals.ts` | 17 KB |
| **Total mock data** | **≈ 250 KB source** |

### Initial Load Time (🔍 Estimated)

| Connection | Estimated Time-to-Interactive |
|---|---|
| Fast broadband (100 Mbps) | 3–5 s |
| Office LAN (10 Mbps) | 8–12 s |
| Mobile 4G (10–20 Mbps) | 10–18 s |
| Low-spec PC (parse time alone) | +2–4 s additional JS parse/compile |

---

## 4. Identified Performance Bottlenecks

### 🔴 CRITICAL-1 — No Route-Level Code Splitting (Monolithic Bundle)

**Root Cause:** `App.tsx` contains approximately **135 static `import` statements** for page-level components at the module top level. Vite has no dynamic import signals, so it emits a single `index.js` chunk.

**Evidence:**
- `dist/assets/index-BvP8rvJx.js` = **4,677 KB** (measured)
- Zero occurrences of `React.lazy`, `Suspense`, or `import()` found in codebase
- `vite.config.ts` has no `build.rollupOptions.output.manualChunks` configuration

**Impact:** Every user downloads, parses, and compiles the **entire application** on first page load — including pages they may never visit (GRN, finance journals, warranty hub, POS terminal, etc.).

---

### 🔴 CRITICAL-2 — `pageSize: 10000` in Report Services (Unbounded Data Fetching)

**Root Cause:** `ReportService.ts` and `CommissionService.ts` call multiple backend APIs with `pageSize: 10000`, loading the entire dataset into client memory for in-memory JavaScript filtering/aggregation.

**Evidence — confirmed occurrences of `pageSize: 10000`:**
- `ReportService.ts` line 70: `listCustomers({ pageSize: 10000 })`
- `ReportService.ts` line 71: `listOrders({ pageSize: 10000 })`
- `ReportService.ts` line 127: `getInvoices({ pageSize: 10000 })`
- `ReportService.ts` line 130: `listProducts({ pageSize: 10000 })`
- `ReportService.ts` line 374: `listProducts({ pageSize: 10000 })`
- `ReportService.ts` lines 547–548, 765–768: multiple parallel `pageSize: 10000` calls
- `CommissionService.ts` lines 223–224: `pageSize: 10000` for invoices and payments
- `CommissionConfigService.ts` lines 379–380: `pageSize: 10000` for invoices and payments
- `AdvancedReportService.ts` lines 45–108: 4× `pageSize: 10000` (orders, customers, invoices, payments simultaneously)

**Impact:** A single finance report page load may fetch **40,000–80,000 records** from the backend, process them in JS on the main thread, and hold them in memory. On a 4 GB RAM machine, this risks browser tab crashes and extremely long load times.

---

### 🔴 CRITICAL-3 — Mock Data Statically Imported in Production Pages

**Root Cause:** 30+ production components and services directly `import` from `src/mock/` data files. These 250 KB of static JavaScript objects are bundled into the production build and loaded on every page visit.

**Evidence — production files importing mock data (selected):**

| File | Mock Import |
|---|---|
| `ManualJournalPage.tsx` | `MOCK_CUSTOMERS` |
| `IncomeDeskPage.tsx` | `MOCK_CUSTOMERS` |
| `BatchSupplierPaymentPage.tsx` | `MOCK_GRNS` |
| `GRNCreateEditPage.tsx` | `MOCK_PRODUCTS`, `MOCK_PURCHASE_ORDERS` |
| `StockBalancePage.tsx` | `MOCK_PRODUCTS` |
| `PDCVaultPage.tsx` | `MOCK_CUSTOMERS` |
| `FinancePricingModal.tsx` | `MOCK_PRODUCTS` |
| `apService.ts` | `MOCK_GRNS`, `MOCK_PRODUCTS`, `MockGRNRepository` |
| `arService.ts` | `MOCK_CUSTOMERS` |
| `pdcVaultService.ts` | `MOCK_CUSTOMERS` |
| `ReportService.ts` | `MOCK_AREAS`, `MOCK_USERS` |

**Impact:** Mock data serves as a fallback or placeholder data source in production. This means:
1. 250 KB of irrelevant test data is bundled and parsed on every page load.
2. Users may see mock/dummy data if the backend fails to respond.
3. Report calculations in `ReportService.ts` include `MOCK_AREAS` and `MOCK_USERS` — this means reports can silently render incorrect data in production.

---

### 🔴 CRITICAL-4 — `PdfService.ts` Eagerly Bundled (115 KB, Main-Thread PDF Generation)

**Root Cause:** `PdfService.ts` is a 115 KB file that generates full HTML document strings for all document types (quotations, invoices, POs, GRNs, delivery notes, payment vouchers, sales orders). It is imported statically throughout the codebase and runs entirely on the **browser's main thread** via `window.open()` + `window.print()`.

**Evidence:**
- File size: **115,384 bytes** (measured)
- Generates HTML strings by string interpolation — full HTML `<style>` blocks embedded inside template literals
- Uses `URL.createObjectURL` / `URL.revokeObjectURL` for download triggers (cleanup is present ✅)
- No Web Worker usage detected — all generation on main thread

**Impact:** 
- 115 KB of PDF generation code is downloaded and parsed even for users who never print a document (e.g., Cashiers, Stock Managers)
- Large document rendering (multi-line invoices, GRN with 50+ items) blocks the main thread for hundreds of milliseconds

---

### 🔴 CRITICAL-5 — No Request Deduplication or Data Caching

**Root Cause:** The custom hook architecture (19 hooks using `useState` + `useEffect`) provides **no caching**. Every component mount triggers a fresh API request. There is no TanStack Query, SWR, or equivalent caching layer, despite TanStack Query being listed in `package.json`.

**Evidence:**
- Zero `useQuery`, `useMutation`, `QueryClient`, `staleTime`, or `gcTime` occurrences found in the codebase
- Each `useOrders`, `useCustomers`, `useProducts` hook fetches independently on mount
- After every mutation (create/update/delete), hooks call `fetchXxx()` which issues a new GET request — causing **N+1 patterns** where a single user action triggers 2+ sequential API calls

**Example — `useOrders.ts`:**
```typescript
// Every mutation (createOrder, updateOrder, submitOrder, etc.) calls:
await fetchOrders(); // ← unconditional full-list refetch after every change
```

**Impact:** Opening two panels that both use `useOrders` triggers two simultaneous identical API requests. After any order action, the full order list is re-fetched. On slow connections, this creates visible loading flickers.

---

### 🟠 HIGH-1 — Search Inputs Without Debouncing (Triggers API Per Keystroke)

**Root Cause:** Search/filter `onChange` handlers directly call `setFilters()`, which causes the `useCallback`-wrapped fetch to fire on every keystroke. No `debounce` or `throttle` utility is used anywhere in the production code.

**Evidence:**
- Zero `debounce` or `throttle` calls found in production code (only in a test file)
- `CustomerSelector.tsx`, `SupplierSelector.tsx`, `CreateInvoiceModal.tsx` and 10+ other pages have search inputs wired directly to filter state

**Impact:** Typing "Kamal Perera" into a customer search field triggers ~11 sequential API calls. On slow connections, earlier responses may arrive out-of-order, potentially displaying stale results.

---

### 🟠 HIGH-2 — Large Intermediate pageSizes for Dropdown Population

**Root Cause:** Several pages load large datasets (100–500 records) upfront to populate dropdown/select components, rather than using server-side search endpoints.

**Evidence — selected examples:**
- `pdcVaultService.ts` line 324: `pageSize: 500` (cheque payments for dropdown)
- `CustomerPaymentsTab.tsx`: `pageSize: 200` and `pageSize: 300`
- `SalesRepDashboard.tsx`: `pageSize: 100` customers + `pageSize: 200` invoices
- `InvoiceListPage.tsx`: `pageSize: 200`
- `PaymentListPage.tsx`: `pageSize: 100` customers + `pageSize: 100` invoices (preloaded for dropdowns)
- `ShowroomPOSTerminal.tsx`: `pageSize: 150`
- `WarrantyHubPage.tsx`: 3× `pageSize: 100` calls on mount
- `DeliveryNoteService.ts` line 194: `pageSize: 1000`

**Impact:** Each of these pages downloads more records than required for display on mount, increasing time-to-interactive and holding unnecessary data in React state memory.

---

### 🟠 HIGH-3 — No Virtualization for Long Lists

**Root Cause:** No list virtualization library (`react-window`, `react-virtual`, `@tanstack/react-virtual`) is used anywhere in the codebase.

**Evidence:** Zero occurrences of `FixedSizeList`, `VirtualList`, `useVirtualizer`, `react-window`, or `react-virtual` found.

**Impact:** Pages like `WarrantyHubPage`, `StockMovementsPage`, `GRNListPage`, and report pages may render hundreds of DOM nodes at once, causing slow rendering and scrolling on low-spec machines.

---

### 🟠 HIGH-4 — Recharts Fully Bundled (Not Lazy-Loaded)

**Root Cause:** Recharts is used in 6 files (4 dashboard pages + 1 chart component + 1 GRN list page). Since there is no code splitting, the full Recharts library is bundled in the monolithic chunk and downloaded by all users on first load.

**Evidence:**
- `FinanceManagerDashboard.tsx`, `SalesManagerDashboard.tsx`, `DirectorDashboard.tsx`, `DirectorInteractiveBarChart.tsx`, `GRNListPage.tsx`, `chart.tsx`
- Recharts bundle size: 🔍 Estimated **~500–600 KB** (minified, pre-gzip)

**Impact:** Users who never see a chart (e.g., Cashiers, Stock staff, Sales Reps) still download and parse the full Recharts library on first load.

---

### 🟡 MEDIUM-1 — Monolithic Page Components (60–130 KB Each)

**Root Cause:** Several page files contain entire feature implementations in a single file — including data fetching, business logic, complex filtering, rendering, and sub-panels. This prevents tree-shaking of unused sub-features.

**Evidence — components over 60 KB:**
- `GRNCreateEditPage.tsx` — 129 KB
- `ManualJournalPage.tsx` — 112 KB
- `BankReconciliationPage.tsx` — 111 KB
- `WarrantyHubPage.tsx` — 97 KB
- `BatchSupplierPaymentPage.tsx` — 92 KB

`ManualJournalPage.tsx` has **22 `useMemo` calls** — the highest in the codebase — suggesting that heavy inline computation has been memoized reactively instead of being extracted into a service.

---

### 🟡 MEDIUM-2 — Inconsistent and Excessive Memoization

**Root Cause:** Memoization (`useMemo`, `useCallback`, `React.memo`) is applied inconsistently: very heavily in some components, absent in others of similar complexity.

**Evidence:**
- `ManualJournalPage.tsx`: 22 `useMemo`/`useCallback` hits
- `BatchSupplierPaymentPage.tsx`: 14 hits
- `CustomerPaymentsTab.tsx`: 15 hits
- `OrderListPage.tsx` (24 KB, moderate complexity): only 3 hits
- `GRNCreateEditPage.tsx` (129 KB): only 9 hits

**Impact:** Excessive `useMemo` in some pages adds unnecessary dependency array checking overhead (each `useMemo` has a cost). Missing memoization on expensive derived values causes unnecessary recalculation on unrelated re-renders.

---

### 🟡 MEDIUM-3 — Google Fonts Loaded Synchronously (Render-Blocking)

**Root Cause:** `index.html` loads two Google Font families via a standard `<link rel="stylesheet">` tag without `media="print"` or `font-display: optional` techniques. This can block first-paint.

**Evidence — `index.html`:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

The `display=swap` parameter is present ✅ — this prevents invisible text. However, the stylesheet request is still a render-blocking network round-trip to `fonts.googleapis.com`.

**Impact:** On first load, the browser must connect to Google's CDN before first contentful paint. This adds 100–300 ms on fast connections, 500–1000 ms on slow ones.

---

### 🟡 MEDIUM-4 — Unoptimized Logo Asset

**Root Cause:** `public/logo.png` is **110 KB** — large for a favicon/logo used in the browser tab and app header.

**Evidence:**
- `public/logo.png`: 110,264 bytes
- Loaded as favicon and apple-touch-icon — referenced on every page load

**Impact:** 110 KB PNG for a favicon is excessive. A properly sized PNG (16×16, 32×32) should be under 5 KB; a 192×192 app icon under 15 KB. Switching to WebP or SVG with proper sizing reduces this by 80–95%.

---

### 🟡 MEDIUM-5 — `setTimeout` in Mock Repositories Simulating Network Latency

**Root Cause:** All 16 mock repository files use `await new Promise(resolve => setTimeout(resolve, N))` to simulate async latency. These mock repositories are loaded in production via service files that fall back to them.

**Evidence:**
- `MockProductRepository.ts`: 8 `setTimeout` calls
- `MockCustomerRepository.ts`, `MockInvoiceRepository.ts`: 7 each
- `MockPaymentRepository.ts`, `MockPurchaseOrderRepository.ts`, `MockQuotationRepository.ts`: 6 each

**Impact:** If any service falls back to a mock repository in production (e.g., due to a missing API endpoint), the application will artificially delay every data fetch by the simulated latency, causing confusing slow responses.

---

### 🟢 LOW-1 — No Content Security Policy (CSP) Headers

**Root Cause:** `index.html` contains no CSP meta tag, and no Vite plugin is configured to inject security headers.

**Impact:** Medium security risk — not a direct performance issue, but a production readiness gap.

---

### 🟢 LOW-2 — `window.location.replace()` for Redirects (Not React Router)

**Root Cause:** The Axios interceptor in `src/api/axios.ts` uses `window.location.replace(path)` to redirect on 401/404/500 errors instead of using React Router's `useNavigate`.

**Impact:** Hard redirects cause a full page reload, flushing all in-memory state. On a 401, this causes an extra full 4.7 MB bundle re-download.

---

### 🟢 LOW-3 — FullscreenButton Registers 4 Vendor-Prefixed Event Listeners

**Root Cause:** `FullscreenButton.tsx` adds 4 `addEventListener` calls for `fullscreenchange`, `webkitfullscreenchange`, `mozfullscreenchange`, and `MSFullscreenChange`. Cleanup is present ✅ but `webkitfullscreenchange` and `MSFullscreenChange` are obsolete.

**Impact:** Minor — no functional risk, but unnecessary listener registrations.

---

## 5. Evidence & Affected Files

### Critical Path Files

| File | Issue | Size |
|---|---|---|
| `src/App.tsx` | 135 static imports, no lazy loading | — |
| `src/services/ReportService.ts` | pageSize:10000 ×10+ calls | 34 KB |
| `src/services/AdvancedReportService.ts` | pageSize:10000 ×4 parallel | 13 KB |
| `src/services/CommissionService.ts` | pageSize:10000 ×2 | 18 KB |
| `src/services/CommissionConfigService.ts` | pageSize:10000 ×2 | 18 KB |
| `src/services/PdfService.ts` | 115 KB, main-thread, eagerly loaded | 115 KB |
| `src/mock/mockOrders.ts` | Bundled static test data | 50 KB |
| `src/mock/mockInventory.ts` | Bundled static test data | 34 KB |
| `src/features/finance/pages/journal/ManualJournalPage.tsx` | Monolithic, 22 useMemos | 112 KB |
| `src/features/inventory/GRNCreateEditPage.tsx` | Monolithic | 129 KB |

### Hook Caching Gap

All 19 custom hooks follow the same no-cache pattern:

```typescript
// Every hook — example from useOrders.ts
const fetchOrders = useCallback(async () => {
  setLoading(true);
  const res = await orderService.listOrders(filters);
  setOrders(res.data);
  // No cache check, no stale-time, no deduplication
}, [filters, currentUser]);

useEffect(() => {
  fetchOrders(); // Fires on every mount
}, [fetchOrders]);

// Every mutation:
const createOrder = async (input) => {
  const created = await orderService.createOrder(input, currentUser);
  await fetchOrders(); // Unconditional full-list refetch
  return created;
};
```

### Axios Configuration Notes

The Axios instance (`src/api/axios.ts`) is well-structured with:
- ✅ JWT refresh token with request queuing (`refreshPromise` deduplication)
- ✅ Request ID injection
- ✅ Error toast notifications
- ❌ No request cancellation (`AbortController`) — only 1 comment-level mention found
- ❌ No response caching headers
- ❌ Hard redirect via `window.location.replace()` on auth errors

---

## 6. Severity & User Impact

| ID | Severity | Bottleneck | Affected Users | Low-Spec Impact |
|---|---|---|---|---|
| C-1 | 🔴 Critical | Monolithic 4.7 MB bundle | ALL users, every session | Very High — 2–4s extra parse time |
| C-2 | 🔴 Critical | pageSize:10000 report fetches | Finance, Director, Sales Managers | Very High — potential tab crash |
| C-3 | 🔴 Critical | Mock data in production bundle | ALL users | High — 250 KB wasted download |
| C-4 | 🔴 Critical | PdfService eagerly bundled | ALL users | High — 115 KB wasted download |
| C-5 | 🔴 Critical | No data caching | ALL users | High — redundant API calls on every mount |
| H-1 | 🟠 High | Search without debounce | All pages with search | Medium — API spam, slow results |
| H-2 | 🟠 High | pageSize 100–500 for dropdowns | Most feature pages | High — excess memory usage |
| H-3 | 🟠 High | No list virtualization | Report pages, inventory | High — DOM overload on large lists |
| H-4 | 🟠 High | Recharts fully bundled | Non-chart users | Medium — ~500 KB wasted |
| M-1 | 🟡 Medium | Monolithic page components | Finance, Inventory pages | Medium — slow component mount |
| M-2 | 🟡 Medium | Inconsistent memoization | Finance pages | Low–Medium |
| M-3 | 🟡 Medium | Blocking Google Fonts | ALL users | Medium — 100–300ms LCP delay |
| M-4 | 🟡 Medium | 110 KB logo.png | ALL users | Low — 100 KB wasted per session |
| M-5 | 🟡 Medium | Mock repos in production services | ALL users (silent risk) | Low–High (if triggered) |
| L-1 | 🟢 Low | No CSP | ALL users | None (security) |
| L-2 | 🟢 Low | Hard redirect on auth error | ALL users | Low |
| L-3 | 🟢 Low | Obsolete fullscreen listeners | — | None |

---

## 7. Recommended Optimizations

### 🔴 CRITICAL Fix 1 — Route-Level Code Splitting

**Files:** `src/App.tsx`, `vite.config.ts`

Convert all 135 static page imports to `React.lazy()` + `React.Suspense`. Group by feature module for logical chunk boundaries.

**Pattern:**
```tsx
// Before (in App.tsx)
import { OrderListPage } from './features/orders/OrderListPage';

// After
const OrderListPage = React.lazy(() =>
  import('./features/orders/OrderListPage').then(m => ({ default: m.OrderListPage }))
);

// Wrap router with Suspense
<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/orders" element={<OrderListPage />} />
    ...
  </Routes>
</Suspense>
```

Also configure Vite chunking in `vite.config.ts`:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-charts': ['recharts'],
        'vendor-ui': ['lucide-react', 'sonner'],
        'vendor-pdf': ['html2pdf.js'], // if applicable
      }
    }
  }
}
```

**Expected result:** Initial bundle drops from 4,677 KB → ~200–350 KB. Per-route chunks of 20–80 KB load on demand.

---

### 🔴 CRITICAL Fix 2 — Server-Side Aggregation for Reports

**Files:** `src/services/ReportService.ts`, `src/services/AdvancedReportService.ts`, `src/services/CommissionService.ts`, `src/services/CommissionConfigService.ts`

Replace `pageSize: 10000` calls with dedicated backend report/aggregation API endpoints. The backend should perform aggregation and filtering in SQL, returning a pre-computed summary.

**Pattern:**
```typescript
// Before
const ordersResult = await this.orderSvc.listOrders({ page: 1, pageSize: 10000 });
const exceptions = ordersResult.data.filter(o => /* ... client-side filter */);

// After
const exceptions = await apiClient.get('/reports/credit-exceptions', { params: filter });
```

This follows the backend architecture's principle of PostgreSQL as single source of truth and thin controllers/thick services.

> **Note:** This fix requires backend API development. Frontend changes are minimal — replace the service method body with an API call.

---

### 🔴 CRITICAL Fix 3 — Eliminate Mock Data from Production Bundle

**Files:** All 30+ files importing from `src/mock/`

1. Audit each mock import — determine if it is a true fallback or development scaffold.
2. For fallback cases: remove the mock import and replace with a proper error state or empty state.
3. For development data only: add `// @vite-ignore` and tree-shake via build-time env checks, or move to separate dev-only entry points.
4. For `ReportService.ts` using `MOCK_AREAS` and `MOCK_USERS`: replace with real API calls to `/areas` and `/users` endpoints.

**Vite tree-shake approach:**
```typescript
// Conditional import — only bundled in dev
const mockData = import.meta.env.DEV
  ? (await import('../mock/mockProducts')).MOCK_PRODUCTS
  : [];
```

---

### 🔴 CRITICAL Fix 4 — Lazy-Load PdfService

**Files:** All importers of `PdfService.ts`

Replace static imports with dynamic imports that load PdfService only when a print/download action is triggered:

```typescript
// Before
import { pdfService } from '../../services/PdfService';
// In handler:
await pdfService.downloadInvoicePdf(invoice);

// After
// In handler:
const { pdfService } = await import('../../services/PdfService');
await pdfService.downloadInvoicePdf(invoice);
```

This keeps 115 KB out of the initial load for all users who don't print.

---

### 🔴 CRITICAL Fix 5 — Introduce TanStack Query for Data Caching

**Files:** All custom hooks in `src/hooks/`

TanStack Query is already installed (`@tanstack/react-query` in `package.json`) but unused. Migrate custom hooks to use `useQuery` / `useMutation`:

```typescript
// Before (useOrders.ts)
const [orders, setOrders] = useState([]);
const fetchOrders = useCallback(async () => { ... }, [filters]);
useEffect(() => { fetchOrders(); }, [fetchOrders]);

// After
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useOrders(filters) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => orderService.listOrders(filters, currentUser),
    staleTime: 60_000, // 1 minute cache
  });

  const createOrder = useMutation({
    mutationFn: (input) => orderService.createOrder(input, currentUser),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  return { orders: data?.data ?? [], isLoading, createOrder };
}
```

**Benefits:**
- Automatic request deduplication (two components requesting same data = one API call)
- Background refetch on window focus
- Stale-while-revalidate
- Proper cache invalidation on mutation

---

### 🟠 HIGH Fix 1 — Add Debounce to Search Inputs

**Files:** `CustomerSelector.tsx`, `SupplierSelector.tsx`, `CreateInvoiceModal.tsx`, `PaymentListPage.tsx`, `IncomeDeskPage.tsx`, `WarrantyHubPage.tsx`, and 10+ others

```typescript
import { useDeferredValue } from 'react'; // React 18 built-in

// Or use a simple custom hook:
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Usage:
const debouncedSearch = useDebounce(searchInput, 400);
useEffect(() => {
  setFilters(prev => ({ ...prev, search: debouncedSearch, page: 1 }));
}, [debouncedSearch]);
```

---

### 🟠 HIGH Fix 2 — Add AbortController to All Data Fetches

**Files:** All 19 custom hooks in `src/hooks/`

Prevent race conditions when filters change rapidly:

```typescript
const fetchOrders = useCallback(async (signal?: AbortSignal) => {
  try {
    setLoading(true);
    const res = await orderService.listOrders(filters, { signal });
    if (!signal?.aborted) setOrders(res.data);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    setError(...);
  }
}, [filters]);

useEffect(() => {
  const controller = new AbortController();
  fetchOrders(controller.signal);
  return () => controller.abort();
}, [fetchOrders]);
```

---

### 🟠 HIGH Fix 3 — Reduce Dropdown Pre-load pageSizes

**Files:** `pdcVaultService.ts`, `CustomerPaymentsTab.tsx`, `SalesRepDashboard.tsx`, `PaymentListPage.tsx`, `WarrantyHubPage.tsx`

Replace large upfront loads with server-side search:
- Selector components (`CustomerSelector`, `SupplierSelector`) should use the debounced search with `pageSize: 20`
- If backend supports it, add `/customers/search?q=...` endpoints that return only matching records
- Remove `pageSize: 100–500` preloads; show "Type to search" placeholder instead

---

### 🟠 HIGH Fix 4 — Virtualize Long Lists

**Files:** Report pages, `WarrantyHubPage.tsx`, `StockMovementsPage.tsx`, `GRNListPage.tsx`

Use `@tanstack/react-virtual` (already a peer dependency of TanStack ecosystem, lightweight):

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48,
});
```

Only implement for lists expected to exceed 100 rows. Do not add to paginated tables that show ≤ 25 rows per page.

---

### 🟡 MEDIUM Fix 1 — Self-Host or Preload Fonts

**File:** `index.html`

Option A — Add `media="print"` trick to prevent render-blocking:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?..." media="print" onload="this.media='all'" />
```

Option B — Self-host fonts using `fontsource` packages:
```bash
npm install @fontsource/jetbrains-mono
# Import in main.tsx:
import '@fontsource/jetbrains-mono/400.css';
```

---

### 🟡 MEDIUM Fix 2 — Optimize Logo Asset

**File:** `public/logo.png`

Convert `logo.png` from 110 KB PNG to:
- Favicon: `favicon.ico` or `favicon.svg` (< 5 KB)
- App icon: `logo.webp` at 192×192 (< 15 KB)

Expected saving: ~95–100 KB per initial load.

---

### 🟡 MEDIUM Fix 3 — Migrate Axios Auth Redirect to React Router

**File:** `src/api/axios.ts`

Replace `window.location.replace('/login')` with a React Router navigation event (use a custom event or a ref to the navigate function stored outside the component tree).

---

## 8. Expected Benefits

| Fix | Expected Improvement |
|---|---|
| C-1: Code splitting | Initial JS load: 4,677 KB → ~250 KB (↓ 95%) |
| C-2: Backend reports | Report page load: minutes → seconds; memory: GB → MB |
| C-3: Remove mock data | Bundle: ↓ ~250 KB source; eliminates data integrity risk |
| C-4: Lazy PdfService | Initial parse: ↓ 115 KB for non-printing users |
| C-5: TanStack Query | API calls: 50–70% reduction; perceived speed: significantly improved |
| H-1: Debounce search | API calls on search: ↓ 90% |
| H-2: Reduce pageSizes | Memory on page mount: ↓ 60–80% for affected pages |
| H-3: Virtualization | Scroll FPS on large lists: 10–60 FPS improvement |
| H-4: Lazy Recharts | Initial bundle: ↓ ~500 KB for non-dashboard users |
| M-1–M-3: Medium fixes | LCP: ↓ 100–300 ms; logo: ↓ 100 KB |

**Combined estimated improvement (Critical + High fixes):**
- Initial bundle: 4,677 KB → ~250–400 KB (**↓ 90–95%**)
- Time-to-Interactive (fast broadband): 3–5s → **< 1s**
- Time-to-Interactive (office LAN): 8–12s → **1–3s**
- Memory on report pages: potentially GB → **< 50 MB**

---

## 9. Implementation Priority

### Phase 1 — Quick Wins (1–3 days, frontend-only)

| Priority | Task | Effort | Impact |
|---|---|---|---|
| 1 | Route-level code splitting (`App.tsx`) | 1 day | Critical |
| 2 | Lazy-load `PdfService.ts` | 2 hours | Critical |
| 3 | Optimize `logo.png` | 30 min | Medium |
| 4 | Add debounce utility hook | 2 hours | High |
| 5 | Apply debounce to all search inputs | 4 hours | High |
| 6 | Fix font loading (media trick) | 30 min | Medium |
| 7 | Add AbortController to all hooks | 4 hours | High |

### Phase 2 — TanStack Query Migration (1–2 weeks)

| Priority | Task | Effort | Impact |
|---|---|---|---|
| 1 | Add `QueryClientProvider` to `main.tsx` | 30 min | Critical enabler |
| 2 | Migrate `useOrders`, `useCustomers`, `useProducts` | 1 day | Critical |
| 3 | Migrate remaining 16 hooks | 3 days | Critical |
| 4 | Replace mutation + fetchAll patterns | 2 days | Critical |

### Phase 3 — Backend Report Endpoints + Mock Data Cleanup (2–4 weeks)

| Priority | Task | Effort | Impact |
|---|---|---|---|
| 1 | Audit all 30+ mock imports — categorize each | 1 day | Critical |
| 2 | Remove/guard mock imports with `import.meta.env.DEV` | 2 days | Critical |
| 3 | Backend: implement report aggregation APIs | Backend work | Critical |
| 4 | Frontend: replace pageSize:10000 with report API calls | 2 days | Critical |
| 5 | Reduce dropdown pageSizes to 20, add server search | 3 days | High |

### Phase 4 — Virtualization + Component Splitting (2–3 weeks)

| Priority | Task | Effort | Impact |
|---|---|---|---|
| 1 | Identify top 5 long-list pages | 1 day | High |
| 2 | Add `@tanstack/react-virtual` to list pages | 3 days | High |
| 3 | Split `ManualJournalPage`, `GRNCreateEditPage` | 3 days | Medium |
| 4 | Fix Axios auth redirect to use React Router | 2 hours | Low |

---

## 10. Potential Risks & Regression Areas

| Risk | Likelihood | Mitigation |
|---|---|---|
| Code splitting breaks named exports | Medium | Use `.then(m => ({ default: m.ComponentName }))` pattern for named exports |
| `React.Suspense` flicker on fast connections | Low | Use skeleton loaders (not spinners) as fallback |
| TanStack Query cache invalidation too broad | Medium | Use specific `queryKey` arrays; test after each mutation |
| TanStack Query cache stale on shared computers | Low | Set appropriate `staleTime` (60s for lists, 0 for auth-sensitive data) |
| Mock data removal reveals missing API endpoints | High | Audit before removing — some mocks may be covering unimplemented backend features |
| `AdvancedReportService` pageSize:10000 removal | High | Backend report endpoints must be built first; do not remove frontend call without backend replacement |
| Debounce delay affecting perceived responsiveness | Low | Use 300–400 ms debounce; show loading indicator immediately |
| Virtualized lists with variable row heights | Medium | Use `measureElement` callback or estimate generously |
| Font self-hosting licensing | Low | Verify Google Fonts license (OFL — generally safe for self-hosting) |

---

## 11. Testing Strategy

### Unit Tests

- For debounce hook: test delay, test cancel on unmount
- For TanStack Query hooks: mock `QueryClient`; verify `invalidateQueries` called on mutation
- For lazy imports: mock `React.lazy`; verify `Suspense` fallback renders

### Integration Tests

- After code splitting: verify each route loads its chunk and renders correctly
- After TanStack Query migration: verify data appears on page; verify mutation causes list refresh
- After mock removal: verify pages show proper empty states or API errors (not mock data)

### Performance Regression Tests

After each phase, measure:
1. **Bundle size:** `npm run build` → check `dist/assets/` chunk sizes
2. **Chunk count:** Expect 20+ chunks after code splitting (one per feature module)
3. **API call count:** Use browser DevTools Network tab; verify no duplicate requests
4. **Memory:** Chrome DevTools → Memory → Heap snapshot before and after navigating report pages

### Manual Smoke Tests

- Login → navigate to 5 feature areas → verify no blank screens
- Open a report page → verify data loads (not mock data)
- Trigger PDF download → verify download works (lazy PdfService)
- Search in CustomerSelector → verify results appear after typing stops (debounce)

---

## 12. Before/After Measurement Plan

### Metrics to Capture

| Metric | Tool | When to Measure |
|---|---|---|
| Initial JS bundle size | `npm run build` output | Before & after Phase 1 |
| Number of JS chunks | `dist/assets/` file count | After Phase 1 |
| Time to First Byte (TTFB) | Chrome DevTools Network | Before & after Phase 2 |
| Largest Contentful Paint (LCP) | Chrome Lighthouse | Before & after Phase 1 |
| Total Blocking Time (TBT) | Chrome Lighthouse | Before & after Phase 1 |
| API call count per page load | Chrome DevTools Network | Before & after Phase 2 |
| Memory on report page | Chrome Memory Profiler | Before & after Phase 3 |
| Scroll FPS on long lists | Chrome DevTools Performance | Before & after Phase 4 |

### Baseline (Confirmed Pre-Optimization)

| Metric | Value | Type |
|---|---|---|
| Initial JS bundle | 4,677 KB (gzip: 1,016 KB) | ✅ Measured |
| JS chunks | 1 | ✅ Measured |
| `React.lazy()` usage | 0 | ✅ Measured |
| TanStack Query usage | 0 | ✅ Measured |
| `debounce` in production | 0 | ✅ Measured |
| `AbortController` in hooks | 0 | ✅ Measured |
| Virtualization usage | 0 | ✅ Measured |
| pageSize:10000 occurrences | 10+ | ✅ Measured |
| Mock imports in production | 30+ | ✅ Measured |

### Target Post-Optimization (Estimated)

| Metric | Target | Phase |
|---|---|---|
| Initial JS bundle | < 400 KB (gzip: < 100 KB) | Phase 1 |
| JS chunks | 15–25 route chunks | Phase 1 |
| LCP | < 2.5 s (Good per Core Web Vitals) | Phase 1 |
| API calls per page mount | ≤ 1 per unique data type | Phase 2 |
| Report page memory | < 100 MB | Phase 3 |
| Scroll FPS | ≥ 30 FPS on long lists | Phase 4 |

---

*Report generated by audit-only analysis. No application source files were modified. All measurements are from the existing production build at `d:\dns erp\dist\`. Estimates are clearly labeled.*
