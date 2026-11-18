import React, { Suspense } from 'react';
import { PageLoadingFallback } from './components/common/PageLoadingFallback';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { StandardLayout } from './layouts/StandardLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Toaster } from 'sonner';

// Route-based code splitting for all page components
const DashboardPage = React.lazy(() =>
  import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage || m.default }))
);
const ProductListPage = React.lazy(() =>
  import('./features/products/ProductListPage').then(m => ({ default: m.ProductListPage || m.default }))
);
const ProductDetailPage = React.lazy(() =>
  import('./features/products/ProductDetailPage').then(m => ({ default: m.ProductDetailPage || m.default }))
);
const CustomerListPage = React.lazy(() =>
  import('./features/customers/CustomerListPage').then(m => ({ default: m.CustomerListPage || m.default }))
);
const CustomerOnboardingPage = React.lazy(() =>
  import('./features/customers/CustomerOnboardingPage').then(m => ({ default: m.CustomerOnboardingPage || m.default }))
);
const CustomerDetailPage = React.lazy(() =>
  import('./features/customers/CustomerDetailPage').then(m => ({ default: m.CustomerDetailPage || m.default }))
);
const ApprovalsPage = React.lazy(() =>
  import('./features/approvals/ApprovalsPage').then(m => ({ default: m.ApprovalsPage || m.default }))
);
const StockManagerApprovalHub = React.lazy(() =>
  import('./features/inventory/components/StockManagerApprovalHub').then(m => ({ default: m.StockManagerApprovalHub || m.default }))
);
const QuotationListPage = React.lazy(() =>
  import('./features/quotations/QuotationListPage').then(m => ({ default: m.QuotationListPage || m.default }))
);
const QuotationCreateEditPage = React.lazy(() =>
  import('./features/quotations/QuotationCreateEditPage').then(m => ({ default: m.QuotationCreateEditPage || m.default }))
);
const QuotationDetailPage = React.lazy(() =>
  import('./features/quotations/QuotationDetailPage').then(m => ({ default: m.QuotationDetailPage || m.default }))
);
const OrderListPage = React.lazy(() =>
  import('./features/orders/OrderListPage').then(m => ({ default: m.OrderListPage || m.default }))
);
const OrderCreateEditPage = React.lazy(() =>
  import('./features/orders/OrderCreateEditPage').then(m => ({ default: m.OrderCreateEditPage || m.default }))
);
const OrderDetailPage = React.lazy(() =>
  import('./features/orders/OrderDetailPage').then(m => ({ default: m.OrderDetailPage || m.default }))
);
const OrderTrackingPage = React.lazy(() =>
  import('./features/orders/OrderTrackingPage').then(m => ({ default: m.OrderTrackingPage || m.default }))
);
const OrderActivityLogPage = React.lazy(() =>
  import('./features/orders/OrderActivityLogPage').then(m => ({ default: m.OrderActivityLogPage || m.default }))
);
const InventoryDashboardPage = React.lazy(() =>
  import('./features/inventory/InventoryDashboardPage').then(m => ({ default: m.InventoryDashboardPage || m.default }))
);
const GRNListPage = React.lazy(() =>
  import('./features/inventory/GRNListPage').then(m => ({ default: m.GRNListPage || m.default }))
);
const GRNCreateEditPage = React.lazy(() =>
  import('./features/inventory/GRNCreateEditPage').then(m => ({ default: m.GRNCreateEditPage || m.default }))
);
const GRNDetailPage = React.lazy(() =>
  import('./features/inventory/GRNDetailPage').then(m => ({ default: m.GRNDetailPage || m.default }))
);
const GRNUnitStickersPage = React.lazy(() =>
  import('./features/inventory/GRNUnitStickersPage').then(m => ({ default: m.GRNUnitStickersPage || m.default }))
);
const StockBalancePage = React.lazy(() =>
  import('./features/inventory/StockBalancePage').then(m => ({ default: m.StockBalancePage || m.default }))
);
const StockAdjustmentsPage = React.lazy(() =>
  import('./features/inventory/StockAdjustmentsPage').then(m => ({ default: m.StockAdjustmentsPage || m.default }))
);
const DamagedStockPage = React.lazy(() =>
  import('./features/inventory/DamagedStockPage').then(m => ({ default: m.DamagedStockPage || m.default }))
);
const StockMovementsPage = React.lazy(() =>
  import('./features/inventory/StockMovementsPage').then(m => ({ default: m.StockMovementsPage || m.default }))
);
const OrderPickingPage = React.lazy(() =>
  import('./features/inventory/OrderPickingPage').then(m => ({ default: m.OrderPickingPage || m.default }))
);
const DispatchPage = React.lazy(() =>
  import('./features/inventory/DispatchPage').then(m => ({ default: m.DispatchPage || m.default }))
);
const DeliveryNoteListPage = React.lazy(() =>
  import('./features/inventory/delivery-notes/DeliveryNoteListPage').then(m => ({ default: m.DeliveryNoteListPage || m.default }))
);
const DeliveryNoteCreatePage = React.lazy(() =>
  import('./features/inventory/delivery-notes/DeliveryNoteCreatePage').then(m => ({ default: m.DeliveryNoteCreatePage || m.default }))
);
const DeliveryNoteDetailPage = React.lazy(() =>
  import('./features/inventory/delivery-notes/DeliveryNoteDetailPage').then(m => ({ default: m.DeliveryNoteDetailPage || m.default }))
);
const InvoiceListPage = React.lazy(() =>
  import('./features/invoices/InvoiceListPage').then(m => ({ default: m.InvoiceListPage || m.default }))
);
const InvoiceDetailPage = React.lazy(() =>
  import('./features/invoices/InvoiceDetailPage').then(m => ({ default: m.InvoiceDetailPage || m.default }))
);
const InvoiceDraftEditPage = React.lazy(() =>
  import('./features/invoices/InvoiceDraftEditPage').then(m => ({ default: m.InvoiceDraftEditPage || m.default }))
);
const OrderApprovalDetailPage = React.lazy(() =>
  import('./features/approvals/OrderApprovalDetailPage').then(m => ({ default: m.OrderApprovalDetailPage || m.default }))
);
const MyApprovalsPage = React.lazy(() =>
  import('./features/approvals/MyApprovalsPage').then(m => ({ default: m.MyApprovalsPage || m.default }))
);
const PaymentListPage = React.lazy(() =>
  import('./features/payments/PaymentListPage').then(m => ({ default: m.PaymentListPage || m.default }))
);
const PaymentCollectionPage = React.lazy(() =>
  import('./features/payments/PaymentCollectionPage').then(m => ({ default: m.PaymentCollectionPage || m.default }))
);
const PaymentDetailPage = React.lazy(() =>
  import('./features/payments/PaymentDetailPage').then(m => ({ default: m.PaymentDetailPage || m.default }))
);
const CustomerPaymentDetailPage = React.lazy(() =>
  import('./features/payments/CustomerPaymentDetailPage').then(m => ({ default: m.CustomerPaymentDetailPage || m.default }))
);
const CustomerPaymentsTab = React.lazy(() =>
  import('./features/payments/CustomerPaymentsTab').then(m => ({ default: m.CustomerPaymentsTab || m.default }))
);
const ShowroomManagerHub = React.lazy(() =>
  import('./features/pos/ShowroomManagerHub').then(m => ({ default: m.ShowroomManagerHub || m.default }))
);
const DayEndPOSReportPage = React.lazy(() =>
  import('./features/pos/DayEndPOSReport').then(m => ({ default: m.DayEndPOSReportPage || m.default }))
);
const POSTransactionHistoryPage = React.lazy(() =>
  import('./features/pos/POSTransactionHistoryPage').then(m => ({ default: m.POSTransactionHistoryPage || m.default }))
);
const POSSessionsPage = React.lazy(() =>
  import('./features/pos/POSSessionsPage').then(m => ({ default: m.POSSessionsPage || m.default }))
);
const WarrantyHubPage = React.lazy(() =>
  import('./features/warranty/WarrantyHubPage').then(m => ({ default: m.WarrantyHubPage || m.default }))
);
const SalesRepWarrantyPage = React.lazy(() =>
  import('./features/warranty/SalesRepWarrantyPage').then(m => ({ default: m.SalesRepWarrantyPage || m.default }))
);
const CommissionHubPage = React.lazy(() =>
  import('./features/commissions/CommissionHubPage').then(m => ({ default: m.CommissionHubPage || m.default }))
);
const CommissionConfigPage = React.lazy(() =>
  import('./features/commissions/CommissionConfigPage').then(m => ({ default: m.CommissionConfigPage || m.default }))
);
const PerformanceDashboardPage = React.lazy(() =>
  import('./features/performance/PerformanceDashboardPage').then(m => ({ default: m.PerformanceDashboardPage || m.default }))
);
const CustomerCreditTermsSettings = React.lazy(() =>
  import('./features/dashboard/CustomerCreditTermsSettings').then(m => ({ default: m.CustomerCreditTermsSettings || m.default }))
);
const FinanceLayout = React.lazy(() =>
  import('./features/finance/FinanceLayout').then(m => ({ default: m.FinanceLayout || m.default }))
);
const FinanceDashboardPage = React.lazy(() =>
  import('./features/finance/pages/FinanceDashboardPage').then(m => ({ default: m.FinanceDashboardPage || m.default }))
);
const ChartOfAccountsPage = React.lazy(() =>
  import('./features/finance/pages/ChartOfAccountsPage').then(m => ({ default: m.ChartOfAccountsPage || m.default }))
);
const SuppliersPage = React.lazy(() =>
  import('./features/finance/pages/SuppliersPage').then(m => ({ default: m.SuppliersPage || m.default }))
);
const PaymentApprovalPage = React.lazy(() =>
  import('./features/finance/pages/PaymentApprovalPage').then(m => ({ default: m.PaymentApprovalPage || m.default }))
);
const FinanceCommissionsPage = React.lazy(() =>
  import('./features/finance/pages/FinanceCommissionsPage').then(m => ({ default: m.FinanceCommissionsPage || m.default }))
);
const FinanceDeskPage = React.lazy(() =>
  import('./features/finance/pages/FinanceDeskPage').then(m => ({ default: m.FinanceDeskPage || m.default }))
);
const FinanceReportsHubPage = React.lazy(() =>
  import('./features/finance/pages/reports/FinanceReportsHubPage').then(m => ({ default: m.FinanceReportsHubPage || m.default }))
);
const ProfitLossPage = React.lazy(() =>
  import('./features/finance/pages/reports/ProfitLossPage').then(m => ({ default: m.ProfitLossPage || m.default }))
);
const BalanceSheetPage = React.lazy(() =>
  import('./features/finance/pages/reports/BalanceSheetPage').then(m => ({ default: m.BalanceSheetPage || m.default }))
);
const TrialBalancePage = React.lazy(() =>
  import('./features/finance/pages/reports/TrialBalancePage').then(m => ({ default: m.TrialBalancePage || m.default }))
);
const GeneralLedgerPage = React.lazy(() =>
  import('./features/finance/pages/reports/GeneralLedgerPage').then(m => ({ default: m.GeneralLedgerPage || m.default }))
);
const VatSummaryPage = React.lazy(() =>
  import('./features/finance/pages/reports/VatSummaryPage').then(m => ({ default: m.VatSummaryPage || m.default }))
);
const MonthlyTransactionsAuditPage = React.lazy(() =>
  import('./features/finance/pages/reports/MonthlyTransactionsAuditPage').then(m => ({ default: m.MonthlyTransactionsAuditPage || m.default }))
);
const VendorBillCostingPage = React.lazy(() =>
  import('./features/finance/pages/ap/VendorBillCostingPage').then(m => ({ default: m.VendorBillCostingPage || m.default }))
);
const SupplierAdvancePaymentsPage = React.lazy(() =>
  import('./features/finance/pages/ap/SupplierAdvancePaymentsPage').then(m => ({ default: m.SupplierAdvancePaymentsPage || m.default }))
);
const SupplierDebitNotesPage = React.lazy(() =>
  import('./features/finance/pages/ap/SupplierDebitNotesPage').then(m => ({ default: m.SupplierDebitNotesPage || m.default }))
);
const BatchSupplierPaymentPage = React.lazy(() =>
  import('./features/finance/pages/ap/BatchSupplierPaymentPage').then(m => ({ default: m.BatchSupplierPaymentPage || m.default }))
);
const ReceiptApprovalQueuePage = React.lazy(() =>
  import('./features/finance/pages/ar/ReceiptApprovalQueuePage').then(m => ({ default: m.ReceiptApprovalQueuePage || m.default }))
);
const ARCollectionAllocationPage = React.lazy(() =>
  import('./features/finance/pages/ar/ARCollectionAllocationPage').then(m => ({ default: m.ARCollectionAllocationPage || m.default }))
);
const PDCVaultPage = React.lazy(() =>
  import('./features/finance/pages/ar/PDCVaultPage').then(m => ({ default: m.PDCVaultPage || m.default }))
);
const CustomerCreditNotesPage = React.lazy(() =>
  import('./features/finance/pages/ar/CustomerCreditNotesPage').then(m => ({ default: m.CustomerCreditNotesPage || m.default }))
);
const CommercialNotesPage = React.lazy(() =>
  import('./features/finance/pages/CommercialNotesPage').then(m => ({ default: m.CommercialNotesPage || m.default }))
);
const ManualJournalPage = React.lazy(() =>
  import('./features/finance/pages/journal/ManualJournalPage').then(m => ({ default: m.ManualJournalPage || m.default }))
);
const BankReconciliationPage = React.lazy(() =>
  import('./features/finance/pages/reconciliation/BankReconciliationPage').then(m => ({ default: m.BankReconciliationPage || m.default }))
);
const FinancialPeriodLockPage = React.lazy(() =>
  import('./features/finance/pages/settings/FinancialPeriodLockPage').then(m => ({ default: m.FinancialPeriodLockPage || m.default }))
);
const CashBookPage = React.lazy(() =>
  import('./features/finance/pages/CashBookPage').then(m => ({ default: m.CashBookPage || m.default }))
);
const IncomeDeskPage = React.lazy(() =>
  import('./features/finance/pages/IncomeDeskPage').then(m => ({ default: m.IncomeDeskPage || m.default }))
);
const ExpenseDeskPage = React.lazy(() =>
  import('./features/finance/pages/ExpenseDeskPage').then(m => ({ default: m.ExpenseDeskPage || m.default }))
);
const ReportsPage = React.lazy(() =>
  import('./features/reports/ReportsPage').then(m => ({ default: m.ReportsPage || m.default }))
);
const ReportsHubDispatcher = React.lazy(() =>
  import('./features/reports/ReportsHubDispatcher').then(m => ({ default: m.ReportsHubDispatcher || m.default }))
);
const SalesReportsHubPage = React.lazy(() =>
  import('./features/reports/sales/SalesReportsHubPage').then(m => ({ default: m.SalesReportsHubPage || m.default }))
);
const SalesSummaryReportPage = React.lazy(() =>
  import('./features/reports/sales/SalesSummaryReportPage').then(m => ({ default: m.SalesSummaryReportPage || m.default }))
);
const SalesOrderReportPage = React.lazy(() =>
  import('./features/reports/sales/SalesOrderReportPage').then(m => ({ default: m.SalesOrderReportPage || m.default }))
);
const SalesRepPerformanceReportPage = React.lazy(() =>
  import('./features/reports/sales/SalesRepPerformanceReportPage').then(m => ({ default: m.SalesRepPerformanceReportPage || m.default }))
);
const AreaSalesReportPage = React.lazy(() =>
  import('./features/reports/sales/AreaSalesReportPage').then(m => ({ default: m.AreaSalesReportPage || m.default }))
);
const SalesTargetReportPage = React.lazy(() =>
  import('./features/reports/sales/SalesTargetReportPage').then(m => ({ default: m.SalesTargetReportPage || m.default }))
);
const CustomerSalesReportPage = React.lazy(() =>
  import('./features/reports/sales/CustomerSalesReportPage').then(m => ({ default: m.CustomerSalesReportPage || m.default }))
);
const ProductSalesReportPage = React.lazy(() =>
  import('./features/reports/sales/ProductSalesReportPage').then(m => ({ default: m.ProductSalesReportPage || m.default }))
);
const SalesCollectionReportPage = React.lazy(() =>
  import('./features/reports/sales/SalesCollectionReportPage').then(m => ({ default: m.SalesCollectionReportPage || m.default }))
);
const SalesOutstandingReportPage = React.lazy(() =>
  import('./features/reports/sales/SalesOutstandingReportPage').then(m => ({ default: m.SalesOutstandingReportPage || m.default }))
);
const SalesProfitabilityReportPage = React.lazy(() =>
  import('./features/reports/sales/SalesProfitabilityReportPage').then(m => ({ default: m.SalesProfitabilityReportPage || m.default }))
);
const ShowroomSalesReportPage = React.lazy(() =>
  import('./features/reports/sales/ShowroomSalesReportPage').then(m => ({ default: m.ShowroomSalesReportPage || m.default }))
);
const PurchasingReportsHubPage = React.lazy(() =>
  import('./features/reports/purchasing/PurchasingReportsHubPage').then(m => ({ default: m.PurchasingReportsHubPage || m.default }))
);
const POReportPage = React.lazy(() =>
  import('./features/reports/purchasing/POReportPage').then(m => ({ default: m.POReportPage || m.default }))
);
const PurchaseSummaryReportPage = React.lazy(() =>
  import('./features/reports/purchasing/PurchaseSummaryReportPage').then(m => ({ default: m.PurchaseSummaryReportPage || m.default }))
);
const SupplierPurchaseReportPage = React.lazy(() =>
  import('./features/reports/purchasing/SupplierPurchaseReportPage').then(m => ({ default: m.SupplierPurchaseReportPage || m.default }))
);
const GRNReportPage = React.lazy(() =>
  import('./features/reports/purchasing/GRNReportPage').then(m => ({ default: m.GRNReportPage || m.default }))
);
const PurchaseReturnReportPage = React.lazy(() =>
  import('./features/reports/purchasing/PurchaseReturnReportPage').then(m => ({ default: m.PurchaseReturnReportPage || m.default }))
);
const PurchaseCostAnalysisPage = React.lazy(() =>
  import('./features/reports/purchasing/PurchaseCostAnalysisPage').then(m => ({ default: m.PurchaseCostAnalysisPage || m.default }))
);
const SupplierPaymentReportPage = React.lazy(() =>
  import('./features/reports/purchasing/SupplierPaymentReportPage').then(m => ({ default: m.SupplierPaymentReportPage || m.default }))
);
const PurchaseOutstandingReportPage = React.lazy(() =>
  import('./features/reports/purchasing/PurchaseOutstandingReportPage').then(m => ({ default: m.PurchaseOutstandingReportPage || m.default }))
);
const InventoryReportsHubPage = React.lazy(() =>
  import('./features/reports/inventory/InventoryReportsHubPage').then(m => ({ default: m.InventoryReportsHubPage || m.default }))
);
const StockSummaryReportPage = React.lazy(() =>
  import('./features/reports/inventory/StockSummaryReportPage').then(m => ({ default: m.StockSummaryReportPage || m.default }))
);
const StockMovementReportPage = React.lazy(() =>
  import('./features/reports/inventory/StockMovementReportPage').then(m => ({ default: m.StockMovementReportPage || m.default }))
);
const StockValuationReportPage = React.lazy(() =>
  import('./features/reports/inventory/StockValuationReportPage').then(m => ({ default: m.StockValuationReportPage || m.default }))
);
const LowStockReportPage = React.lazy(() =>
  import('./features/reports/inventory/LowStockReportPage').then(m => ({ default: m.LowStockReportPage || m.default }))
);
const LoginPage = React.lazy(() =>
  import('./features/auth/LoginPage').then(m => ({ default: m.LoginPage || m.default }))
);
const AreaListPage = React.lazy(() =>
  import('./features/administration/AreaListPage').then(m => ({ default: m.AreaListPage || m.default }))
);
const TeamListPage = React.lazy(() =>
  import('./features/administration/TeamListPage').then(m => ({ default: m.TeamListPage || m.default }))
);
const PurchasingDashboard = React.lazy(() =>
  import('./features/purchasing/PurchasingDashboard').then(m => ({ default: m.PurchasingDashboard || m.default }))
);
const PurchasingSuppliersPage = React.lazy(() =>
  import('./features/purchasing/PurchasingSuppliersPage').then(m => ({ default: m.PurchasingSuppliersPage || m.default }))
);
const PurchaseOrderListPage = React.lazy(() =>
  import('./features/purchasing/PurchaseOrderListPage').then(m => ({ default: m.PurchaseOrderListPage || m.default }))
);
const PurchaseOrderCreateEditPage = React.lazy(() =>
  import('./features/purchasing/PurchaseOrderCreateEditPage').then(m => ({ default: m.PurchaseOrderCreateEditPage || m.default }))
);
const PurchaseOrderDetailPage = React.lazy(() =>
  import('./features/purchasing/PurchaseOrderDetailPage').then(m => ({ default: m.PurchaseOrderDetailPage || m.default }))
);
const PurchaseOrderPrintPage = React.lazy(() =>
  import('./features/purchasing/PurchaseOrderPrintPage').then(m => ({ default: m.PurchaseOrderPrintPage || m.default }))
);
const PurchaseOrderApprovalPage = React.lazy(() =>
  import('./features/purchasing/PurchaseOrderApprovalPage').then(m => ({ default: m.PurchaseOrderApprovalPage || m.default }))
);
const PurchasingGRNListPage = React.lazy(() =>
  import('./features/purchasing/PurchasingGRNListPage').then(m => ({ default: m.PurchasingGRNListPage || m.default }))
);
const PurchasingGRNDetailPage = React.lazy(() =>
  import('./features/purchasing/PurchasingGRNDetailPage').then(m => ({ default: m.PurchasingGRNDetailPage || m.default }))
);
const PurchasingReportsPage = React.lazy(() =>
  import('./features/purchasing/PurchasingReportsPage').then(m => ({ default: m.PurchasingReportsPage || m.default }))
);
const PurchasingSupplierPaymentsPage = React.lazy(() =>
  import('./features/purchasing/PurchasingSupplierPaymentsPage').then(m => ({ default: m.PurchasingSupplierPaymentsPage || m.default }))
);
const PurchasingApprovalHub = React.lazy(() =>
  import('./features/purchasing/components/PurchasingApprovalHub').then(m => ({ default: m.PurchasingApprovalHub || m.default }))
);
const ProfilePage = React.lazy(() =>
  import('./features/profile/ProfilePage').then(m => ({ default: m.ProfilePage || m.default }))
);
const SupplierReturnsPage = React.lazy(() =>
  import('./features/purchasing/SupplierReturnsPage').then(m => ({ default: m.SupplierReturnsPage || m.default }))
);
const NotFoundPage = React.lazy(() =>
  import('./features/errors/NotFoundPage').then(m => ({ default: m.NotFoundPage || m.default }))
);
const ServerErrorPage = React.lazy(() =>
  import('./features/errors/ServerErrorPage').then(m => ({ default: m.ServerErrorPage || m.default }))
);

