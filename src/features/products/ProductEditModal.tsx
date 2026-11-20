import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Product, ProductStatus } from '../../types/product';
import { useUpdateProduct } from '../../api/products/products.hooks';
import { Edit3, Lock, AlertCircle, Save, Loader2, Info } from 'lucide-react';

interface ProductEditModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProductEditModal({
  product,
  open,
  onOpenChange,
  onSuccess,
}: ProductEditModalProps) {
  // Safe editable state
  const [description, setDescription] = useState('');
  const [warrantyPeriod, setWarrantyPeriod] = useState<number>(0);
  const [hasSerialNumber, setHasSerialNumber] = useState<boolean>(false);
  const [minFloorPricePercentage, setMinFloorPricePercentage] = useState<number>(0);
  const [showroomDiscount, setShowroomDiscount] = useState<number>(0);
  const [discountLevel1, setDiscountLevel1] = useState<number>(0);
  const [discountLevel2, setDiscountLevel2] = useState<number>(0);
  const [discountLevel3, setDiscountLevel3] = useState<number>(0);
  const [lowStockAlertLevel, setLowStockAlertLevel] = useState<number>(10);
  const [status, setStatus] = useState<ProductStatus>('ACTIVE');
  const [formError, setFormError] = useState<string | null>(null);

  const updateMutation = useUpdateProduct();

  useEffect(() => {
    if (product && open) {
      setDescription(product.description || '');
      setWarrantyPeriod(product.warrantyPeriodMonths || 0);
      setHasSerialNumber(Boolean(product.requiresSerialNumber));
      setMinFloorPricePercentage(
        product.minFloorPricePercentage ?? product.pricing?.minFloorPricePercentage ?? 0,
      );
      setShowroomDiscount(product.pricing?.showroomDiscountPercentage ?? 0);

      const dLevels = product.discountLevels || product.pricing?.discountLevels || [];
      setDiscountLevel1(dLevels[0] || 0);
      setDiscountLevel2(dLevels[1] || 0);
      setDiscountLevel3(dLevels[2] || 0);

      setLowStockAlertLevel(product.reorderPoint || 10);
      setStatus(product.status || 'ACTIVE');
      setFormError(null);
    }
  }, [product, open]);

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (minFloorPricePercentage < 0 || minFloorPricePercentage > 100) {
      setFormError('Floor Price Percentage must be between 0% and 100%.');
      return;
    }
    if (showroomDiscount < 0 || showroomDiscount > 100) {
      setFormError('Showroom Discount must be between 0% and 100%.');
      return;
    }
    if (warrantyPeriod < 0) {
      setFormError('Warranty period cannot be negative.');
      return;
    }
    if (lowStockAlertLevel < 0) {
      setFormError('Low stock alert level cannot be negative.');
      return;
    }

    const rawLevels = [discountLevel1, discountLevel2, discountLevel3]
      .filter((lvl) => lvl > 0 && lvl <= 100)
      .sort((a, b) => a - b);
    const uniqueSortedLevels = Array.from(new Set(rawLevels));

    try {
      await updateMutation.mutateAsync({
        id: product.id,
        payload: {
          description: description.trim() || undefined,
          warrantyPeriod: Number(warrantyPeriod),
          hasSerialNumber,
          minFloorPricePercentage: Number(minFloorPricePercentage),
          showroomDiscount: Number(showroomDiscount),
          discountLevels: uniqueSortedLevels,
          lowStockAlertLevel: Number(lowStockAlertLevel),
          status,
        },
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update product details.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Edit Product Master Data
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-mono mt-0.5">
                SKU: {product.sku} • Barcode: {product.barcode}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {formError && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2 flex-1 overflow-y-auto [scrollbar-width:thin] pr-1">
          {/* 1. IMMUTABLE SYSTEM FIELDS SECTION */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                Immutable System Identifiers
              </div>
              <Badge variant="secondary" className="text-[10px] text-slate-500 font-normal">
                Locked after creation
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Product Name
                </label>
                <div className="font-semibold text-slate-900 bg-slate-100/80 border border-slate-200 rounded-lg p-2 text-xs truncate">
                  {product.name}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  SKU Code
                </label>
                <div className="font-mono font-semibold text-slate-800 bg-slate-100/80 border border-slate-200 rounded-lg p-2 text-xs truncate">
                  {product.sku}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Barcode (EAN-13)
                </label>
                <div className="font-mono font-semibold text-slate-800 bg-slate-100/80 border border-slate-200 rounded-lg p-2 text-xs truncate">
                  {product.barcode}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Brand
                </label>
                <div className="font-medium text-slate-800 bg-slate-100/80 border border-slate-200 rounded-lg p-2 text-xs truncate">
                  {product.brandName || 'General / Unbranded'}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Category
                </label>
                <div className="font-medium text-slate-800 bg-slate-100/80 border border-slate-200 rounded-lg p-2 text-xs truncate">
                  {product.categoryName}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Unit of Measure (UOM)
                </label>
                <div className="font-medium text-slate-800 bg-slate-100/80 border border-slate-200 rounded-lg p-2 text-xs truncate">
                  {product.uomCode || product.uomId}
                </div>
              </div>
            </div>
          </div>

          {/* 2. EDITABLE GENERAL & STATUS FIELDS */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Description / Technical Specifications
              </label>
              <Textarea
                placeholder="Enter technical specifications, wiring instructions, or catalog notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="text-xs leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Warranty Period (Months)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={warrantyPeriod}
                  onChange={(e) => setWarrantyPeriod(parseInt(e.target.value) || 0)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Low Stock Alert Level
                </label>
                <Input
                  type="number"
                  min="0"
                  value={lowStockAlertLevel}
                  onChange={(e) => setLowStockAlertLevel(parseInt(e.target.value) || 0)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Product Status
                </label>
                <Select value={status} onValueChange={(val) => setStatus(val as ProductStatus)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    <SelectItem value="DISCONTINUED">DISCONTINUED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <input
                type="checkbox"
                id="editHasSerialNumber"
                checked={hasSerialNumber}
                onChange={(e) => setHasSerialNumber(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="editHasSerialNumber" className="text-xs font-medium text-slate-800 cursor-pointer">
                Track Individual Serial Numbers / Barcodes for Units
              </label>
            </div>
          </div>

          {/* 3. EDITABLE COMMERCIAL DEFAULTS & DISCOUNT TIERS */}
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
              <Info className="h-4 w-4 text-indigo-600" />
              Commercial Floor Price &amp; Discount Defaults
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Default Min Floor Price % (0–100%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={minFloorPricePercentage}
                    onChange={(e) => setMinFloorPricePercentage(parseFloat(e.target.value) || 0)}
                    className="pr-8 font-mono text-xs font-semibold"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono font-bold">%</span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Inherited as default by future GRN receiving batches.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Showroom Walk-In Discount %
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={showroomDiscount}
                    onChange={(e) => setShowroomDiscount(parseFloat(e.target.value) || 0)}
                    className="pr-8 font-mono text-xs font-semibold"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono font-bold">%</span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Standard walk-in discount applied at showroom POS.
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Representative Discount Levels (Tier 1 / Tier 2 / Tier 3 %)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="Tier 1 %"
                    value={discountLevel1 || ''}
                    onChange={(e) => setDiscountLevel1(parseFloat(e.target.value) || 0)}
                    className="pr-6 font-mono text-xs text-center"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-mono">%</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="Tier 2 %"
                    value={discountLevel2 || ''}
                    onChange={(e) => setDiscountLevel2(parseFloat(e.target.value) || 0)}
                    className="pr-6 font-mono text-xs text-center"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-mono">%</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="Tier 3 %"
                    value={discountLevel3 || ''}
                    onChange={(e) => setDiscountLevel3(parseFloat(e.target.value) || 0)}
                    className="pr-6 font-mono text-xs text-center"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-mono">%</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
