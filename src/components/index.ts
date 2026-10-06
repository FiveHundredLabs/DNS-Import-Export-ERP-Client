/**
 * ==============================================================================
 * DNS DISTRIBUTION ERP — CENTRAL COMPONENTS DIRECTORY
 * ==============================================================================
 * Single source of truth for all reusable components across the entire ERP.
 * Any UI developer can import primitives, layout components, entity selectors,
 * approval widgets, and status badges from `@/components` or `src/components`.
 *
 * Example:
 *   import {
 *     Button,
 *     Input,
 *     Select,
 *     Card,
 *     Badge,
 *     Header,
 *     Sidebar,
 *     CustomerSelector,
 *     ApprovalBadge,
 *     InvoiceStatusBadge
 *   } from '@/components';
 * ==============================================================================
 */

// 1. Shadcn UI Primitives
export * from './ui';

// 2. Common Navigation & Application Shell Components
export { Header } from './common/Header';
export { Sidebar } from './common/Sidebar';
export { MobileNav } from './common/MobileNav';
export { InnerSidebar } from './common/InnerSidebar';
export { RoleSwitcher } from './common/RoleSwitcher';
export { StatCard } from './common/StatCard';
export { EmptyState } from './common/EmptyState';
export { ErrorState } from './common/ErrorState';
export { LoadingSkeleton } from './common/LoadingSkeleton';
export { ModulePlaceholder } from './common/ModulePlaceholder';
export { ProtectedRoute } from './common/ProtectedRoute';

// 3. Reusable Entity Selectors & Summary Cards
export { CustomerSelector } from './selectors/CustomerSelector';
export { CustomerSummaryCard } from './selectors/CustomerSummaryCard';
export { ProductSelector } from './selectors/ProductSelector';
export { ProductSummaryCard } from './selectors/ProductSummaryCard';

// 4. Central Approval Engine Components
export { ApprovalBadge } from './approval/ApprovalBadge';
export { ApprovalTimeline } from './approval/ApprovalTimeline';
export { ApprovalActionDialog } from './approval/ApprovalActionDialog';

// 5. Layout Wrappers
export { InnerSidebarLayout } from './layout/InnerSidebarLayout';

// 6. Common ERP Status Badges & Reusable Modals
export { InvoiceStatusBadge } from '../features/invoices/InvoiceStatusBadge';
export { PaymentStatusBadge } from '../features/payments/PaymentStatusBadge';
export { WarrantyStatusBadge } from '../features/warranty/WarrantyStatusBadge';
export { ThermalReceiptModal } from '../features/payments/ThermalReceiptModal';
