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
import { MonthlyTransactionsAuditPage } from './features/finance/pages/reports/MonthlyTransactionsAuditPage';
import { VendorBillCostingPage } from './features/finance/pages/ap/VendorBillCostingPage';
import { SupplierAdvancePaymentsPage } from './features/finance/pages/ap/SupplierAdvancePaymentsPage';
import { SupplierDebitNotesPage } from './features/finance/pages/ap/SupplierDebitNotesPage';
import { BatchSupplierPaymentPage } from './features/finance/pages/ap/BatchSupplierPaymentPage';
import { ReceiptApprovalQueuePage } from './features/finance/pages/ar/ReceiptApprovalQueuePage';
import { ARCollectionAllocationPage } from './features/finance/pages/ar/ARCollectionAllocationPage';
import { PDCVaultPage } from './features/finance/pages/ar/PDCVaultPage';
import { CustomerCreditNotesPage } from './features/finance/pages/ar/CustomerCreditNotesPage';
import { ManualJournalPage } from './features/finance/pages/journal/ManualJournalPage';
import { BankReconciliationPage } from './features/finance/pages/reconciliation/BankReconciliationPage';
import { FinancialPeriodLockPage } from './features/finance/pages/settings/FinancialPeriodLockPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { Toaster } from 'sonner';
import { AreaListPage } from './features/administration/AreaListPage';
import { TeamListPage } from './features/administration/TeamListPage';

export function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
        <Route
          path="areas"
          element={
            <ProtectedRoute>
              <AreaListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="teams"
          element={
            <ProtectedRoute>
              <TeamListPage />
            </ProtectedRoute>
          }
        />
        </Route>

        {/* Phase 1: Finance & Accounting Module Executive Navigation */}
        <Route
          path="finance"
          element={
            <ProtectedRoute>
              <FinanceLayout />
            </ProtectedRoute>
          }
        >
          {/* Executive Dashboard as central landing page */}
          <Route index element={<FinanceDashboardPage />} />
          <Route path="dashboard" element={<FinanceDashboardPage />} />

          {/* Legacy route redirections to unified workflows */}
          <Route path="desk" element={<Navigate to="/finance/journal/new" replace />} />
          <Route path="payment-approvals" element={<Navigate to="/finance/ar/approvals" replace />} />

          <Route path="journal/new" element={<ManualJournalPage />} />
          <Route path="accounts" element={<ChartOfAccountsPage />} />

          {/* Accounts Payable (AP) Workflows */}
          <Route path="ap/bills/new" element={<VendorBillCostingPage />} />
          <Route path="ap/advances" element={<SupplierAdvancePaymentsPage />} />
          <Route path="ap/debit-notes" element={<SupplierDebitNotesPage />} />
          <Route path="ap/payments/new" element={<BatchSupplierPaymentPage />} />

          {/* Accounts Receivable (AR) & Collections */}
          <Route path="ar/approvals" element={<ReceiptApprovalQueuePage />} />
          <Route path="ar/allocate" element={<ARCollectionAllocationPage />} />
          <Route path="ar/pdc-vault" element={<PDCVaultPage />} />
          <Route path="ar/credit-notes" element={<CustomerCreditNotesPage />} />

          {/* Bank Reconciliation Workspace */}
          <Route path="reconciliation" element={<BankReconciliationPage />} />

          {/* Period Closing & Settings */}
          <Route path="settings/closing" element={<FinancialPeriodLockPage />} />

          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="commissions" element={<FinanceCommissionsPage />} />

          {/* 5 - Reports and sub-reports with easy backward navigation */}
          <Route path="reports" element={<FinanceReportsHubPage />} />
          <Route path="reports/monthly-audit" element={<MonthlyTransactionsAuditPage />} />
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
    </>
  );
}
