import { Boxes, TrendingUp, Scale, AlertTriangle } from 'lucide-react';
import { ReportHubLayout, ReportCardDef } from '../shared/ReportSharedUI';

const INVENTORY_REPORT_CARDS: ReportCardDef[] = [
  {
    id: 'stock-summary',
    title: 'Stock Summary Report',
    category: 'Stock Overview',
    description: 'Product-wise current stock — available, reserved, allocated, dispatched, and damaged quantities by warehouse and showroom locations.',
    path: '/reports/inventory/stock-summary',
    icon: Boxes,
    badge: 'Live Stock',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    features: ['Warehouse & Showroom Qty', 'Reserved & Damaged', 'Location Breakdown'],
  },
  {
    id: 'stock-movement',
    title: 'Stock Movement Report',
    category: 'Movement History',
    description: 'Complete stock movement history — IN (GRN receipts), OUT (dispatch), TRANSFER between locations, and ADJUSTMENT records.',
    path: '/reports/inventory/movements',
    icon: TrendingUp,
    badge: 'Movement Audit',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    features: ['IN / OUT / Transfer', 'Reference Documents', 'Date Range Filter'],
  },
  {
    id: 'stock-valuation',
    title: 'Stock Valuation Report',
    category: 'Inventory Valuation',
    description: 'Current inventory value using landed cost — product-wise stock value, available quantities, and total inventory valuation summary.',
    path: '/reports/inventory/valuation',
    icon: Scale,
    badge: 'Landed Cost',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    features: ['Landed Cost Valuation', 'Product-wise Value', 'Total Inventory Value'],
  },
  {
    id: 'low-stock',
    title: 'Low Stock & Reorder Report',
    category: 'Replenishment',
    description: 'Products below minimum stock levels, configured reorder levels, current quantities, and required reorder quantities for replenishment.',
    path: '/reports/inventory/low-stock',
    icon: AlertTriangle,
    badge: 'Reorder Alert',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    features: ['Below Reorder Level', 'Critical Stock Alert', 'Supplier Reference'],
  },
];

export function InventoryReportsHubPage() {
  return (
    <ReportHubLayout
      title="Inventory Reports"
      subtitle="Complete inventory visibility — stock levels, movement history, landed cost valuation, and reorder alerts."
      badgeLabel="4 Reports"
      cards={INVENTORY_REPORT_CARDS}
      searchPlaceholder="Search inventory reports..."
      countLabel="Inventory Reports"
    />
  );
}

