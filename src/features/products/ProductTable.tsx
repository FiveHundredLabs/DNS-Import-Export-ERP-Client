import { Product } from '../../types/product';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { formatCurrency } from '../../utils/formatters';
import { Edit3, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface ProductTableProps {
  products: Product[];
  onView: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onProposePrice?: (product: Product) => void;
}

export function ProductTable({
  products,
  onView,
  onEdit,
  onProposePrice,
}: ProductTableProps) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('products:edit');
  const canProposePrice = hasPermission('products:price_approval') || canEdit;
  const hasActions = Boolean((canProposePrice && onProposePrice) || (canEdit && onEdit));

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      {/* 1. Mobile Cards View (Hidden on md+) */}
      <div className="block md:hidden divide-y divide-slate-100">
        {products.map((p) => {
          const isDamaged = p.damagedStock > 0;
          return (
            <div
              key={p.id}
              onClick={() => onView(p)}
              className="p-3.5 space-y-2.5 active:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                    {p.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                    <span>{p.sku}</span>
                    <span>•</span>
                    <span className="font-sans text-slate-600">{p.categoryName}</span>
                  </div>
                </div>
                <Badge variant={p.status === 'ACTIVE' ? 'success' : 'secondary'} className="shrink-0 text-[10px]">
                  {p.status}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Selling Price</span>
                  <span className="font-bold font-mono text-slate-900">{formatCurrency(p.pricing.currentSellingPrice)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Stock On Hand</span>
                  <span className="font-bold font-mono text-slate-800">{p.stockOnHand} {p.uomCode}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Max Disc</span>
                  <span className="font-bold font-mono text-slate-700">{p.pricing.maxDiscountPercentage}%</span>
                </div>
              </div>

              {isDamaged && (
                <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span>{p.damagedStock} units quarantined as damaged stock</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. Desktop Full Table View (Hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto [scrollbar-width:thin]">
        <Table className="min-w-[850px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[240px]">Product / SKU</TableHead>
              <TableHead className="w-36">Category</TableHead>
              <TableHead className="text-right w-28">Cost Price</TableHead>
              <TableHead className="text-right w-32 font-bold">Selling Price</TableHead>
              <TableHead className="text-right w-24">Max Disc</TableHead>
              <TableHead className="text-center w-28">Stock On Hand</TableHead>
              <TableHead className="text-center w-24">Status</TableHead>
              {hasActions && <TableHead className="text-right w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const isDamaged = p.damagedStock > 0;
              return (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors focus:outline-hidden focus:bg-slate-50"
                  tabIndex={0}
                  onClick={() => onView(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onView(p);
                    }
                  }}
                >
                  <TableCell>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      {p.name}
                      {p.isPromotional && <Badge variant="warning">Promo</Badge>}
                    </div>
                    <div className="font-mono text-xs text-slate-500 mt-0.5">
                      SKU: {p.sku} | Barcode: {p.barcode}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] text-slate-600 font-normal">{p.categoryName}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[13px] text-slate-600 font-normal">
                    {formatCurrency(p.pricing.costPrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-[13.5px] text-slate-900">
                    {formatCurrency(p.pricing.currentSellingPrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[13px] text-slate-600 font-normal">
                    {p.pricing.maxDiscountPercentage}%
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-[13px] text-slate-900">
                      {p.stockOnHand} {p.uomCode}
                    </span>
                    {isDamaged && (
                      <div className="flex items-center justify-center gap-1 text-xs text-rose-600 font-medium mt-0.5">
                        <AlertTriangle className="h-3 w-3" /> {p.damagedStock} Damaged
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  {hasActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canProposePrice && onProposePrice && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onProposePrice(p);
                            }}
                            title="Propose Selling Price Change"
                          >
                            <TrendingUp className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {canEdit && onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(p);
                            }}
                            title="Edit Master Data"
                          >
                            <Edit3 className="h-4 w-4 text-slate-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
