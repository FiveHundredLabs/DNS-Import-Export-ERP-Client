import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Product, Category, UnitOfMeasure } from '../../types/product';
import { validateProductData } from '../../rules/productRules';

interface ProductCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  uoms: UnitOfMeasure[];
  onCreate: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export function ProductCreateModal({
  open,
  onOpenChange,
  categories,
  uoms,
  onCreate,
}: ProductCreateModalProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [uomId, setUomId] = useState(uoms[0]?.id || '');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [minSellingPrice, setMinSellingPrice] = useState<number>(0);
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState<number>(10);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [isPromotional, setIsPromotional] = useState(false);
  const [discLevel1, setDiscLevel1] = useState<string>('');
  const [discLevel2, setDiscLevel2] = useState<string>('');
  const [discLevel3, setDiscLevel3] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedCategory = categories.find((c) => c.id === (categoryId || categories[0]?.id));
    const selectedUOM = uoms.find((u) => u.id === (uomId || uoms[0]?.id));

    // Parse and order up to 3 optional discount levels lowest to highest
    const rawLevels = [discLevel1, discLevel2, discLevel3]
      .map((v) => (v.trim() !== '' ? Number(v) : null))
      .filter((v): v is number => v !== null && !isNaN(v) && v >= 0 && v <= 100);
    const discountLevels = Array.from(new Set(rawLevels)).sort((a, b) => a - b);

    const productPayload = {
      sku,
      name,
      description,
      categoryId: selectedCategory?.id || '',
      categoryName: selectedCategory?.name || '',
      uomId: selectedUOM?.id || '',
      uomCode: selectedUOM?.code || '',
      barcode,
      pricing: {
        costPrice: Number(costPrice),
        currentSellingPrice: Number(sellingPrice),
        minimumSellingPrice: Number(minSellingPrice || costPrice),
        maxDiscountPercentage: Number(maxDiscountPercentage),
        taxRatePercentage: 18,
        discountLevels,
      },
      discountLevels,
      isPromotional,
      warrantyPeriodMonths: Number(warrantyMonths),
      status: 'ACTIVE' as const,
      approvalStatus: 'APPROVED' as const,
      stockOnHand: 0,
      damagedStock: 0,
    };

    const validation = validateProductData(productPayload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});
      await onCreate(productPayload);
      onOpenChange(false);
      // Reset form
      setSku('');
      setName('');
      setDescription('');
      setBarcode('');
      setCostPrice(0);
      setSellingPrice(0);
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : 'Creation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Create Product Master Item</DialogTitle>
        <DialogDescription>
          Add an authoritative product definition to the single central Product Master.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{errors.form}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              SKU / Product Code <span className="text-rose-500">*</span>
            </label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="e.g. DNS-MCB-16A"
              error={errors.sku}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Barcode / EAN <span className="text-rose-500">*</span>
            </label>
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 8901020304099"
              error={errors.barcode}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Product Full Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Schneider Acti9 16A Single Pole MCB"
            error={errors.name}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <Select
              value={categoryId || categories[0]?.id}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
            <Select
              value={uomId || uoms[0]?.id}
              onChange={(e) => setUomId(e.target.value)}
            >
              {uoms.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price (LKR)</label>
            <Input
              type="number"
              value={costPrice || ''}
              onChange={(e) => setCostPrice(Number(e.target.value))}
              placeholder="0.00"
              error={errors.costPrice}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (LKR)</label>
            <Input
              type="number"
              value={sellingPrice || ''}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              placeholder="0.00"
              error={errors.sellingPrice}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Min Floor Price (LKR)</label>
            <Input
              type="number"
              value={minSellingPrice || ''}
              onChange={(e) => setMinSellingPrice(Number(e.target.value))}
              placeholder="Floor limit"
              error={errors.minimumSellingPrice}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Max Ceiling Discount (%)</label>
            <Input
              type="number"
              value={maxDiscountPercentage}
              onChange={(e) => setMaxDiscountPercentage(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty (Months)</label>
            <Input
              type="number"
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Product Discount Levels (Up to 3 Optional Levels) */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-800">
              Product Discount Levels (Up to 3 Optional Levels)
            </label>
            <span className="text-[10px] text-slate-500 font-medium">Lowest to Highest</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Configure up to 3 optional discount levels. Customer loyalty determines accessible levels (New = Level 1, Premium = Levels 1 & 2, Platinum = All 3). Leave blank for 0 levels (requires approval for any discount).
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Level 1 (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="e.g. 5"
                value={discLevel1}
                onChange={(e) => setDiscLevel1(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Level 2 (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="e.g. 10"
                value={discLevel2}
                onChange={(e) => setDiscLevel2(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Level 3 (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="e.g. 15"
                value={discLevel3}
                onChange={(e) => setDiscLevel3(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Creating...' : 'Save Product Master'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
