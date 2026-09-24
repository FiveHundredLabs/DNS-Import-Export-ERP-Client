import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Product } from '../../types/product';
import { productService } from '../../services/ProductService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Package, Barcode, ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await productService.getProduct(id);
        setProduct(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <TableLoadingSkeleton />;
  if (!product) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold">Product not found.</h2>
        <Link to="/products" className="text-indigo-600 text-xs underline mt-2 block">
          Return to Product Master
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500 uppercase">SKU: {product.sku}</span>
            <Badge variant={product.status === 'ACTIVE' ? 'success' : 'secondary'}>
              {product.status}
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pricing">Commercial & Pricing</TabsTrigger>
          <TabsTrigger value="inventory">Location Stock</TabsTrigger>
          <TabsTrigger value="warranty">Warranty Terms</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Specification & Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-semibold text-slate-900">{product.categoryName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Unit of Measure:</span>
                  <span className="font-semibold text-slate-900">{product.uomCode}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Barcode / EAN:</span>
                  <span className="font-mono font-semibold text-slate-900">{product.barcode}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Promotional Item:</span>
                  <Badge variant={product.isPromotional ? 'warning' : 'outline'}>
                    {product.isPromotional ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Description:</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
                    {product.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Stock Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <span className="text-indigo-600 block text-[10px] uppercase font-semibold">Available for Sale</span>
                    <span className="text-xl font-bold text-indigo-900">{product.stockOnHand} {product.uomCode}</span>
                  </div>
                  <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                    <span className="text-rose-600 block text-[10px] uppercase font-semibold">Damaged / Non-Sale</span>
                    <span className="text-xl font-bold text-rose-900">{product.damagedStock} {product.uomCode}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Commercial Pricing Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-slate-400 block text-[10px] uppercase">Cost Price</span>
                  <span className="text-base font-bold text-slate-900">{formatCurrency(product.pricing.costPrice)}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-emerald-50/50">
                  <span className="text-emerald-700 block text-[10px] uppercase font-semibold">Current Selling Price</span>
                  <span className="text-base font-bold text-emerald-900">{formatCurrency(product.pricing.currentSellingPrice)}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-slate-400 block text-[10px] uppercase">Minimum Floor Price</span>
                  <span className="text-base font-semibold text-slate-800">{formatCurrency(product.pricing.minimumSellingPrice)}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-slate-400 block text-[10px] uppercase">Max Rep Discount</span>
                  <span className="text-base font-semibold text-slate-800">{product.pricing.maxDiscountPercentage}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Warehouse Locations</CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-100">
                  <div>
                    <div className="font-semibold text-slate-900">Main Central Warehouse (Colombo)</div>
                    <div className="text-[11px] text-slate-500">Rack B-14, Bay 02</div>
                  </div>
                  <span className="font-bold text-slate-900">{Math.floor(product.stockOnHand * 0.8)} {product.uomCode}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-100">
                  <div>
                    <div className="font-semibold text-slate-900">Kotte Brand Showroom & Store</div>
                    <div className="text-[11px] text-slate-500">Showroom POS Inventory</div>
                  </div>
                  <span className="font-bold text-slate-900">{Math.ceil(product.stockOnHand * 0.2)} {product.uomCode}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warranty">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Standard Manufacturer Warranty</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-slate-900">
                  {product.warrantyPeriodMonths} Months Comprehensive Warranty
                </span>
              </div>
              <p className="text-slate-500">
                Covers component defects and manufacturing faults upon valid warranty registration receipt.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
