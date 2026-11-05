import {
  FileText, BarChart3, Building2, Package, RotateCcw, TrendingDown,
  CreditCard, AlertCircle,
} from 'lucide-react';
import { ReportHubLayout, ReportCardDef } from '../shared/ReportSharedUI';

const PURCHASING_REPORT_CARDS: ReportCardDef[] = [
  {
    id: 'po-report',
    title: 'Purchase Order Report',
    category: 'PO Management',
    description: 'Complete purchase order list with status breakdown — draft, pending, approved, received, cancelled and rejected POs.',
    path: '/reports/purchasing/orders',
    icon: FileText,
    badge: 'PO Status',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    features: ['PO Status Breakdown', 'Value by Status', 'Supplier Filter'],
  },
  {
    id: 'purchase-summary',
    title: 'Purchase Summary Report',
    category: 'Purchase Analytics',
    description: 'Daily, monthly and yearly purchase totals, total purchase value, received quantities, and purchase trends over time.',
    path: '/reports/purchasing/summary',
    icon: BarChart3,
    badge: 'Period Trends',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    features: ['Monthly Totals', 'Received vs Ordered', 'Trend Analysis'],
  },
  {
    id: 'supplier-purchase',
    title: 'Supplier Purchase Report',
    category: 'Supplier Analytics',
    description: 'Supplier-wise purchase history, total purchasing value, PO counts, lead times, and supplier comparison reports.',
    path: '/reports/purchasing/suppliers',
    icon: Building2,
    badge: 'Supplier View',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    features: ['Supplier Spend', 'PO Count per Supplier', 'Lead Time Averages'],
  },
  {
    id: 'grn-report',
    title: 'GRN Report',
    category: 'Goods Receipt',
    description: 'Received goods and GRN history — quantities, dates, statuses, and supplier-wise goods receipt notes.',
    path: '/reports/purchasing/grn',
    icon: Package,
    badge: 'Goods Receipt',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    features: ['GRN History', 'Status Filter', 'Supplier-wise GRN'],
  },
  {
    id: 'purchase-returns',
    title: 'Purchase Return Report',
    category: 'Returns Management',
    description: 'Goods returned to suppliers — quantities, return reasons, return values, and complete return history.',
    path: '/reports/purchasing/returns',
    icon: RotateCcw,
    badge: 'Returns',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    features: ['Return Quantities', 'Return Reasons', 'Return Value'],
  },
  {
    id: 'cost-analysis',
    title: 'Purchase Cost Analysis',
    category: 'Cost Intelligence',
    description: 'Product-wise purchase costs, supplier price comparisons, average purchase costs, landed cost analysis, and margin calculation.',
    path: '/reports/purchasing/cost-analysis',
    icon: TrendingDown,
    badge: 'Landed Cost',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    features: ['Landed Cost per SKU', 'Price vs Sell Comparison', 'Margin Preview'],
  },
  {
    id: 'supplier-payments',
    title: 'Supplier Payment Report',
    category: 'AP Payments',
    description: 'Supplier-wise payment history, paid amounts, payment dates, payment methods, and outstanding supplier balances.',
    path: '/reports/purchasing/payments',
    icon: CreditCard,
    badge: 'Supplier AP',
    badgeColor: 'bg-green-50 text-green-700 border-green-200',
    features: ['Paid vs Pending', 'Payment Method Split', 'Supplier-wise Payments'],
  },
  {
    id: 'purchase-outstanding',
    title: 'Purchase Outstanding Report',
    category: 'AP Payables',
    description: 'Unpaid supplier invoices, outstanding amounts, due dates, overdue payments, and supplier-wise outstanding summaries.',
    path: '/reports/purchasing/outstanding',
    icon: AlertCircle,
    badge: 'AP Aging',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    features: ['Overdue Payables', 'Due Date Tracking', 'Supplier-wise Aging'],
  },
];

export function PurchasingReportsHubPage() {
  return (
    <ReportHubLayout
      title="Purchasing Reports"
      subtitle="End-to-end purchasing analytics — purchase orders, GRN, supplier performance, costs, payments, and payables."
      badgeLabel="8 Reports"
      cards={PURCHASING_REPORT_CARDS}
      searchPlaceholder="Search purchasing reports by title or category..."
      countLabel="Purchasing Reports"
    />
  );
}

