import {
  TrendingUp, FileSpreadsheet, Users2, MapPin, Target, UserCheck,
  Package, Banknote, AlertCircle, BarChart3, ShoppingBag, Store,
} from 'lucide-react';
import { ReportHubLayout, ReportCardDef } from '../shared/ReportSharedUI';

const SALES_REPORT_CARDS: ReportCardDef[] = [
  {
    id: 'sales-summary',
    title: 'Sales Summary Report',
    category: 'Sales Overview',
    description: 'Daily, monthly, quarterly and yearly sales totals including total revenue, delivered orders, and performance trends.',
    path: '/reports/sales/summary',
    icon: TrendingUp,
    badge: 'Period Trends',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    features: ['Monthly / Quarterly / Yearly', 'Revenue Trends', 'Delivered Order Counts'],
  },
  {
    id: 'sales-orders',
    title: 'Sales Order Report',
    category: 'Order Management',
    description: 'Complete order lifecycle view — created, approved, pending, dispatched, delivered, rejected and cancelled orders with status breakdown.',
    path: '/reports/sales/orders',
    icon: FileSpreadsheet,
    badge: 'Order Status',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    features: ['Status Breakdown', 'Order Filtering', 'Value by Status'],
  },
  {
    id: 'rep-performance',
    title: 'Sales Rep Performance Report',
    category: 'Team Performance',
    description: 'Sales representative-wise delivered sales, customer coverage, revenue, order counts, and individual performance comparisons.',
    path: '/reports/sales/rep-performance',
    icon: Users2,
    badge: 'Rep Analytics',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    features: ['Delivered Orders by Rep', 'Customer Coverage', 'Revenue per Rep'],
  },
  {
    id: 'area-sales',
    title: 'Area-wise Sales Report',
    category: 'Geographic Performance',
    description: 'Area-wise total sales, delivered orders, revenue, and performance comparisons across all distribution areas.',
    path: '/reports/sales/area',
    icon: MapPin,
    badge: 'Area Breakdown',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    features: ['Area Revenue Totals', 'Area Manager View', 'Performance Comparison'],
  },
  {
    id: 'target-achievement',
    title: 'Sales Target Achievement Report',
    category: 'Targets & KPIs',
    description: 'Rep-wise and area-wise assigned targets vs actual achievement, percentages, remaining targets, and monthly comparisons.',
    path: '/reports/sales/targets',
    icon: Target,
    badge: 'Target vs Actual',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    features: ['Achievement %', 'Remaining Targets', 'Monthly Comparisons'],
  },
  {
    id: 'customer-sales',
    title: 'Customer-wise Sales Report',
    category: 'Customer Analytics',
    description: 'Customer purchase history, total purchase value, order counts, frequency, and customer-wise sales trends.',
    path: '/reports/sales/customers',
    icon: UserCheck,
    badge: 'Customer Insights',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    features: ['Purchase History', 'Outstanding Balance', 'Order Frequency'],
  },
  {
    id: 'product-sales',
    title: 'Product-wise Sales Report',
    category: 'Product Performance',
    description: 'Product-wise sold quantities, total sales revenue, top-selling products, and product performance comparisons.',
    path: '/reports/sales/products',
    icon: Package,
    badge: 'SKU Analytics',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    features: ['Top-Selling Products', 'Qty & Revenue by SKU', 'Return Quantities'],
  },
  {
    id: 'collections',
    title: 'Sales Collection Report',
    category: 'Collections & Payments',
    description: 'Rep-wise, area-wise, and customer-wise collections with payment method breakdown, total collected amounts, and history.',
    path: '/reports/sales/collections',
    icon: Banknote,
    badge: 'Collections',
    badgeColor: 'bg-green-50 text-green-700 border-green-200',
    features: ['By Rep / Area / Customer', 'Payment Method Split', 'Cheque & Transfer'],
  },
  {
    id: 'outstanding',
    title: 'Sales Outstanding Report',
    category: 'Receivables',
    description: 'Customer-wise unpaid invoice amounts, outstanding balances, overdue balances, credit periods and due dates.',
    path: '/reports/sales/outstanding',
    icon: AlertCircle,
    badge: 'Aging Analysis',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    features: ['Aging Buckets', 'Overdue Tracking', 'Customer-wise Outstanding'],
  },
  {
    id: 'profitability',
    title: 'Sales Profitability Report',
    category: 'Profitability',
    description: 'Product-wise revenue vs landed cost, COGS, gross profit, and gross profit margins with area and product-wise breakdown.',
    path: '/reports/sales/profitability',
    icon: BarChart3,
    badge: 'Gross Margin',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    features: ['Landed Cost vs Revenue', 'Gross Profit Margin', 'COGS Analysis'],
  },
  {
    id: 'showroom-sales',
    title: 'Showroom Sales Report',
    category: 'POS & Showroom',
    description: 'Total showroom POS sales, daily revenue, transaction history, payment method breakdown (cash, card, cheque), and product-wise showroom sales.',
    path: '/reports/sales/showroom',
    icon: Store,
    badge: 'POS Showroom',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    features: ['Cash / Card / Cheque Split', 'POS Transactions', 'Daily Showroom Revenue'],
  },
];

export function SalesReportsHubPage() {
  return (
    <ReportHubLayout
      title="Sales Reports"
      subtitle="Comprehensive sales analytics — orders, rep performance, collections, profitability, and showroom POS."
      badgeLabel="11 Reports"
      cards={SALES_REPORT_CARDS}
      searchPlaceholder="Search sales reports by title or category..."
      countLabel="Sales Reports"
    />
  );
}

