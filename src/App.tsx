import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { StandardLayout } from './layouts/StandardLayout';
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
import { InventoryDashboardPage } from './features/inventory/InventoryDashboardPage';
import { GRNListPage } from './features/inventory/GRNListPage';
import { GRNCreateEditPage } from './features/inventory/GRNCreateEditPage';
import { GRNDetailPage } from './features/inventory/GRNDetailPage';
import { StockBalancePage } from './features/inventory/StockBalancePage';
import { StockMovementsPage } from './features/inventory/StockMovementsPage';
import { OrderPickingPage } from './features/inventory/OrderPickingPage';
import { DispatchPage } from './features/inventory/DispatchPage';
import { TransferListPage } from './features/inventory/TransferListPage';
import { InvoiceListPage } from './features/invoices/InvoiceListPage';
import { InvoiceDetailPage } from './features/invoices/InvoiceDetailPage';
import { PaymentListPage } from './features/payments/PaymentListPage';
import { PaymentCollectionPage } from './features/payments/PaymentCollectionPage';
import { PaymentDetailPage } from './features/payments/PaymentDetailPage';
import { ShowroomPOSTerminal } from './features/pos/ShowroomPOSTerminal';
import { POSTransactionHistoryPage } from './features/pos/POSTransactionHistoryPage';
import { POSSessionsPage } from './features/pos/POSSessionsPage';
import { WarrantyHubPage } from './features/warranty/WarrantyHubPage';
import { CommissionHubPage } from './features/commissions/CommissionHubPage';
import { FinanceLayout } from './features/finance/FinanceLayout';
import { FinanceDashboardPage } from './features/finance/pages/FinanceDashboardPage';
import { ChartOfAccountsPage } from './features/finance/pages/ChartOfAccountsPage';
import { SuppliersPage } from './features/finance/pages/SuppliersPage';
import { PaymentApprovalPage } from './features/finance/pages/PaymentApprovalPage';
import { FinanceCommissionsPage } from './features/finance/pages/FinanceCommissionsPage';
import { FinanceDeskPage } from './features/finance/pages/FinanceDeskPage';
import { FinanceReportsHubPage } from './features/finance/pages/reports/FinanceReportsHubPage';
import { ProfitLossPage } from './features/finance/pages/reports/ProfitLossPage';
import { BalanceSheetPage } from './features/finance/pages/reports/BalanceSheetPage';
import { TrialBalancePage } from './features/finance/pages/reports/TrialBalancePage';
import { GeneralLedgerPage } from './features/finance/pages/reports/GeneralLedgerPage';
import { VatSummaryPage } from './features/finance/pages/reports/VatSummaryPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Standard Single-Column Content Pages */}
        <Route element={<StandardLayout />}>
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

        {/* Phase 6: Warehouse & Inventory */}
        <Route
          path="inventory"
          element={
            <ProtectedRoute>
              <InventoryDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/grn"
          element={
            <ProtectedRoute>
              <GRNListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/grn/new"
          element={
            <ProtectedRoute>
              <GRNCreateEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/grn/:id"
          element={
            <ProtectedRoute>
              <GRNDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/stock"
          element={
            <ProtectedRoute>
              <StockBalancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/movements"
          element={
            <ProtectedRoute>
              <StockMovementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/picking"
          element={
            <ProtectedRoute>
              <OrderPickingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/dispatch"
          element={
            <ProtectedRoute>
              <DispatchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/transfers"
          element={
            <ProtectedRoute>
              <TransferListPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 7: Invoice & Payments Management */}
        <Route
          path="invoices"
          element={
            <ProtectedRoute>
              <InvoiceListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices/:id"
          element={
            <ProtectedRoute>
              <InvoiceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments"
          element={
            <ProtectedRoute>
              <PaymentListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/new"
          element={
            <ProtectedRoute>
              <PaymentCollectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/:id"
          element={
            <ProtectedRoute>
              <PaymentDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 8: Showroom Point of Sale (POS) */}
        <Route
          path="pos"
          element={
            <ProtectedRoute>
              <ShowroomPOSTerminal />
            </ProtectedRoute>
          }
        />
        <Route
          path="pos/transactions"
          element={
            <ProtectedRoute>
              <POSTransactionHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pos/sessions"
          element={
            <ProtectedRoute>
              <POSSessionsPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 10: Warranty, Loyalty & Commissions */}
        <Route
          path="warranty"
          element={
            <ProtectedRoute>
              <WarrantyHubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="commissions"
          element={
            <ProtectedRoute>
              <CommissionHubPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        </Route>

        {/* Phase 9: Finance & Accounting Module with Direct Extended Navigation */}
        <Route
          path="finance"
          element={
            <ProtectedRoute>
              <FinanceLayout />
            </ProtectedRoute>
          }
        >
          {/* Initial Screen: 1 - Journal Entry (The Finance Desk) */}
          <Route index element={<FinanceDeskPage />} />
          <Route path="desk" element={<FinanceDeskPage />} />
          <Route path="accounts" element={<ChartOfAccountsPage />} />
          <Route path="payment-approvals" element={<PaymentApprovalPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="commissions" element={<FinanceCommissionsPage />} />
          <Route path="dashboard" element={<FinanceDashboardPage />} />

          {/* 5 - Reports and sub-reports with easy backward navigation */}
          <Route path="reports" element={<FinanceReportsHubPage />} />
          <Route path="reports/pnl" element={<ProfitLossPage />} />
          <Route path="reports/balance-sheet" element={<BalanceSheetPage />} />
          <Route path="reports/trial-balance" element={<TrialBalancePage />} />
          <Route path="reports/general-ledger" element={<GeneralLedgerPage />} />
          <Route path="reports/vat" element={<VatSummaryPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
