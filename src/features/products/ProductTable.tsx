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
      <Table>

        <TableHeader>
          <TableRow>
            <TableHead>Product / SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Cost Price</TableHead>
            <TableHead className="text-right">Selling Price</TableHead>
            <TableHead className="text-right">Max Disc</TableHead>
            <TableHead className="text-center">Stock On Hand</TableHead>
            <TableHead className="text-center">Status</TableHead>
            {hasActions && <TableHead className="text-right">Actions</TableHead>}
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
                  <div className="font-mono text-[11px] text-slate-500">
                    SKU: {p.sku} | Barcode: {p.barcode}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600">{p.categoryName}</span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-slate-600">
                  {formatCurrency(p.pricing.costPrice)}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-xs text-slate-900">
                  {formatCurrency(p.pricing.currentSellingPrice)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-slate-600">
                  {p.pricing.maxDiscountPercentage}%
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-xs text-slate-900">
                    {p.stockOnHand} {p.uomCode}
                  </span>
                  {isDamaged && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-rose-600">
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
  );
}
