import { useState } from 'react';
import { Product } from '../../types/product';
import { useProducts } from '../../hooks/useProducts';
import { formatCurrency } from '../../utils/formatters';
import { Search, PackageCheck } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface ProductSelectorProps {
  onSelect: (product: Product) => void;
  selectedProductId?: string;
}

export function ProductSelector({ onSelect, selectedProductId }: ProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { products, loading } = useProducts({ search: searchTerm, page: 1, pageSize: 20 });

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search Product Master by SKU, Name, Barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-md border border-slate-100">
        {loading ? (
          <div className="p-3 text-center text-xs text-slate-400">Loading Product Master...</div>
        ) : products.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-400">No products match your search.</div>
        ) : (
          products.map((p) => {
            const isSelected = p.id === selectedProductId;
            return (
              <div
                key={p.id}
                onClick={() => onSelect(p)}
                className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                  isSelected ? 'bg-indigo-50/80 border-l-2 border-indigo-600' : 'hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    {p.name}
                    {p.isPromotional && <Badge variant="warning">Promo</Badge>}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    SKU: {p.sku} | Barcode: {p.barcode} | Stock: {p.stockOnHand} {p.uomCode}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{formatCurrency(p.pricing.currentSellingPrice)}</div>
                  <div className="text-[10px] text-slate-400">Max Disc: {p.pricing.maxDiscountPercentage}%</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
