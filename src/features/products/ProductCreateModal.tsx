import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Product, Category, UnitOfMeasure } from '../../types/product';
import { validateProductData } from '../../rules/productRules';
import { Percent, Info, Plus } from 'lucide-react';
import { CategoryCreateModal } from './CategoryCreateModal';

interface ProductCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  uoms: UnitOfMeasure[];
  onCreate: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCreateCategory?: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Category | void>;
}

export function ProductCreateModal({
  open,
  onOpenChange,
  categories,
  uoms,
  onCreate,
  onCreateCategory,
}: ProductCreateModalProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
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
    <Dialog open={open} onOpenChange={onOpenChange} size="xl">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Category</label>
              {onCreateCategory && (
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5 hover:underline focus:outline-none"
                >
                  <Plus className="h-3 w-3" /> New
                </button>
              )}
            </div>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty (Months)</label>
            <Input
              type="number"
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(Number(e.target.value))}
              placeholder="e.g. 12"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cost Price (LKR) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              value={costPrice || ''}
              onChange={(e) => setCostPrice(Number(e.target.value))}
              placeholder="0.00"
              error={errors.costPrice}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Selling Price (LKR) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              value={sellingPrice || ''}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              placeholder="0.00"
              error={errors.sellingPrice}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Min Floor Price (LKR)
            </label>
            <Input
              type="number"
              value={minSellingPrice || ''}
              onChange={(e) => setMinSellingPrice(Number(e.target.value))}
              placeholder="Floor limit"
              error={errors.minimumSellingPrice}
            />
          </div>
        </div>

        {/* Product Discount Levels Card */}
        <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 shrink-0">
                <Percent className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-xs text-slate-900">
                  Product Discount Levels
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  (Up to 3 levels)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDiscountInfo((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors focus:outline-none shadow-xs"
                title="Click to view customer loyalty tier discount rules"
              >
                <Info className="h-3.5 w-3.5 text-indigo-600" />
                <span>{showDiscountInfo ? 'Hide note' : 'View note'}</span>
              </button>
              <span className="text-[10px] text-slate-500 font-medium bg-white px-2 py-1 rounded-md border border-slate-200 shadow-xs">
                Lowest to highest
              </span>
            </div>
          </div>

          {showDiscountInfo && (
            <div className="rounded-lg bg-white p-3 text-xs border border-indigo-200/80 shadow-xs space-y-2 animate-in fade-in-50 duration-150">
              <p className="font-medium text-slate-800 text-[11.5px]">
                Customer loyalty tier determines available discounts:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-md bg-slate-50 p-2 border border-slate-200/80 text-[11px]">
                  <span className="font-semibold text-slate-800 block">New Customer</span>
                  <span className="text-slate-500 text-[10.5px]">Level 1 only</span>
                </div>
                <div className="rounded-md bg-slate-50 p-2 border border-slate-200/80 text-[11px]">
                  <span className="font-semibold text-indigo-700 block">Premium</span>
                  <span className="text-slate-500 text-[10.5px]">Level 1 & 2</span>
                </div>
                <div className="rounded-md bg-slate-50 p-2 border border-slate-200/80 text-[11px]">
                  <span className="font-semibold text-amber-700 block">Platinum</span>
                  <span className="text-slate-500 text-[10.5px]">All 3 levels</span>
                </div>
              </div>
              <p className="text-[10.5px] text-slate-500 italic">
                Leave empty for 0 levels (direct discounts disabled; requires management approval).
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 pt-0.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Discount Level 1
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="e.g. 5"
                  value={discLevel1}
                  onChange={(e) => setDiscLevel1(e.target.value)}
                  className="h-9 pr-7 text-xs font-mono font-semibold text-slate-800 bg-white"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Discount Level 2
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="e.g. 10"
                  value={discLevel2}
                  onChange={(e) => setDiscLevel2(e.target.value)}
                  className="h-9 pr-7 text-xs font-mono font-semibold text-slate-800 bg-white"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Discount Level 3
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="e.g. 15"
                  value={discLevel3}
                  onChange={(e) => setDiscLevel3(e.target.value)}
                  className="h-9 pr-7 text-xs font-mono font-semibold text-slate-800 bg-white"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
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

      {onCreateCategory && (
        <CategoryCreateModal
          open={isAddCategoryOpen}
          onOpenChange={setIsAddCategoryOpen}
          onCreate={async (catData) => {
            const created = await onCreateCategory(catData);
            if (created && 'id' in created) {
              setCategoryId(created.id);
            }
          }}
        />
      )}
    </Dialog>
  );
}
