import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useGRN } from '../../hooks/useGRN';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { formatCurrency } from '../../utils/formatters';
import { GRNItem } from '../../types/inventory';

const LOCATIONS = [
  { value: 'WH-MAIN', label: 'Main Warehouse (WH-MAIN)' },
  { value: 'WH-SEC',  label: 'Secondary Warehouse (WH-SEC)' },
];

const SUPPLIERS = [
  { id: 'sup-001', name: 'Schneider Electric Lanka (Pvt) Ltd' },
  { id: 'sup-002', name: 'Kelani Cables PLC' },
  { id: 'sup-003', name: 'Signify Lanka (Philips)' },
  { id: 'sup-004', name: 'Growatt Energy Solutions' },
  { id: 'sup-005', name: 'ABB Lanka' },
  { id: 'sup-006', name: 'General Electric Lanka' },
];

interface LineItem extends GRNItem {
  _tempId: string;
  unitCost: number;
}

function generateId(): string {
  return `grn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function GRNCreateEditPage() {
  const navigate = useNavigate();
  const { grnService } = useGRN();
  const { user } = useAuth();

  const [supplierName, setSupplierName] = useState('');
  const [warehouseId, setWarehouseId] = useState('WH-MAIN');
  const [items, setItems] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    if (!productSearch) return true;
    const s = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
  });

  const addProduct = (productId: string) => {
    const product = MOCK_PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    if (items.some(i => i.productId === productId)) {
      toast.info('Product already added. Adjust the quantity in the table.');
      return;
    }
    setItems(prev => [
      ...prev,
      {
        _tempId: generateId(),
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        expectedQuantity: 1,
        receivedQuantity: 1,
        damagedQuantity: 0,
        unitCostSnapshot: product.pricing.costPrice,
        unitCost: product.pricing.costPrice,
        lineValue: product.pricing.costPrice,
      },
    ]);
    setShowProductPicker(false);
    setProductSearch('');
  };

  const updateItem = (tempId: string, field: keyof LineItem, value: number) => {
    setItems(prev =>
      prev.map(item => {
        if (item._tempId !== tempId) return item;
        const updated = { ...item, [field]: value };
        updated.lineValue = (updated.receivedQuantity - updated.damagedQuantity) * updated.unitCost;
        return updated;
      })
    );
  };

  const removeItem = (tempId: string) => {
    setItems(prev => prev.filter(i => i._tempId !== tempId));
  };

  const totalValue = items.reduce((s, i) => s + i.lineValue, 0);
  const totalItems = items.reduce((s, i) => s + i.receivedQuantity, 0);

  const validate = (): string | null => {
    if (!supplierName.trim()) return 'Supplier name is required';
    if (!warehouseId) return 'Warehouse is required';
    if (items.length === 0) return 'At least one product line is required';
    for (const item of items) {
      if (item.receivedQuantity <= 0) return `Received quantity must be > 0 for ${item.productNameSnapshot}`;
      if (item.damagedQuantity > item.receivedQuantity) return `Damaged qty cannot exceed received qty for ${item.productNameSnapshot}`;
      if (item.unitCost < 0) return `Unit cost cannot be negative for ${item.productNameSnapshot}`;
    }
    return null;
  };

  const handleSave = async (status: 'DRAFT' | 'SUBMITTED') => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!user) { toast.error('Not authenticated'); return; }

    try {
      setSubmitting(true);
      const grnItems: GRNItem[] = items.map(i => ({
        productId: i.productId,
        productNameSnapshot: i.productNameSnapshot,
        skuSnapshot: i.skuSnapshot,
        expectedQuantity: i.expectedQuantity,
        receivedQuantity: i.receivedQuantity,
        damagedQuantity: i.damagedQuantity,
        unitCostSnapshot: i.unitCost,
        lineValue: i.lineValue,
      }));

      const grn = {
        id: generateId(),
        grnNumber: generateId(),
        supplierId: 'sup-manual',
        supplierName: supplierName.trim(),
        warehouseId,
        status: 'DRAFT' as const,
        items: grnItems,
        totalValue,
        receivedById: user.id,
      };

      if (status === 'SUBMITTED') {
        await grnService.submitGRN(grn);
      } else {
        await grnService.createGRN(grn, user);
      }

      toast.success(`GRN saved as ${status}`);
      navigate('/inventory/grn');
    } catch (e: any) {
      toast.error(e.message ?? 'Error saving GRN');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Goods Receipt Note</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Record inbound stock from a supplier. Submit for manager approval to increment inventory.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/inventory/grn')}>Cancel</Button>
      </div>

      {/* GRN Header Details */}
      <Card>
        <CardHeader>
          <CardTitle>GRN Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Type or select supplier..."
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                />
              </div>
              {/* Quick supplier suggestions */}
              {supplierName === '' && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {SUPPLIERS.slice(0, 4).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSupplierName(s.name)}
                      className="text-xs px-2 py-0.5 border rounded-full hover:bg-muted transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Receiving Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {LOCATIONS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Line Items</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {items.length} product(s) · {totalItems} total units · {formatCurrency(totalValue)} value
              </p>
            </div>
            <Button type="button" onClick={() => setShowProductPicker(true)} size="sm">
              + Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Product Picker */}
          {showProductPicker && (
            <div className="mb-4 p-4 border-2 border-dashed border-primary/30 rounded-lg bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">Select Product from Master</p>
                <Button variant="ghost" size="sm" onClick={() => { setShowProductPicker(false); setProductSearch(''); }}>
                  Close
                </Button>
              </div>
              <Input
                placeholder="Search by name or SKU..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto divide-y border rounded-lg bg-background">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">No products found</div>
                ) : (
                  filteredProducts.map(p => {
                    const alreadyAdded = items.some(i => i.productId === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => addProduct(p.id)}
                        className={`w-full flex items-center justify-between p-3 text-left transition-colors text-sm ${
                          alreadyAdded
                            ? 'opacity-50 cursor-not-allowed bg-muted'
                            : 'hover:bg-muted/60 cursor-pointer'
                        }`}
                      >
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{p.sku} · {p.categoryName}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold">{formatCurrency(p.pricing.costPrice)}</p>
                          <p className="text-xs text-muted-foreground">Stock: {p.stockOnHand} {p.uomCode}</p>
                          {alreadyAdded && <Badge className="text-xs bg-green-100 text-green-700 border-0">Added</Badge>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Items Table */}
          {items.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
              <p className="font-medium">No items added yet</p>
              <p className="text-sm mt-1">Click &ldquo;+ Add Product&rdquo; to select products from the master catalogue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-3 font-medium">Product</th>
                    <th className="pb-2 px-3 font-medium text-right">Expected Qty</th>
                    <th className="pb-2 px-3 font-medium text-right">Received Qty</th>
                    <th className="pb-2 px-3 font-medium text-right">Damaged Qty</th>
                    <th className="pb-2 px-3 font-medium text-right">Unit Cost (LKR)</th>
                    <th className="pb-2 px-3 font-medium text-right">Good Qty</th>
                    <th className="pb-2 px-3 font-medium text-right">Line Value</th>
                    <th className="pb-2 pl-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map(item => {
                    const goodQty = item.receivedQuantity - item.damagedQuantity;
                    return (
                      <tr key={item._tempId}>
                        <td className="py-2 pr-3 max-w-[180px]">
                          <p className="font-medium truncate">{item.productNameSnapshot}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.skuSnapshot}</p>
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number" min="0"
                            value={item.expectedQuantity}
                            onChange={e => updateItem(item._tempId, 'expectedQuantity', parseInt(e.target.value) || 0)}
                            className="text-right w-24 h-8"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number" min="0"
                            value={item.receivedQuantity}
                            onChange={e => updateItem(item._tempId, 'receivedQuantity', parseInt(e.target.value) || 0)}
                            className="text-right w-24 h-8"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number" min="0"
                            value={item.damagedQuantity}
                            onChange={e => updateItem(item._tempId, 'damagedQuantity', parseInt(e.target.value) || 0)}
                            className={`text-right w-24 h-8 ${item.damagedQuantity > 0 ? 'border-orange-400 text-orange-600' : ''}`}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number" min="0" step="0.01"
                            value={item.unitCost}
                            onChange={e => updateItem(item._tempId, 'unitCost', parseFloat(e.target.value) || 0)}
                            className="text-right w-28 h-8"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          <span className={goodQty < 0 ? 'text-red-600' : ''}>{goodQty}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-semibold">
                          {formatCurrency(item.lineValue)}
                        </td>
                        <td className="py-2 pl-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            onClick={() => removeItem(item._tempId)}
                          >
                            ×
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td colSpan={6} className="pt-3 pr-3 text-right font-semibold text-muted-foreground">
                      Total Value
                    </td>
                    <td className="pt-3 px-3 text-right font-bold text-lg">
                      {formatCurrency(totalValue)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => handleSave('DRAFT')}
        >
          {submitting ? 'Saving...' : 'Save as Draft'}
        </Button>
        <Button
          type="button"
          disabled={submitting}
          onClick={() => handleSave('SUBMITTED')}
        >
          {submitting ? 'Submitting...' : 'Submit for Manager Approval'}
        </Button>
      </div>

      {/* Info panel */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
        <p><strong>Draft:</strong> Saved locally. Can be edited. No stock impact.</p>
        <p><strong>Submitted:</strong> Sent for Manager approval. Stock incremented only after approval.</p>
        <p><strong>Note:</strong> GRN items validate that damaged quantity cannot exceed received quantity.</p>
      </div>
    </div>
  );
}
