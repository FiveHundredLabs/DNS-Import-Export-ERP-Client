import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { UnitOfMeasure } from '../../types/product';
import { validateProductData } from '../../rules/productRules';
import { Percent, Info, Plus, Sparkles, Tag, FolderTree, AlertCircle } from 'lucide-react';
import { useBrands, useCreateBrand } from '../../api/brands/brands.hooks';
import { useCategories, useCreateCategory } from '../../api/categories/categories.hooks';
import { productsApi } from '../../api/products/products.api';
import { useDebounce } from '../../hooks/useDebounce';

interface ProductCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uoms: UnitOfMeasure[];
  onCreate: (product: any) => Promise<void>;
}

export function ProductCreateModal({
  open,
  onOpenChange,
  uoms,
  onCreate,
}: ProductCreateModalProps) {
  // Master data queries (Active only)
  const { data: brands = [], refetch: refetchBrands } = useBrands({ status: 'ACTIVE' });
  const { data: categories = [], refetch: refetchCategories } = useCategories({ status: 'ACTIVE' });

  // Inline mutations
  const createBrandMutation = useCreateBrand();
  const createCategoryMutation = useCreateCategory();

  // Step 1: Basic Information
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');

  // SKU Preview state
  const [skuPreview, setSkuPreview] = useState('DNS-GEN-PR-000001');
  const [skuLoading, setSkuLoading] = useState(false);

  // Specifications
  const [uomId, setUomId] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [requiresSerialNumber, setRequiresSerialNumber] = useState(false);

  // Commercial Pricing & Floor Price
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>(''); // Optional (0 / empty = unset)
  const [minFloorPricePercentage, setMinFloorPricePercentage] = useState<string>('0');
  const [showroomDiscountPercentage, setShowroomDiscountPercentage] = useState<string>('5');

  // Customer Loyalty Discount Levels
  const [showDiscountInfo, setShowDiscountInfo] = useState(false);
  const [discLevel1, setDiscLevel1] = useState<string>('');
  const [discLevel2, setDiscLevel2] = useState<string>('');
  const [discLevel3, setDiscLevel3] = useState<string>('');

  // Inline Quick Add Modals
  const [quickAddBrandOpen, setQuickAddBrandOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [brandModalError, setBrandModalError] = useState<string | null>(null);

  const [quickAddCatOpen, setQuickAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [catModalError, setCatModalError] = useState<string | null>(null);

  // Submission state & validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Auto-select initial brand / category / UOM
  useEffect(() => {
    if (brands.length > 0 && !brandId) {
      const general = brands.find((b) => b.name.toLowerCase() === 'general');
      setBrandId(general ? general.id : brands[0].id);
    }
  }, [brands, brandId]);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (uoms.length > 0 && !uomId) {
      setUomId(uoms[0].id);
    }
  }, [uoms, uomId]);

  // Dynamic SKU preview generator
  const debouncedName = useDebounce(name, 300);
  const selectedBrand = useMemo(() => brands.find((b) => b.id === brandId), [brands, brandId]);

  useEffect(() => {
    let active = true;

    async function fetchSku() {
      if (!debouncedName.trim()) {
        const brandCode = (selectedBrand?.name || 'GEN').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
        setSkuPreview(`DNS-${brandCode}-PR-XXXXXX`);
        return;
      }

      try {
        setSkuLoading(true);
        const res = await productsApi.getSkuPreview({
          brandId: selectedBrand?.id,
          brandName: selectedBrand?.name,
          productName: debouncedName,
        });
        if (active) {
          setSkuPreview(res.previewSku);
        }
      } catch {
        if (active) {
          // Local fallback preview calculation
          const bCode = (selectedBrand?.name || 'GEN').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
          const words = debouncedName.trim().split(/\s+/).filter(Boolean);
          const pCode = (words.length >= 2 ? words[0][0] + words[1][0] : debouncedName.slice(0, 2)).toUpperCase().padEnd(2, 'X');
          setSkuPreview(`DNS-${bCode}-${pCode}-000001`);
        }
      } finally {
        if (active) setSkuLoading(false);
      }
    }

    fetchSku();
    return () => {
      active = false;
    };
  }, [debouncedName, selectedBrand]);

  // Floor price calculated preview
  const calculatedFloorPrice = useMemo(() => {
    const sell = Number(sellingPrice);
    const pct = Number(minFloorPricePercentage);
    if (sell > 0 && pct > 0) {
      return (sell * (pct / 100)).toFixed(2);
    }
    return null;
  }, [sellingPrice, minFloorPricePercentage]);

  // Quick Add Brand
  const handleCreateQuickBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBrandName.trim();
    if (trimmed.length < 2) {
      setBrandModalError('Brand name must be at least 2 characters.');
      return;
    }
    try {
      setBrandModalError(null);
      const created = await createBrandMutation.mutateAsync({ name: trimmed });
      await refetchBrands();
      setBrandId(created.id);
      setNewBrandName('');
      setQuickAddBrandOpen(false);
    } catch (err: unknown) {
      setBrandModalError(err instanceof Error ? err.message : 'Failed to create brand');
    }
  };

  // Quick Add Category
  const handleCreateQuickCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (trimmed.length < 2) {
      setCatModalError('Category name must be at least 2 characters.');
      return;
    }
    try {
      setCatModalError(null);
      const created = await createCategoryMutation.mutateAsync({
        name: trimmed,
        code: newCatCode.trim() ? newCatCode.trim().toUpperCase() : undefined,
      });
      await refetchCategories();
      setCategoryId(created.id);
      setNewCatName('');
      setNewCatCode('');
      setQuickAddCatOpen(false);
    } catch (err: unknown) {
      setCatModalError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const selectedUOM = uoms.find((u) => u.id === uomId) || uoms[0];

    const parsedCost = Number(costPrice) || 0;
    const parsedSelling = sellingPrice.trim() !== '' ? Number(sellingPrice) : 0;
    const parsedFloorPct = Number(minFloorPricePercentage) || 0;
    const parsedShowroom = Number(showroomDiscountPercentage) || 5;

    // Up to 3 discount levels
    const rawLevels = [discLevel1, discLevel2, discLevel3]
      .map((v) => (v.trim() !== '' ? Number(v) : null))
      .filter((v): v is number => v !== null && !isNaN(v) && v >= 0 && v <= 100);
    const discountLevels = Array.from(new Set(rawLevels)).sort((a, b) => a - b);

    const productPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      brandId: brandId || undefined,
      brandName: selectedBrand?.name,
      categoryId: selectedCategory?.id || '',
      categoryName: selectedCategory?.name || '',
      uomId: selectedUOM?.id || 'PCS',
      uomCode: selectedUOM?.code || 'PCS',
      unitOfMeasure: (selectedUOM?.code || 'PCS') as any,
      pricing: {
        costPrice: parsedCost,
        currentSellingPrice: parsedSelling,
        minimumSellingPrice:
          parsedSelling > 0 && parsedFloorPct > 0
            ? Number((parsedSelling * (parsedFloorPct / 100)).toFixed(2))
            : parsedCost,
        minFloorPricePercentage: parsedFloorPct,
        maxDiscountPercentage: discountLevels.length > 0 ? Math.max(...discountLevels) : 0,
        showroomDiscountPercentage: parsedShowroom,
        taxRatePercentage: 18,
        discountLevels,
      },
      minFloorPricePercentage: parsedFloorPct,
      discountLevels,
      warrantyPeriodMonths: Number(warrantyMonths) || 0,
      status: 'ACTIVE' as const,
      approvalStatus: 'APPROVED' as const,
      stockOnHand: 0,
      damagedStock: 0,
      requiresSerialNumber,
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
      setName('');
      setDescription('');
      setCostPrice('');
      setSellingPrice('');
      setMinFloorPricePercentage('0');
      setShowroomDiscountPercentage('5');
      setDiscLevel1('');
      setDiscLevel2('');
      setDiscLevel3('');
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : 'Creation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} size="xl">
        <DialogHeader>
          <DialogTitle>Create Product Master Item</DialogTitle>
          <DialogDescription>
            Add an authoritative product definition. SKU and barcodes are automatically generated and enforced.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {errors.form && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Step 1: Product Name, Brand, Category */}
          <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Product Full Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Schneider Acti9 16A Single Pole MCB"
                error={errors.name}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Brand Dropdown with inline Add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-800">
                    Brand <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewBrandName('');
                      setBrandModalError(null);
                      setQuickAddBrandOpen(true);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5 hover:underline focus:outline-none"
                  >
                    <Plus className="h-3 w-3" /> New Brand
                  </button>
                </div>
                <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Category Dropdown with inline Add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-800">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCatName('');
                      setNewCatCode('');
                      setCatModalError(null);
                      setQuickAddCatOpen(true);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5 hover:underline focus:outline-none"
                  >
                    <Plus className="h-3 w-3" /> New Category
                  </button>
                </div>
                <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Step 2: Automatically Generated SKU Preview */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Auto-Generated SKU Preview
                </label>
                <span className="text-[10px] text-indigo-600 font-medium inline-flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  <Sparkles className="h-3 w-3" /> DNS-BBB-PP-NNNNNN
                </span>
              </div>
              <div className="relative">
                <Input
                  value={skuPreview}
                  readOnly
                  disabled
                  className="bg-white/80 font-mono font-bold text-slate-800 text-xs tracking-wider cursor-not-allowed border-indigo-200"
                />
                {skuLoading && (
                  <span className="absolute right-3 top-2.5 text-[11px] text-slate-400">
                    Updating...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                The atomic PostgreSQL sequence generates an authoritative unique 6-digit sequence upon creation.
              </p>
            </div>
          </div>

          {/* Unit of Measure & Warranty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit of Measure <span className="text-rose-500">*</span>
              </label>
              <Select value={uomId} onChange={(e) => setUomId(e.target.value)}>
                {uoms.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Warranty (Months)
              </label>
              <Input
                type="number"
                min="0"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                placeholder="12"
              />
            </div>
          </div>

          {/* Track Serial Numbers */}
          <div className="flex items-center gap-2.5 p-3 rounded-lg border border-indigo-100 bg-indigo-50/50">
            <input
              type="checkbox"
              id="modalRequiresSerial"
              checked={requiresSerialNumber}
              onChange={(e) => setRequiresSerialNumber(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label
              htmlFor="modalRequiresSerial"
              className="text-xs font-semibold text-slate-800 cursor-pointer select-none"
            >
              Track Serial Numbers (Requires mandatory unit-wise manufacturer serial numbers in GRN receiving)
            </label>
          </div>

          {/* Commercial Pricing & Minimum Floor Price */}
          <div className="rounded-xl border border-slate-200 p-3.5 space-y-3 bg-white">
            <div className="font-semibold text-xs text-slate-900 flex items-center justify-between">
              <span>Commercial Pricing & Floor Controls</span>
              <span className="text-[11px] font-normal text-slate-500">All prices in LKR</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cost Price <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  error={errors.costPrice}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Selling Price
                  </label>
                  <span className="text-[10px] text-amber-600 font-medium">Optional</span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00 (Unset)"
                  error={errors.sellingPrice}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Leave 0 to set during GRN receiving.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Min Floor Price %
                  </label>
                  <span className="text-[10px] text-indigo-600 font-medium">0 - 100%</span>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={minFloorPricePercentage}
                  onChange={(e) => setMinFloorPricePercentage(e.target.value)}
                  placeholder="0.00"
                  error={errors.minFloorPricePercentage}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {calculatedFloorPrice
                    ? `Floor limit: LKR ${calculatedFloorPrice}`
                    : 'Default for GRN batches'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Showroom Discount (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={showroomDiscountPercentage}
                  onChange={(e) => setShowroomDiscountPercentage(e.target.value)}
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Remarks
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional technical notes"
                />
              </div>
            </div>
          </div>

          {/* Discount Levels Card */}
          <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 shrink-0">
                  <Percent className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-xs text-slate-900">
                  Product Discount Levels (Up to 3 levels)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowDiscountInfo((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-white hover:bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200"
              >
                <Info className="h-3 w-3 text-indigo-600" />
                <span>{showDiscountInfo ? 'Hide note' : 'View note'}</span>
              </button>
            </div>

            {showDiscountInfo && (
              <div className="rounded-lg bg-white p-2.5 text-xs border border-indigo-200/80 text-slate-600 space-y-1">
                <p className="font-medium text-slate-800 text-[11px]">
                  Discount tiers are enforced based on customer credit approvals and commercial tier:
                </p>
                <ul className="list-disc list-inside text-[10.5px] space-y-0.5 text-slate-600">
                  <li>Level 1: General commercial customer tier</li>
                  <li>Level 2: Preferred dealer / corporate tier</li>
                  <li>Level 3: Strategic enterprise tier (cannot violate Minimum Floor Price)</li>
                </ul>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Level 1 (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={discLevel1}
                  onChange={(e) => setDiscLevel1(e.target.value)}
                  placeholder="e.g. 5"
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Level 2 (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={discLevel2}
                  onChange={(e) => setDiscLevel2(e.target.value)}
                  placeholder="e.g. 10"
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Level 3 (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={discLevel3}
                  onChange={(e) => setDiscLevel3(e.target.value)}
                  placeholder="e.g. 15"
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating Product...' : 'Create Product Master Item'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Quick Add Brand Dialog */}
      <Dialog open={quickAddBrandOpen} onOpenChange={setQuickAddBrandOpen}>
        <DialogHeader>
          <DialogTitle>Add New Brand</DialogTitle>
          <DialogDescription>
            Register a new brand without leaving product creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateQuickBrand} className="space-y-4 py-2">
          {brandModalError && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{brandModalError}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Brand Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="e.g. Schneider, Legrand"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickAddBrandOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createBrandMutation.isPending}>
              {createBrandMutation.isPending ? 'Saving...' : 'Add Brand'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Quick Add Category Dialog */}
      <Dialog open={quickAddCatOpen} onOpenChange={setQuickAddCatOpen}>
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>
            Register a new category without leaving product creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateQuickCategory} className="space-y-4 py-2">
          {catModalError && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{catModalError}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Switchgear & Protection"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Code (Optional)
            </label>
            <Input
              value={newCatCode}
              onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
              placeholder="e.g. SWG"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickAddCatOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCategoryMutation.isPending}>
              {createCategoryMutation.isPending ? 'Saving...' : 'Add Category'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
