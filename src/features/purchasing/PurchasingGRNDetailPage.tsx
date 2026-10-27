import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGRN } from '../../hooks/useGRN';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Boxes,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Calendar,
  PackageCheck,
  AlertTriangle,
  Printer,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';

export function PurchasingGRNDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { grnService } = useGRN();

  const [grn, setGrn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGRN = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await grnService.getGRNById(id);
        if (!data) {
          setError('GRN record not found');
        } else {
          setGrn(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch GRN');
      } finally {
        setLoading(false);
      }
    };
    fetchGRN();
  }, [id, grnService]);

  if (loading) {
    return (
      <div className="space-y-6">
        <TableLoadingSkeleton />
      </div>
    );
  }

  if (error || !grn) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Goods Received Note Not Found</h2>
        <p className="text-sm text-slate-500">{error || 'Unable to locate GRN record.'}</p>
        <Button onClick={() => navigate('/purchasing/grn')}>Back to GRN List</Button>
      </div>
    );
  }

  const totalExpected = grn.items?.reduce((sum: number, i: any) => sum + (i.expectedQuantity || 0), 0) || 0;
  const totalReceived = grn.items?.reduce((sum: number, i: any) => sum + (i.receivedQuantity || 0), 0) || 0;
  const totalDamaged = grn.items?.reduce((sum: number, i: any) => sum + (i.damagedQuantity || 0), 0) || 0;
  const totalGood = totalReceived - totalDamaged;

  const totalValue =
    grn.totalValue ||
    grn.items?.reduce(
      (sum: number, i: any) =>
        sum + (i.receivedQuantity - (i.damagedQuantity || 0)) * (i.unitCostSnapshot || i.unitCost || 0),
      0
    ) ||
    0;

  return (
    <div className="space-y-6 pb-12">
      {/* Read-Only Restriction Banner */}
      <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            <strong>Read-Only Inspection Mode:</strong> As a Purchasing Officer, you have viewing authorization for inward deliveries. Modifications, stock adjustments, and approval actions are restricted to Stock Keeper and Finance roles.
          </span>
        </div>
        <Badge variant="outline" className="bg-slate-800 text-slate-200 border-slate-700 text-[10px] shrink-0 font-mono">
          SECURE VIEW
        </Badge>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/purchasing/grn')}
            className="text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>GRN Registry</span>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                {grn.grnNumber || grn.id}
              </h1>
              <Badge
                variant="outline"
                className={
                  grn.status === 'APPROVED' || grn.status === 'COSTED'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px]'
                    : grn.status === 'SUBMITTED'
                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px]'
                    : 'bg-slate-100 text-slate-700 font-mono text-[10px]'
                }
              >
                {grn.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Warehouse receiving note • Stock verification record
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print GRN Summary</span>
          </Button>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supplier & Origin Details */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>Supplier & Purchase Reference</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-900 text-sm">{grn.supplierName}</div>
            <div className="text-slate-600 font-mono">
              <span className="font-semibold text-slate-700">Supplier Code:</span> {grn.supplierId || 'N/A'}
            </div>
            {grn.purchaseOrderNumber && (
              <div className="text-slate-600 font-mono">
                <span className="font-semibold text-slate-700">Linked Purchase Order:</span>{' '}
                <span className="font-bold text-slate-900">{grn.purchaseOrderNumber}</span>
              </div>
            )}
            {grn.receivingDate && (
              <div className="text-slate-600">
                <span className="font-semibold text-slate-700">Delivery Received On:</span>{' '}
                {formatDate(grn.receivingDate)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warehouse Receiving Audit */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Receiving Dock & Approval Audit</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Warehouse</span>
                <span className="font-semibold text-slate-800 font-mono">{grn.warehouseId || 'WH-MAIN'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Received By</span>
                <span className="font-semibold text-slate-800">{grn.receivedById || 'Stock Keeper Desk'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Finance Approval</span>
                <span className="font-semibold text-slate-800">{grn.approvedById ? 'Verified & Approved' : 'Pending Review'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Approval Timestamp</span>
                <span className="font-semibold text-slate-800">{grn.approvedAt ? formatDate(grn.approvedAt) : 'Pending'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Expected Qty</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{totalExpected}</span>
        </div>
        <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-center">
          <span className="text-[10px] font-bold uppercase text-blue-700 block">Delivered Qty</span>
          <span className="text-xl font-bold font-mono text-blue-900 mt-0.5 block">{totalReceived}</span>
        </div>
        <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200 text-center">
          <span className="text-[10px] font-bold uppercase text-rose-700 block">Damaged / Rejected</span>
          <span className="text-xl font-bold font-mono text-rose-900 mt-0.5 block">{totalDamaged}</span>
        </div>
        <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">Accepted Stock</span>
          <span className="text-xl font-bold font-mono text-emerald-900 mt-0.5 block">{totalGood}</span>
        </div>
      </div>

      {/* Received Items Breakdown Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Received Goods Line Verification ({grn.items?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product / Item</th>
                  <th className="py-3 px-4 font-mono">SKU</th>
                  <th className="py-3 px-4 text-right w-24">Expected</th>
                  <th className="py-3 px-4 text-right w-24">Received</th>
                  <th className="py-3 px-4 text-right w-24">Damaged</th>
                  <th className="py-3 px-4 text-right w-24">Good Qty</th>
                  <th className="py-3 px-4 text-right w-28">Unit Cost</th>
                  <th className="py-3 px-4 text-right w-32">Line Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grn.items?.map((item: any, idx: number) => {
                  const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
                  const goodQty = item.receivedQuantity - (item.damagedQuantity || 0);
                  const unitCost = item.unitCostSnapshot ?? item.unitCost ?? 0;
                  const lineVal = item.lineValue ?? goodQty * unitCost;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/40">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.productNameSnapshot || product?.name || item.productId}
                        {item.serialNumbers && item.serialNumbers.length > 0 && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Serials: {item.serialNumbers.slice(0, 3).join(', ')}{' '}
                            {item.serialNumbers.length > 3 && `(+${item.serialNumbers.length - 3} more)`}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {item.skuSnapshot || product?.sku || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {item.expectedQuantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {item.receivedQuantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-600 font-semibold">
                        {item.damagedQuantity || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-bold">
                        {goodQty}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {formatCurrency(unitCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(lineVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end p-4 border-t border-slate-100 bg-slate-50/60">
            <div className="text-right">
              <span className="text-xs text-slate-500 mr-3">Verified Total Line Value:</span>
              <span className="font-mono font-bold text-base text-slate-900">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
