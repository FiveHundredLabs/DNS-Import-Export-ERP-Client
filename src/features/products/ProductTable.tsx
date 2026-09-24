import { Product } from '../../types/product';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { formatCurrency } from '../../utils/formatters';
import { Eye, Edit3, TrendingUp, AlertTriangle } from 'lucide-react';
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => {
            const isDamaged = p.damagedStock > 0;
            return (
              <TableRow key={p.id}>
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
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(p)}
                      title="View Product Details"
                    >
                      <Eye className="h-4 w-4 text-slate-600" />
                    </Button>
                    {canProposePrice && onProposePrice && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onProposePrice(p)}
                        title="Propose Selling Price Change"
                      >
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                      </Button>
                    )}
                    {canEdit && onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(p)}
                        title="Edit Master Data"
                      >
                        <Edit3 className="h-4 w-4 text-slate-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
