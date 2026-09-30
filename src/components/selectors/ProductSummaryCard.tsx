import { Product } from '../../types/product';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { formatCurrency } from '../../utils/formatters';
import { Package, ShieldAlert } from 'lucide-react';

export function ProductSummaryCard({ product }: { product: Product }) {
  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              {product.categoryName} • SKU: {product.sku}
            </span>
            <h4 className="text-sm font-semibold text-slate-900 mt-0.5">{product.name}</h4>
          </div>
          <Badge variant={product.status === 'ACTIVE' ? 'success' : 'secondary'}>
            {product.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-500 block text-xs">Selling Price</span>
            <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(product.pricing.currentSellingPrice)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">Cost Price</span>
            <span className="text-slate-700 tabular-nums font-medium">{formatCurrency(product.pricing.costPrice)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">Max Rep Disc</span>
            <span className="text-slate-700 tabular-nums font-medium">{product.pricing.maxDiscountPercentage}%</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">Stock On Hand</span>
            <span className="font-semibold text-slate-900 tabular-nums">{product.stockOnHand} {product.uomCode}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
