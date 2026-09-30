import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Boxes, AlertTriangle, ShieldX, Zap, Building2, Store } from 'lucide-react';
import { InventoryReport } from '../../types/reports';
import { formatCurrencyLKR } from '../../utils/exportUtils';

interface InventoryAnalyticsTabProps {
  inventoryReport: InventoryReport;
}

export function InventoryAnalyticsTab({ inventoryReport }: InventoryAnalyticsTabProps) {
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
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span>Stock Positioning & Location Balance Ledger</span>
          </CardTitle>
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
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <ShieldX className="w-4 h-4 text-rose-600" />
                <span>Damaged Stock Quarantine & Valuation Loss</span>
              </div>
              <Badge variant="destructive" className="text-xs">
                {inventoryReport.damagedStockSummary.length} SKUs
              </Badge>
            </CardTitle>
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
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Fast-Moving Products (Demand Velocity)</span>
            </CardTitle>
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
    </div>
  );
}
