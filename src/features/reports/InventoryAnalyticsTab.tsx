import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { AlertTriangle, ShieldX, Zap, Building2, Download } from 'lucide-react';
import { InventoryReport } from '../../types/reports';
import { formatCurrencyLKR, exportToCSV } from '../../utils/exportUtils';
import { Button } from '../../components/ui/button';

interface InventoryAnalyticsTabProps {
  inventoryReport: InventoryReport;
  advancedReports?: any;
}

export function InventoryAnalyticsTab({ inventoryReport, advancedReports }: InventoryAnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Inventory Valuation Header Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary-light/40 border-primary-border/40">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-primary-text uppercase tracking-wider">
              Total Stock Valuation
            </span>
            <p className="text-2xl font-semibold tabular-nums text-indigo-950 mt-1">
              {formatCurrencyLKR(inventoryReport.totalStockValue)}
            </p>
            <span className="text-xs text-primary mt-1 block">
              Cost basis across {inventoryReport.totalStockLines} catalog SKUs
            </span>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Warehouse Valuation
            </span>
            <p className="text-2xl font-semibold tabular-nums text-slate-900 mt-1">
              {formatCurrencyLKR(inventoryReport.warehouseStockValue)}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">Central bulk distribution facility</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Showroom Valuation
            </span>
            <p className="text-2xl font-semibold tabular-nums text-slate-900 mt-1">
              {formatCurrencyLKR(inventoryReport.showroomStockValue)}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">Retail floor & active counter stock</span>
          </CardContent>
        </Card>

        <Card className="bg-rose-50/40 border-rose-100">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Damaged Stock Loss Value
            </span>
            <p className="text-2xl font-semibold tabular-nums text-rose-950 mt-1">
              {formatCurrencyLKR(inventoryReport.damagedStockValue)}
            </p>
            <span className="text-xs text-rose-600 mt-1 block">
              {inventoryReport.damagedStockSummary.length} SKUs quarantined
            </span>
          </CardContent>
        </Card>

        <Card
          className={
            inventoryReport.lowStockCount > 0
              ? 'bg-amber-50/40 border-amber-200'
              : 'bg-slate-50 border-slate-200'
          }
        >
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Low Stock Warnings
            </span>
            <p className="text-2xl font-semibold tabular-nums text-amber-950 mt-1">
              {inventoryReport.lowStockCount} SKUs
            </p>
            <span className="text-xs text-amber-700 mt-1 block">
              {inventoryReport.lowStockCount > 0
                ? 'Stock levels below reorder threshold (< 10 units)'
                : 'All catalog items adequately stocked'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Stock by Location Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span>Stock Positioning & Location Balance Ledger</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              exportToCSV(
                `Stock_By_Location_${timestamp}`,
                ['Location', 'Units', 'Cost Valuation (LKR)'],
                inventoryReport.stockByLocation.map((loc) => [loc.location, loc.units, loc.value])
              );
            }}
            className="h-8 gap-1.5 flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download CSV</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {inventoryReport.stockByLocation.map((loc) => {
              const isDamaged = loc.location.toLowerCase().includes('damage');
              return (
                <div
                  key={loc.location}
                  className={`p-4 rounded-xl border ${
                    isDamaged
                      ? 'border-rose-200 bg-rose-50/30'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{loc.location}</span>
                    <Badge variant={isDamaged ? 'destructive' : 'outline'} className="text-xs font-medium tabular-nums">
                      {loc.units.toLocaleString()} Units
                    </Badge>
                  </div>
                  <p className="text-lg font-semibold tabular-nums text-slate-900 mt-2">
                    {formatCurrencyLKR(loc.value)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {inventoryReport.totalStockValue > 0
                      ? `${Math.round((loc.value / inventoryReport.totalStockValue) * 100)}% of total company valuation`
                      : '0%'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Damaged Stock Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-rose-700">
              <ShieldX className="w-4 h-4 text-rose-600" />
              <span>Damaged Stock Quarantine & Valuation Loss</span>
            </div>
            <Badge variant="destructive" className="text-xs">
              {inventoryReport.damagedStockSummary.length} SKUs
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              exportToCSV(
                `Damaged_Stock_${timestamp}`,
                ['Product Name', 'Damaged Units', 'Estimated Cost Loss (LKR)'],
                inventoryReport.damagedStockSummary.map((item) => [item.name, item.damagedQty, item.estimatedLoss])
              );
            }}
            className="h-8 gap-1.5 flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download CSV</span>
          </Button>
        </CardHeader>
          <CardContent>
            {inventoryReport.damagedStockSummary.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No damaged stock recorded in quarantine.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-center">Damaged Units</th>
                      <th className="py-2.5 px-3 text-right">Estimated Cost Loss (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryReport.damagedStockSummary.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-3 text-center text-rose-700 font-semibold tabular-nums">
                          {item.damagedQty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-rose-700">
                          {formatCurrencyLKR(item.estimatedLoss)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fast Moving SKUs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Fast-Moving Products (Demand Velocity)</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              exportToCSV(
                `Fast_Moving_Products_${timestamp}`,
                ['SKU', 'Product Name', 'Units Sold'],
                inventoryReport.fastMovingProducts.map((p) => [p.sku, p.name, p.unitsSold])
              );
            }}
            className="h-8 gap-1.5 flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download CSV</span>
          </Button>
        </CardHeader>
          <CardContent>
            {inventoryReport.fastMovingProducts.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No sales movement recorded for velocity computation.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-right">Units Sold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryReport.fastMovingProducts.map((p) => (
                      <tr key={p.productId} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                          {p.sku}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 font-medium">{p.name}</td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-primary">
                          {p.unitsSold.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced Inventory Analytics */}
      {advancedReports?.slowMovingProducts && advancedReports.slowMovingProducts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Slow Moving Products</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Slow_Moving_Products_${timestamp}`,
                  ['Product Name', 'SKU', 'Units Sold', 'Stock On Hand', 'Velocity Score'],
                  advancedReports.slowMovingProducts.map((item: any) => [item.name, item.sku, item.unitsSold, item.stockOnHand, item.velocityScore])
                );
              }}
              className="h-8 gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Units Sold</th>
                    <th className="px-4 py-3">Stock On Hand</th>
                    <th className="px-4 py-3">Velocity Score</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.slowMovingProducts.slice(0, 5).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-3">{item.sku}</td>
                      <td className="px-4 py-3">{item.unitsSold}</td>
                      <td className="px-4 py-3">{item.stockOnHand}</td>
                      <td className="px-4 py-3">{item.velocityScore.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {advancedReports?.oldStockTracking && advancedReports.oldStockTracking.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Old Stock (&gt; 90 days unmoved)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Old_Stock_${timestamp}`,
                  ['Product Name', 'Days Unmoved', 'Quantity', 'Value (LKR)'],
                  advancedReports.oldStockTracking.map((item: any) => [item.productName, item.daysUnmoved, item.quantity, item.stockValue])
                );
              }}
              className="h-8 gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Days Unmoved</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Value (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.oldStockTracking.slice(0, 5).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.productName}</td>
                      <td className="px-4 py-3 text-red-600 font-bold">{item.daysUnmoved}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">{item.stockValue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {advancedReports?.stockVariance && advancedReports.stockVariance.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Stock Variance</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Stock_Variance_${timestamp}`,
                  ['Product Name', 'System Quantity', 'Physical Quantity', 'Variance', 'Reason'],
                  advancedReports.stockVariance.map((item: any) => [item.productName, item.systemQuantity, item.actualQuantity, item.variance, item.reason])
                );
              }}
              className="h-8 gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">System Quantity</th>
                    <th className="px-4 py-3">Physical Quantity</th>
                    <th className="px-4 py-3">Variance</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.stockVariance.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.productName}</td>
                      <td className="px-4 py-3">{item.systemQuantity}</td>
                      <td className="px-4 py-3">{item.actualQuantity}</td>
                      <td className={`px-4 py-3 font-bold ${item.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.variance}
                      </td>
                      <td className="px-4 py-3">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {advancedReports?.stockMovement && advancedReports.stockMovement.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Stock Movement</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Stock_Movement_${timestamp}`,
                  ['Date', 'Product Name', 'Type', 'Quantity', 'Reference'],
                  advancedReports.stockMovement.map((item: any) => [item.date, item.productName, item.movementType, item.quantity, item.referenceId])
                );
              }}
              className="h-8 gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.stockMovement.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3">{item.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.productName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.movementType === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {item.movementType}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">{item.referenceId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {advancedReports?.grnSummary && advancedReports.grnSummary.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>GRN Summary</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `GRN_Summary_${timestamp}`,
                  ['Date', 'GRN Number', 'Supplier', 'Total Value', 'Received By'],
                  advancedReports.grnSummary.map((item: any) => [item.date, item.grnId, item.supplierName, item.totalValue, item.receivedBy])
                );
              }}
              className="h-8 gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">GRN Number</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Total Value</th>
                    <th className="px-4 py-3">Received By</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.grnSummary.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3">{item.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.grnId}</td>
                      <td className="px-4 py-3">{item.supplierName}</td>
                      <td className="px-4 py-3">{item.totalValue?.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.receivedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {advancedReports?.batchExpiration && advancedReports.batchExpiration.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Batch Expiration Tracking</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Batch_Expiration_${timestamp}`,
                  ['Product Name', 'Batch Number', 'Expiry Date', 'Quantity', 'Days To Expiry'],
                  advancedReports.batchExpiration.map((item: any) => [item.productName, item.batchNumber, item.expiryDate, item.quantity, item.daysToExpiry])
                );
              }}
              className="h-8 gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Batch Number</th>
                    <th className="px-4 py-3">Expiry Date</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Days To Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.batchExpiration.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.productName}</td>
                      <td className="px-4 py-3">{item.batchNumber}</td>
                      <td className="px-4 py-3">{item.expiryDate}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.daysToExpiry <= 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                          {item.daysToExpiry} days
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