export function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Suspense fallback={null}>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/500" element={<ServerErrorPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Standard Single-Column Content Pages */}
        <Route element={<StandardLayout />}>
          {/* Core Operational Routes */}
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />


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
          path="customers/onboarding"
          element={
            <ProtectedRoute>
              <CustomerOnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customers/onboarding/:customerId"
          element={
            <ProtectedRoute>
              <CustomerOnboardingPage />
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
        <Route
          path="approvals/my-approvals"
          element={
            <ProtectedRoute>
              <MyApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="approvals/orders/:id"
          element={
            <ProtectedRoute>
              <OrderApprovalDetailPage />
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
          path="orders/activity-log"
          element={
            <ProtectedRoute>
              <OrderActivityLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:id/activity-log"
          element={
            <ProtectedRoute>
              <OrderActivityLogPage />
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
          path="inventory/grn/:id/stickers"
          element={
            <ProtectedRoute>
              <GRNUnitStickersPage />
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
          path="inventory/stock-adjustments"
          element={
            <ProtectedRoute>
              <StockAdjustmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/damaged-stock"
          element={
            <ProtectedRoute>
              <DamagedStockPage />
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
          path="inventory/delivery-notes"
          element={
            <ProtectedRoute>
              <DeliveryNoteListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/delivery-notes/new"
          element={
            <ProtectedRoute>
              <DeliveryNoteCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/approvals"
          element={
            <ProtectedRoute>
              <StockManagerApprovalHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/delivery-notes/:id"
          element={
            <ProtectedRoute>
              <DeliveryNoteDetailPage />
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
          path="invoices/:id/edit"
          element={
            <ProtectedRoute>
              <InvoiceDraftEditPage />
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
          path="payments/collect"
          element={
            <ProtectedRoute>
              <CustomerPaymentsTab />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/collect/:customerId"
          element={
            <ProtectedRoute>
              <CustomerPaymentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/customer/:customerId"
          element={
            <ProtectedRoute>
              <CustomerPaymentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customers/:customerId/pay"
          element={
            <ProtectedRoute>
              <CustomerPaymentDetailPage />
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
              <ShowroomManagerHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="pos/manager"
          element={
            <ProtectedRoute>
              <ShowroomManagerHub />
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
          path="warranty/verification"
          element={
            <ProtectedRoute>
              <SalesRepWarrantyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-performance"
          element={
            <ProtectedRoute>
              <PerformanceDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="commissions"
          element={
            <ProtectedRoute>
              <CommissionConfigPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="commissions/config"
          element={
            <ProtectedRoute>
              <CommissionConfigPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="commissions/configuration"
          element={
            <ProtectedRoute>
              <CommissionConfigPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings/credit-terms"
          element={
            <ProtectedRoute>
              <CustomerCreditTermsSettings />
            </ProtectedRoute>
          }
        />

        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="reports"
          element={
            <ProtectedRoute>
              <ReportsHubDispatcher />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports/sales"
          element={
            <ProtectedRoute>
              <SalesReportsHubPage />
            </ProtectedRoute>
          }
        />
        <Route path="reports/sales/summary" element={<ProtectedRoute><SalesSummaryReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/orders" element={<ProtectedRoute><SalesOrderReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/rep-performance" element={<ProtectedRoute><SalesRepPerformanceReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/reps" element={<ProtectedRoute><SalesRepPerformanceReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/area" element={<ProtectedRoute><AreaSalesReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/areas" element={<ProtectedRoute><AreaSalesReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/targets" element={<ProtectedRoute><SalesTargetReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/customers" element={<ProtectedRoute><CustomerSalesReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/products" element={<ProtectedRoute><ProductSalesReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/collections" element={<ProtectedRoute><SalesCollectionReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/outstanding" element={<ProtectedRoute><SalesOutstandingReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/profitability" element={<ProtectedRoute><SalesProfitabilityReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/showroom" element={<ProtectedRoute><ShowroomSalesReportPage /></ProtectedRoute>} />
        <Route path="reports/sales/pos-day-end" element={<ProtectedRoute><DayEndPOSReportPage /></ProtectedRoute>} />

        <Route
          path="reports/purchasing"
          element={
            <ProtectedRoute>
              <PurchasingReportsHubPage />
            </ProtectedRoute>
          }
        />
        <Route path="reports/purchasing/orders" element={<ProtectedRoute><POReportPage /></ProtectedRoute>} />
        <Route path="reports/purchasing/summary" element={<ProtectedRoute><PurchaseSummaryReportPage /></ProtectedRoute>} />
        <Route path="reports/purchasing/suppliers" element={<ProtectedRoute><SupplierPurchaseReportPage /></ProtectedRoute>} />
        <Route path="reports/purchasing/grn" element={<ProtectedRoute><GRNReportPage /></ProtectedRoute>} />
        <Route path="reports/purchasing/returns" element={<ProtectedRoute><PurchaseReturnReportPage /></ProtectedRoute>} />
        <Route path="reports/purchasing/cost-analysis" element={<ProtectedRoute><PurchaseCostAnalysisPage /></ProtectedRoute>} />
        <Route path="reports/purchasing/payments" element={<ProtectedRoute><SupplierPaymentReportPage /></ProtectedRoute>} />
        <Route path="reports/purchasing/outstanding" element={<ProtectedRoute><PurchaseOutstandingReportPage /></ProtectedRoute>} />

        <Route
          path="reports/inventory"
          element={
            <ProtectedRoute>
              <InventoryReportsHubPage />
            </ProtectedRoute>
          }
        />
        <Route path="reports/inventory/stock-summary" element={<ProtectedRoute><StockSummaryReportPage /></ProtectedRoute>} />
        <Route path="reports/inventory/summary" element={<ProtectedRoute><StockSummaryReportPage /></ProtectedRoute>} />
        <Route path="reports/inventory/movements" element={<ProtectedRoute><StockMovementReportPage /></ProtectedRoute>} />
        <Route path="reports/inventory/valuation" element={<ProtectedRoute><StockValuationReportPage /></ProtectedRoute>} />
        <Route path="reports/inventory/low-stock" element={<ProtectedRoute><LowStockReportPage /></ProtectedRoute>} />
        <Route path="reports/inventory/reorder" element={<ProtectedRoute><LowStockReportPage /></ProtectedRoute>} />

        <Route
          path="reports/finance"
          element={
            <ProtectedRoute>
              <FinanceReportsHubPage />
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
        <Route
          path="users"
          element={
            <ProtectedRoute>
              <TeamListPage />
            </ProtectedRoute>
          }
        />

        {/* Dedicated Purchasing Officer & Procurement Module */}
        <Route
          path="purchasing"
          element={
            <ProtectedRoute>
              <PurchasingDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/dashboard"
          element={
            <ProtectedRoute>
              <PurchasingDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/suppliers"
          element={
            <ProtectedRoute>
              <PurchasingSuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/payments"
          element={
            <ProtectedRoute>
              <PurchasingSupplierPaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/approvals"
          element={
            <ProtectedRoute>
              <PurchasingApprovalHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/orders"
          element={
            <ProtectedRoute>
              <PurchaseOrderListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/orders/new"
          element={
            <ProtectedRoute>
              <PurchaseOrderCreateEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/orders/:id"
          element={
            <ProtectedRoute>
              <PurchaseOrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/orders/:id/edit"
          element={
            <ProtectedRoute>
              <PurchaseOrderCreateEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/orders/:id/print"
          element={
            <ProtectedRoute>
              <PurchaseOrderPrintPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/approvals/:id"
          element={
            <ProtectedRoute>
              <PurchaseOrderApprovalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/orders/:id/approval"
          element={
            <ProtectedRoute>
              <PurchaseOrderApprovalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/grn"
          element={
            <ProtectedRoute>
              <PurchasingGRNListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/grn/:id"
          element={
            <ProtectedRoute>
              <PurchasingGRNDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/grn/:id/stickers"
          element={
            <ProtectedRoute>
              <GRNUnitStickersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/reports"
          element={
            <ProtectedRoute>
              <PurchasingReportsHubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchasing/returns"
          element={
            <ProtectedRoute>
              <SupplierReturnsPage />
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
          <Route path="accounts" element={<ChartOfAccountsPage defaultView="ACCOUNTS" />} />
          <Route path="categories" element={<ChartOfAccountsPage defaultView="CATEGORIES" />} />
          <Route path="cash-book" element={<Navigate to="/finance/expense" replace />} />
          <Route path="notes" element={<CommercialNotesPage />} />

          {/* Unified Income & Expense Desks (Al Akleel Unified Architecture) */}
          <Route path="income" element={<IncomeDeskPage />} />
          <Route path="receipts/new" element={<PaymentCollectionPage />} />
          <Route path="income/receipts/new" element={<Navigate to="/finance/receipts/new" replace />} />
          <Route path="income/new-receipt" element={<Navigate to="/finance/receipts/new" replace />} />
          <Route path="expense" element={<ExpenseDeskPage />} />

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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
      </Suspense>
    </>
  );
}
