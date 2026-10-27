import { useState, useMemo } from 'react';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { useFinanceLedger } from '../finance/hooks/useFinanceLedger';
import { useGRN } from '../../hooks/useGRN';
import { PurchaseOrderStatusBadge } from './components/PurchaseOrderStatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  Search,
  Building2,
  Package,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';

type ReportType =
  | 'PO_SUMMARY'
  | 'SUPPLIER_WISE'
  | 'PRODUCT_WISE'
  | 'STATUS_ANALYSIS'
  | 'PENDING_DELIVERIES'
  | 'COST_SUMMARY';

export function PurchasingReportsPage() {
  const { purchaseOrders, loading } = usePurchaseOrders();
  const { suppliers } = useFinanceLedger();
  const { grns } = useGRN();

  const [activeReport, setActiveReport] = useState<ReportType>('PO_SUMMARY');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Filtered orders according to active criteria
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (selectedSupplierId !== 'ALL' && po.supplierId !== selectedSupplierId) return false;
      if (statusFilter !== 'ALL' && po.status !== statusFilter) return false;
      if (startDate && po.orderDate < startDate) return false;
      if (endDate && po.orderDate > endDate) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchPO = po.poNumber.toLowerCase().includes(q);
        const matchSupplier = po.supplierName.toLowerCase().includes(q);
        const matchItem = po.items.some(
          (i) => i.productName.toLowerCase().includes(q) || i.productCode.toLowerCase().includes(q)
        );
        if (!matchPO && !matchSupplier && !matchItem) return false;
      }
      return true;
    });
  }, [purchaseOrders, selectedSupplierId, statusFilter, startDate, endDate, search]);

  // Supplier-Wise Aggregation
  const supplierReportData = useMemo(() => {
    const map = new Map<
      string,
      {
        supplierId: string;
        supplierName: string;
        supplierCode: string;
        poCount: number;
        totalSpend: number;
        completedCount: number;
        pendingCount: number;
      }
    >();

    filteredOrders.forEach((po) => {
      const existing = map.get(po.supplierId) || {
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        supplierCode: po.supplierCode,
        poCount: 0,
        totalSpend: 0,
        completedCount: 0,
        pendingCount: 0,
      };

      existing.poCount += 1;
      existing.totalSpend += po.grandTotal || 0;
      if (po.status === 'COMPLETED' || po.status === 'APPROVED' || po.status === 'SENT_TO_SUPPLIER') {
        existing.completedCount += 1;
      }
      if (po.status === 'PENDING_APPROVAL' || po.status === 'DRAFT') {
        existing.pendingCount += 1;
      }

      map.set(po.supplierId, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [filteredOrders]);

  // Product-Wise Aggregation
  const productReportData = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        productCode: string;
        productName: string;
        totalQuantity: number;
        totalValue: number;
        averageUnitPrice: number;
        poCount: number;
      }
    >();

    filteredOrders.forEach((po) => {
      po.items.forEach((item) => {
        const existing = map.get(item.productId) || {
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          totalQuantity: 0,
          totalValue: 0,
          averageUnitPrice: item.unitPrice,
          poCount: 0,
        };

        existing.totalQuantity += item.quantity;
        existing.totalValue += item.total;
        existing.poCount += 1;
        existing.averageUnitPrice = Number((existing.totalValue / existing.totalQuantity).toFixed(2));

        map.set(item.productId, existing);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredOrders]);

  // Overall report totals
  const overallTotals = useMemo(() => {
    const totalSpend = filteredOrders.reduce((sum, po) => sum + (po.grandTotal || 0), 0);
    const totalLines = filteredOrders.reduce((sum, po) => sum + po.items.length, 0);
    const avgPOValue = filteredOrders.length > 0 ? totalSpend / filteredOrders.length : 0;
    const totalDiscount = filteredOrders.reduce((sum, po) => sum + (po.totalDiscount || 0), 0);
    const totalTax = filteredOrders.reduce((sum, po) => sum + (po.taxTotal || 0), 0);

    return {
      totalSpend,
      totalLines,
      avgPOValue,
      totalDiscount,
      totalTax,
    };
  }, [filteredOrders]);

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeReport === 'PO_SUMMARY' || activeReport === 'PENDING_DELIVERIES' || activeReport === 'COST_SUMMARY') {
      csvContent += 'PO Number,Supplier Code,Supplier Name,Order Date,Expected Delivery,Status,Items Count,Subtotal,Discount,Tax,Grand Total\n';
      filteredOrders.forEach((po) => {
        csvContent += `"${po.poNumber}","${po.supplierCode}","${po.supplierName}","${po.orderDate}","${po.expectedDeliveryDate}","${po.status}",${po.items.length},${po.subtotal},${po.totalDiscount},${po.taxTotal},${po.grandTotal}\n`;
      });
    } else if (activeReport === 'SUPPLIER_WISE') {
      csvContent += 'Supplier Code,Supplier Name,Total Orders,Total Spend (LKR),Completed/Active,Pending Approval\n';
      supplierReportData.forEach((row) => {
        csvContent += `"${row.supplierCode}","${row.supplierName}",${row.poCount},${row.totalSpend},${row.completedCount},${row.pendingCount}\n`;
      });
    } else if (activeReport === 'PRODUCT_WISE') {
      csvContent += 'Product Code,Product Name,Total Ordered Units,Avg Unit Cost,Total Spend (LKR),PO References\n';
      productReportData.forEach((row) => {
        csvContent += `"${row.productCode}","${row.productName}",${row.totalQuantity},${row.averageUnitPrice},${row.totalValue},${row.poCount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `procurement_report_${activeReport.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && purchaseOrders.length === 0) {
    return (
      <div className="space-y-6">
        <TableLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Procurement & Purchasing Reports
            </h1>
            <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 text-xs">
              Live Analytics Hub
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real transactional reports covering Purchase Order summaries, supplier spends, product analytics, and fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs bg-white hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>Print Report</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Filtered Spend Value
            </span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
              {formatCurrency(overallTotals.totalSpend)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {filteredOrders.length} matching purchase orders
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Average PO Value
            </span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
              {formatCurrency(overallTotals.avgPOValue)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Across {overallTotals.totalLines} product lines
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Negotiated Discounts
            </span>
            <span className="text-2xl font-bold font-mono text-emerald-800 mt-1 block tabular-nums">
              {formatCurrency(overallTotals.totalDiscount)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Procurement cost reduction
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Applicable Tax Total
            </span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
              {formatCurrency(overallTotals.totalTax)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Standard VAT/SSCL input tax
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 print:hidden">
        {[
          { id: 'PO_SUMMARY', label: 'Purchase Order Summary', icon: FileSpreadsheet },
          { id: 'SUPPLIER_WISE', label: 'Supplier-Wise Analysis', icon: Building2 },
          { id: 'PRODUCT_WISE', label: 'Product-Wise Volume', icon: Package },
          { id: 'PENDING_DELIVERIES', label: 'Pending Deliveries', icon: Clock },
          { id: 'COST_SUMMARY', label: 'Cost & Margin Breakdown', icon: TrendingUp },
        ].map((tab) => {
          const isActive = activeReport === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs print:hidden">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search PO#, supplier, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Supplier Selector */}
        <select
          value={selectedSupplierId}
          onChange={(e) => setSelectedSupplierId(e.target.value)}
          className="h-9 text-xs rounded-md border border-slate-200 bg-white px-3 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          <option value="ALL">All Suppliers</option>
          {suppliers.map((sup) => (
            <option key={sup.id} value={sup.id}>
              {sup.name}
            </option>
          ))}
        </select>

        {/* Date Range Start */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium">From:</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 text-xs flex-1"
          />
        </div>

        {/* Date Range End */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium">To:</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 text-xs flex-1"
          />
        </div>
      </div>

      {/* Report Content Panels */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900">
            {activeReport === 'PO_SUMMARY' && 'Purchase Order Summary Report'}
            {activeReport === 'SUPPLIER_WISE' && 'Supplier Procurement & Spend Report'}
            {activeReport === 'PRODUCT_WISE' && 'Product Procurement Volume & Cost Report'}
            {activeReport === 'PENDING_DELIVERIES' && 'Expected Deliveries & Inward Transit Schedule'}
            {activeReport === 'COST_SUMMARY' && 'Procurement Cost & Tax Distribution'}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono">
            {filteredOrders.length} Transactions
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {/* 1. PO Summary Report */}
          {(activeReport === 'PO_SUMMARY' || activeReport === 'PENDING_DELIVERIES' || activeReport === 'COST_SUMMARY') && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Delivery Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th className="py-3 px-4 text-right">Tax</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No purchase orders matching the selected report filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{po.poNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{po.supplierName}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(po.orderDate)}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(po.expectedDeliveryDate)}</td>
                        <td className="py-3 px-4 text-center">
                          <PurchaseOrderStatusBadge status={po.status} />
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                          {formatCurrency(po.subtotal, po.currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600">
                          {po.totalDiscount > 0 ? `-${formatCurrency(po.totalDiscount, po.currency)}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                          {formatCurrency(po.taxTotal, po.currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatCurrency(po.grandTotal, po.currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. Supplier-Wise Report */}
          {activeReport === 'SUPPLIER_WISE' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Supplier Code</th>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4 text-center">Total PO Count</th>
                    <th className="py-3 px-4 text-center">Approved / Active</th>
                    <th className="py-3 px-4 text-center">Pending Review</th>
                    <th className="py-3 px-4 text-right">Total Procurement Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierReportData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No supplier procurement records found.
                      </td>
                    </tr>
                  ) : (
                    supplierReportData.map((row) => (
                      <tr key={row.supplierId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.supplierCode}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{row.supplierName}</td>
                        <td className="py-3 px-4 text-center font-mono font-semibold">{row.poCount}</td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-700">{row.completedCount}</td>
                        <td className="py-3 px-4 text-center font-mono text-amber-700">{row.pendingCount}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatCurrency(row.totalSpend)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. Product-Wise Report */}
          {activeReport === 'PRODUCT_WISE' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-right">Total Units Ordered</th>
                    <th className="py-3 px-4 text-right">Avg Unit Cost</th>
                    <th className="py-3 px-4 text-center">PO Occurrences</th>
                    <th className="py-3 px-4 text-right">Total Spend Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productReportData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No product procurement records found.
                      </td>
                    </tr>
                  ) : (
                    productReportData.map((row) => (
                      <tr key={row.productId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.productCode}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{row.productName}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {row.totalQuantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                          {formatCurrency(row.averageUnitPrice)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">{row.poCount}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatCurrency(row.totalValue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
