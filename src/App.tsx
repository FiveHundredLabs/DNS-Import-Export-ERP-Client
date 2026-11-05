import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { StandardLayout } from './layouts/StandardLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProductListPage } from './features/products/ProductListPage';
import { ProductDetailPage } from './features/products/ProductDetailPage';
import { CustomerListPage } from './features/customers/CustomerListPage';
import { CustomerOnboardingPage } from './features/customers/CustomerOnboardingPage';
import { CustomerDetailPage } from './features/customers/CustomerDetailPage';
import { ApprovalsPage } from './features/approvals/ApprovalsPage';
import { StockManagerApprovalHub } from './features/inventory/components/StockManagerApprovalHub';
import { QuotationListPage } from './features/quotations/QuotationListPage';
import { QuotationCreateEditPage } from './features/quotations/QuotationCreateEditPage';
import { QuotationDetailPage } from './features/quotations/QuotationDetailPage';
import { OrderListPage } from './features/orders/OrderListPage';
import { OrderCreateEditPage } from './features/orders/OrderCreateEditPage';
import { OrderDetailPage } from './features/orders/OrderDetailPage';
import { OrderTrackingPage } from './features/orders/OrderTrackingPage';
import { OrderActivityLogPage } from './features/orders/OrderActivityLogPage';
import { InventoryDashboardPage } from './features/inventory/InventoryDashboardPage';
import { GRNListPage } from './features/inventory/GRNListPage';
import { GRNCreateEditPage } from './features/inventory/GRNCreateEditPage';
import { GRNDetailPage } from './features/inventory/GRNDetailPage';
import { GRNUnitStickersPage } from './features/inventory/GRNUnitStickersPage';
import { StockBalancePage } from './features/inventory/StockBalancePage';
import { DamagedStockPage } from './features/inventory/DamagedStockPage';
import { StockMovementsPage } from './features/inventory/StockMovementsPage';
import { OrderPickingPage } from './features/inventory/OrderPickingPage';
import { DispatchPage } from './features/inventory/DispatchPage';
import { DeliveryNoteListPage } from './features/inventory/delivery-notes/DeliveryNoteListPage';
import { DeliveryNoteCreatePage } from './features/inventory/delivery-notes/DeliveryNoteCreatePage';
import { DeliveryNoteDetailPage } from './features/inventory/delivery-notes/DeliveryNoteDetailPage';
import { InvoiceListPage } from './features/invoices/InvoiceListPage';
import { InvoiceDetailPage } from './features/invoices/InvoiceDetailPage';
import { InvoiceDraftEditPage } from './features/invoices/InvoiceDraftEditPage';
import { OrderApprovalDetailPage } from './features/approvals/OrderApprovalDetailPage';
import { MyApprovalsPage } from './features/approvals/MyApprovalsPage';
import { PaymentListPage } from './features/payments/PaymentListPage';
import { PaymentCollectionPage } from './features/payments/PaymentCollectionPage';
import { PaymentDetailPage } from './features/payments/PaymentDetailPage';
import { CustomerPaymentDetailPage } from './features/payments/CustomerPaymentDetailPage';
import { CustomerPaymentsTab } from './features/payments/CustomerPaymentsTab';
import { ShowroomPOSTerminal } from './features/pos/ShowroomPOSTerminal';
import { ShowroomManagerHub } from './features/pos/ShowroomManagerHub';
import { useAuth } from './hooks/useAuth';
import { POSTransactionHistoryPage } from './features/pos/POSTransactionHistoryPage';
import { POSSessionsPage } from './features/pos/POSSessionsPage';
import { WarrantyHubPage } from './features/warranty/WarrantyHubPage';
import { SalesRepWarrantyPage } from './features/warranty/SalesRepWarrantyPage';
import { CommissionHubPage } from './features/commissions/CommissionHubPage';
import { CommissionConfigPage } from './features/commissions/CommissionConfigPage';
import { CustomerCreditTermsSettings } from './features/dashboard/CustomerCreditTermsSettings';
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
import { CashBookPage } from './features/finance/pages/CashBookPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { ReportsHubDispatcher } from './features/reports/ReportsHubDispatcher';

