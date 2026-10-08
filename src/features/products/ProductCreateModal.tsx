import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Product, Category, UnitOfMeasure } from '../../types/product';
import { validateProductData } from '../../rules/productRules';
import { Percent, Info } from 'lucide-react';

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
  const [showDiscountInfo, setShowDiscountInfo] = useState(false);
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
        maxDiscountPercentage: discountLevels.length > 0 ? Math.max(...discountLevels) : 0,
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

      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
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

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-t border-slate-100 pt-3">
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
        <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/50 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-950">
              <Percent className="h-4 w-4 text-indigo-600" />
              <span>Product Discount Levels (Up to 3 Optional Levels)</span>
              <button
                type="button"
                onClick={() => setShowDiscountInfo((prev) => !prev)}
                className="text-indigo-500 hover:text-indigo-700 p-0.5 rounded transition-colors hover:bg-indigo-100 focus:outline-none"
                title={showDiscountInfo ? 'Hide loyalty discount details' : 'Click to view loyalty discount details'}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
              Lowest to Highest
            </span>
          </div>
          {showDiscountInfo && (
            <div className="rounded bg-white/95 border border-indigo-200 p-2 text-[11px] text-slate-600 space-y-1">
              <p className="leading-tight">
                Configure up to 3 optional discount levels. Customer loyalty tier determines available discounts:
              </p>
              <div className="text-[10.5px] text-slate-700">
                • <strong>New Customer:</strong> Level 1 only &nbsp;|&nbsp; • <strong>Premium Customer:</strong> Level 1 & 2 &nbsp;|&nbsp; • <strong>Platinum Customer:</strong> All 3 levels
              </div>
              <p className="text-slate-500 italic text-[10px]">
                Leave blank for 0 levels (direct discounts disabled; requires management approval).
              </p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Discount Level 1 (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="e.g. 5"
                value={discLevel1}
                onChange={(e) => setDiscLevel1(e.target.value)}
                className="h-8 text-xs font-mono font-semibold text-slate-800 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Discount Level 2 (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="e.g. 10"
                value={discLevel2}
                onChange={(e) => setDiscLevel2(e.target.value)}
                className="h-8 text-xs font-mono font-semibold text-slate-800 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Discount Level 3 (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="e.g. 15"
                value={discLevel3}
                onChange={(e) => setDiscLevel3(e.target.value)}
                className="h-8 text-xs font-mono font-semibold text-slate-800 bg-white"
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
