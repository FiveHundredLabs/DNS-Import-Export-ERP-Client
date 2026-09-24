import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProductListPage } from './features/products/ProductListPage';
import { ProductDetailPage } from './features/products/ProductDetailPage';
import { CustomerListPage } from './features/customers/CustomerListPage';
import { CustomerDetailPage } from './features/customers/CustomerDetailPage';
import { ApprovalsPage } from './features/approvals/ApprovalsPage';
import { QuotationListPage } from './features/quotations/QuotationListPage';
import { QuotationCreateEditPage } from './features/quotations/QuotationCreateEditPage';
import { QuotationDetailPage } from './features/quotations/QuotationDetailPage';
import { OrderListPage } from './features/orders/OrderListPage';
import { OrderCreateEditPage } from './features/orders/OrderCreateEditPage';
import { OrderDetailPage } from './features/orders/OrderDetailPage';
import { OrderTrackingPage } from './features/orders/OrderTrackingPage';
import { ModulePlaceholder } from './components/common/ModulePlaceholder';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { FileSpreadsheet, ShoppingCart, Boxes, Store, DollarSign, ShieldCheck, BarChart3 } from 'lucide-react';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Core Operational Routes */}
        <Route index element={<DashboardPage />} />

        {/* Phase 3: Master Data */}
        <Route
          path="products"
          element={
            <ProtectedRoute>
              <ProductListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="products/:id"
          element={
            <ProtectedRoute>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customers"
          element={
            <ProtectedRoute>
              <CustomerListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customers/:id"
          element={
            <ProtectedRoute>
              <CustomerDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Multi-Tier Approval Engine */}
        <Route
          path="approvals"
          element={
            <ProtectedRoute>
              <ApprovalsPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 4: Quotation Management */}
        <Route
          path="quotations"
          element={
            <ProtectedRoute>
              <QuotationListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="quotations/new"
          element={
            <ProtectedRoute>
              <QuotationCreateEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="quotations/:id"
          element={
            <ProtectedRoute>
              <QuotationDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="quotations/:id/edit"
          element={
            <ProtectedRoute>
              <QuotationCreateEditPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 5: Sales Order & Fulfillment Pipeline */}
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrderListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/new"
          element={
            <ProtectedRoute>
              <OrderCreateEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/tracking"
          element={
            <ProtectedRoute>
              <OrderTrackingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:id/edit"
          element={
            <ProtectedRoute>
              <OrderCreateEditPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="inventory"
          element={
            <ProtectedRoute>
              <ModulePlaceholder
                title="Warehouse & Inventory Management"
                modulePhase="Phase 6"
                description="GRN receiving, barcode restocking, stock balance by location, and dispatch/delivery flows."
                icon={Boxes}
                features={[
                  'Multi-warehouse: Central Colombo Warehouse vs Showroom Store',
                  'GRN receipt and Manager approval workflow',
                  'Reuses existing barcodes without duplicating product identities',
                  'Damaged and returned stock isolated from sellable inventory',
                ]}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="pos"
          element={
            <ProtectedRoute>
              <ModulePlaceholder
                title="Showroom Point of Sale (POS)"
                modulePhase="Phase 8"
                description="High-speed barcode checkout, showroom stock deduction, and cashier shift cash management."
                icon={Store}
                features={[
                  'Consumes canonical Product Master with live showroom inventory',
                  'Cashier session opening float, Cash In / Out, and shift reconciliation',
                  'Thermal 80mm ESC/POS hardware receipt printer abstraction',
                  'Cash and Cheque payment collection',
                ]}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="finance"
          element={
            <ProtectedRoute>
              <ModulePlaceholder
                title="Finance, Payments & Ledger"
                modulePhase="Phase 7 & 9"
                description="Payment verification, petty cash running balance, and categorized expense workflows."
                icon={DollarSign}
                features={[
                  'Multi-tier payment approval: Rep Recorded -> Finance Approved -> Balance updated',
                  'Running petty cash ledger: Opening + Cash Added - Expenses = Balance',
                  'Customer account statements and outstanding aging',
                  'Categorized expense claims with manager approvals',
                ]}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="warranty"
          element={
            <ProtectedRoute>
              <ModulePlaceholder
                title="Warranty & Claims Hub"
                modulePhase="Phase 10"
                description="Sold product tracking, dealer warranty note reconciliation, and claim resolution."
                icon={ShieldCheck}
                features={[
                  'Reconciles expected warranty notes vs received notes per dealer',
                  'Links warranty records to original customer invoice and product SKU',
                  'Warranty claim lifecycle from defect intake to replacement/repair',
                  'Dealer vs showroom warranty activation date handling',
                ]}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="reports"
          element={
            <ProtectedRoute>
              <ModulePlaceholder
                title="Enterprise Analytics & Reports"
                modulePhase="Phase 11"
                description="Role-aware reporting across sales performance, inventory movements, and financial health."
                icon={BarChart3}
                features={[
                  'Area Manager restricted to regional team performance',
                  'Director global consolidated financial and revenue statements',
                  'Stock movement ledgers and fast/slow-moving SKU analytics',
                  'CSV and PDF export readiness',
                ]}
              />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