// Sales Reports
import { SalesReportsHubPage } from './features/reports/sales/SalesReportsHubPage';
import { SalesSummaryReportPage } from './features/reports/sales/SalesSummaryReportPage';
import { SalesOrderReportPage } from './features/reports/sales/SalesOrderReportPage';
import { SalesRepPerformanceReportPage } from './features/reports/sales/SalesRepPerformanceReportPage';
import { AreaSalesReportPage } from './features/reports/sales/AreaSalesReportPage';
import { SalesTargetReportPage } from './features/reports/sales/SalesTargetReportPage';
import { CustomerSalesReportPage } from './features/reports/sales/CustomerSalesReportPage';
import { ProductSalesReportPage } from './features/reports/sales/ProductSalesReportPage';
import { SalesCollectionReportPage } from './features/reports/sales/SalesCollectionReportPage';
import { SalesOutstandingReportPage } from './features/reports/sales/SalesOutstandingReportPage';
import { SalesProfitabilityReportPage } from './features/reports/sales/SalesProfitabilityReportPage';
import { ShowroomSalesReportPage } from './features/reports/sales/ShowroomSalesReportPage';

// Purchasing Reports
import { PurchasingReportsHubPage } from './features/reports/purchasing/PurchasingReportsHubPage';
import { POReportPage } from './features/reports/purchasing/POReportPage';
import { PurchaseSummaryReportPage } from './features/reports/purchasing/PurchaseSummaryReportPage';
import { SupplierPurchaseReportPage } from './features/reports/purchasing/SupplierPurchaseReportPage';
import { GRNReportPage } from './features/reports/purchasing/GRNReportPage';
import { PurchaseReturnReportPage } from './features/reports/purchasing/PurchaseReturnReportPage';
import { PurchaseCostAnalysisPage } from './features/reports/purchasing/PurchaseCostAnalysisPage';
import { SupplierPaymentReportPage } from './features/reports/purchasing/SupplierPaymentReportPage';
import { PurchaseOutstandingReportPage } from './features/reports/purchasing/PurchaseOutstandingReportPage';

// Inventory Reports
import { InventoryReportsHubPage } from './features/reports/inventory/InventoryReportsHubPage';
import { StockSummaryReportPage } from './features/reports/inventory/StockSummaryReportPage';
import { StockMovementReportPage } from './features/reports/inventory/StockMovementReportPage';
import { StockValuationReportPage } from './features/reports/inventory/StockValuationReportPage';
import { LowStockReportPage } from './features/reports/inventory/LowStockReportPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { Toaster } from 'sonner';
import { AreaListPage } from './features/administration/AreaListPage';
import { TeamListPage } from './features/administration/TeamListPage';
import { PurchasingDashboard } from './features/purchasing/PurchasingDashboard';
import { PurchasingSuppliersPage } from './features/purchasing/PurchasingSuppliersPage';
import { PurchaseOrderListPage } from './features/purchasing/PurchaseOrderListPage';
import { PurchaseOrderCreateEditPage } from './features/purchasing/PurchaseOrderCreateEditPage';
import { PurchaseOrderDetailPage } from './features/purchasing/PurchaseOrderDetailPage';
import { PurchaseOrderPrintPage } from './features/purchasing/PurchaseOrderPrintPage';
import { PurchaseOrderApprovalPage } from './features/purchasing/PurchaseOrderApprovalPage';
import { PurchasingGRNListPage } from './features/purchasing/PurchasingGRNListPage';
import { PurchasingGRNDetailPage } from './features/purchasing/PurchasingGRNDetailPage';
import { PurchasingReportsPage } from './features/purchasing/PurchasingReportsPage';
import { PurchasingSupplierPaymentsPage } from './features/purchasing/PurchasingSupplierPaymentsPage';
import { PurchasingApprovalHub } from './features/purchasing/components/PurchasingApprovalHub';
import { ProfilePage } from './features/profile/ProfilePage';
import { SupplierReturnsPage } from './features/purchasing/SupplierReturnsPage';

function POSRouteSwitcher() {
  const { role } = useAuth();
  if (role === 'MANAGER' || role === 'DIRECTOR' || role === 'SHOWROOM_MANAGER') {
    return <ShowroomManagerHub />;
  }
  return <ShowroomPOSTerminal />;
}

export function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/pos/terminal"
          element={
            <ProtectedRoute>
              <ShowroomPOSTerminal fullscreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos/terminal/:terminalId"
          element={
            <ProtectedRoute>
              <ShowroomPOSTerminal fullscreen />
            </ProtectedRoute>
          }
        />
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
              <POSRouteSwitcher />
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
          <Route path="accounts" element={<ChartOfAccountsPage />} />
          <Route path="cash-book" element={<CashBookPage />} />

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
