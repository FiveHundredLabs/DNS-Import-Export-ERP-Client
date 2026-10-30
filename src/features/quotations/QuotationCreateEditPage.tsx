import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useQuotations } from '../../hooks/useQuotations';
import { useTax } from '../../hooks/useTax';
import { customerService } from '../../services/CustomerService';
import { productService } from '../../services/ProductService';
import { batchInventoryService } from '../../services/BatchInventoryService';
import { Customer } from '../../types/customer';
import { Product } from '../../types/product';
import { CustomerSelector } from '../../components/selectors/CustomerSelector';
import { CustomerSummaryCard } from '../../components/selectors/CustomerSummaryCard';
import { ProductSelector } from '../../components/selectors/ProductSelector';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FormSection } from '../../components/common/FormSection';
import { FormField } from '../../components/common/FormField';
import { DocumentActionBar } from '../../components/common/DocumentActionBar';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import {
  evaluateDiscount,
  getProductDiscountLevels,
  getAllowedDiscountLevels,
  getMaxAllowedDiscount,
  normalizeCustomerLoyaltyLevel,
} from '../../rules/discountRules';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Building2,
  Package,
  Calendar,
  Save,
  Send,
  ShieldAlert,
  Boxes,
  FileText,
} from 'lucide-react';

interface LocalItem {
  id: string;
  product: Product;
  quantity: number;
  discountPercentage: number;
  selectedBatchId?: string;
  selectedBatchNumber?: string;
}

export function QuotationCreateEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { createQuotation, updateQuotation } = useQuotations();
  const { taxEnabled, taxRate, taxName } = useTax();

  const isEdit = Boolean(id);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [items, setItems] = useState<LocalItem[]>([]);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [savedTaxConfig, setSavedTaxConfig] = useState<{ taxEnabled: boolean; taxRate: number } | null>(null);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(
    'Standard 30 days payment terms upon delivery. Goods warranty as specified per manufacturer guidelines.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Load customer or existing quotation if editing
  useEffect(() => {
    async function loadInitialData() {
      try {
        setPageLoading(true);
        if (isEdit && id) {
          const existing = await import('../../services/QuotationService').then((m) =>
            m.quotationService.getQuotationById(id)
          );
          if (!existing) {
            setFormError('Quotation not found.');
            return;
          }
          if (existing.status !== 'DRAFT') {
            setFormError(`Only DRAFT quotations can be edited. Current status is ${existing.status}`);
            return;
          }

          if (existing.taxEnabled !== undefined) {
            setSavedTaxConfig({
              taxEnabled: existing.taxEnabled,
              taxRate: existing.taxRatePercentage ?? (existing.taxEnabled ? 18 : 0),
            });
          }

          const cust = await customerService.getCustomer(existing.customerId);
          if (cust) setSelectedCustomer(cust);

          setValidUntil(existing.validUntil);
          setNotes(existing.notes || '');
          setTerms(existing.termsAndConditions || terms);

          const localItems: LocalItem[] = [];
          for (const it of existing.items) {
            const prod = await productService.getProduct(it.productId);
            if (prod) {
              localItems.push({
                id: it.id,
                product: prod,
                quantity: it.quantity,
                discountPercentage: it.discountPercentage,
              });
            }
          }
          setItems(localItems);
        } else {
          const queryCustId = searchParams.get('customerId');
          if (queryCustId) {
            const cust = await customerService.getCustomer(queryCustId);
            if (cust) {
              if (currentUser.role === 'SALES_REP' && cust.assignedRepId && cust.assignedRepId !== currentUser.id) {
                setFormError('Selected customer is not in your assigned sales territory.');
              } else {
                setSelectedCustomer(cust);
                if (cust.commercialTerms.paymentTermNotes) {
                  setTerms(cust.commercialTerms.paymentTermNotes);
                }
              }
            }
          }
        }
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'Error loading quotation data.');
      } finally {
        setPageLoading(false);
      }
    }

    loadInitialData();
  }, [id, isEdit, searchParams, currentUser]);

  const handleCustomerSelect = (customer: Customer) => {
    if (currentUser.role === 'SALES_REP' && customer.assignedRepId && customer.assignedRepId !== currentUser.id) {
      setFormError(`Cannot select ${customer.name}: this customer is assigned to another representative.`);
      return;
    }
    setFormError(null);
    setSelectedCustomer(customer);
    setIsCustomerSelectorOpen(false);
    if (customer.commercialTerms.paymentTermNotes) {
      setTerms(customer.commercialTerms.paymentTermNotes);
    }
  };

  const handleAddProduct = (product: Product) => {
    const existingIndex = items.findIndex((it) => it.product.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      const activeBatches = batchInventoryService.getActiveBatches(product.id);
      const defaultBatch = activeBatches[0];

      setItems([
        ...items,
        {
          id: `tmp-${Date.now()}-${items.length}`,
          product,
          quantity: 1,
          discountPercentage: 0,
          selectedBatchId: defaultBatch?.id,
          selectedBatchNumber: defaultBatch?.batchNumber,
        },
      ]);
    }
    setIsProductSelectorOpen(false);
  };

  const handleSelectBatch = (index: number, batchId: string) => {
    const updated = [...items];
    const item = updated[index];
    if (batchId === 'DEFAULT') {
      updated[index] = {
        ...item,
        selectedBatchId: undefined,
        selectedBatchNumber: undefined,
      };
    } else {
      const batch = batchInventoryService.getBatchById(batchId);
      if (batch) {
        updated[index] = {
          ...item,
          selectedBatchId: batch.id,
          selectedBatchNumber: batch.batchNumber,
        };
      }
    }
    setItems(updated);
  };

  const handleUpdateItem = (index: number, field: 'quantity' | 'discountPercentage', value: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const effectiveTaxEnabled = isEdit && savedTaxConfig !== null ? savedTaxConfig.taxEnabled : taxEnabled;
  const effectiveTaxRate = isEdit && savedTaxConfig !== null
    ? (savedTaxConfig.taxEnabled ? savedTaxConfig.taxRate : 0)
    : (taxEnabled ? taxRate : 0);

  // Calculations & Validations per line item
  const calculatedItems = useMemo(() => {
    const repAuthority = currentUser.role === 'SALES_REP' ? 5 : 15;

    return items.map((it) => {
      const unitPrice = it.product.pricing.currentSellingPrice;
      const subtotal = unitPrice * it.quantity;
      const discountRate = Math.max(0, Math.min(100, it.discountPercentage || 0));
      const discountAmount = (subtotal * discountRate) / 100;
      const net = subtotal - discountAmount;
      const taxAmount = effectiveTaxEnabled ? Math.round(((net * effectiveTaxRate) / 100) * 100) / 100 : 0;
      const total = net + taxAmount;

      const configuredLevels = getProductDiscountLevels(it.product);
      const availableLevels = getAllowedDiscountLevels(it.product, selectedCustomer);
      const maxAllowed = getMaxAllowedDiscount(it.product, selectedCustomer);

      const evalResult = evaluateDiscount({
        requestedDiscountPercentage: discountRate,
        repMaxDiscountPercentage: repAuthority,
        customerMaxDiscountPercentage: selectedCustomer?.commercialTerms.maxDiscountPercentage || 12,
        productMaxDiscountPercentage: it.product.pricing.maxDiscountPercentage || 15,
        isPromotional: it.product.isPromotional,
        promotionalDiscountPercentage: it.product.pricing.promotionalDiscountPercentage,
        product: it.product,
        customer: selectedCustomer,
      });

      const productBatches = batchInventoryService.getActiveBatches(it.product.id);
      const selectedBatch = it.selectedBatchId ? batchInventoryService.getBatchById(it.selectedBatchId) : null;
      const availableStock = selectedBatch
        ? selectedBatch.availableQuantity
        : Math.max(0, (it.product.stockOnHand ?? 0) - (it.product.damagedStock ?? 0));

      return {
        ...it,
        unitPrice,
        subtotal,
        discountRate,
        discountAmount,
        taxAmount,
        total,
        evalResult,
        configuredLevels,
        availableLevels,
        maxAllowed,
        productBatches,
        availableStock,
      };
    });
  }, [items, selectedCustomer, currentUser, effectiveTaxEnabled, effectiveTaxRate]);

  const totals = useMemo(() => {
    const grossSubtotal = calculatedItems.reduce((acc, it) => acc + it.subtotal, 0);
    const totalDiscount = calculatedItems.reduce((acc, it) => acc + it.discountAmount, 0);
    const totalTax = calculatedItems.reduce((acc, it) => acc + it.taxAmount, 0);
    const grandTotal = calculatedItems.reduce((acc, it) => acc + it.total, 0);
    const anyRequiresApproval = calculatedItems.some((it) => it.evalResult.requiresSpecialApproval);

    return {
      grossSubtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      anyRequiresApproval,
    };
  }, [calculatedItems]);

  const handleSubmit = async (saveAsDraft: boolean) => {
    if (!selectedCustomer) {
      setFormError('Please select a customer for this quotation.');
      return;
    }
    if (items.length === 0) {
      setFormError('Please add at least one product line item.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const itemsPayload = items.map((it) => ({
        productId: it.product.id,
        quantity: Math.max(1, it.quantity),
        requestedDiscountPercentage: Math.max(0, it.discountPercentage),
      }));

      if (isEdit && id) {
        await updateQuotation(id, {
          customerId: selectedCustomer.id,
          items: itemsPayload,
          validUntil,
          notes,
          termsAndConditions: terms,
          saveAsDraft,
        });
        navigate(`/quotations/${id}`);
      } else {
        const created = await createQuotation({
          customerId: selectedCustomer.id,
          salesRepId: currentUser.id,
          items: itemsPayload,
          validUntil,
          notes,
          termsAndConditions: terms,
          saveAsDraft,
        });
        navigate(`/quotations/${created.id}`);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pageLoading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading quotation editor...</div>;
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Canonical Page Header */}
      <PageHeader
        title={isEdit ? 'Edit Draft Quotation' : 'Create New Quotation'}
        breadcrumbs={[
          { label: 'Quotations', href: '/quotations' },
          { label: isEdit ? 'Edit Draft' : 'New Quotation' },
        ]}
        onBack={() => navigate('/quotations')}
        badge={
          <StatusBadge
            status={isEdit ? 'DRAFT' : 'NEW'}
            label={isEdit ? 'Draft' : 'New'}
          />
        }
      />

      {formError && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* Top Details Grid: Customer + Commercial Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Customer Information */}
        <FormSection
          title="Customer & Commercial Terms"
          icon={Building2}
          overflowVisible
        >
          {selectedCustomer && !isCustomerSelectorOpen ? (
            <CustomerSummaryCard
              customer={selectedCustomer}
              onChangeCustomer={() => setIsCustomerSelectorOpen(true)}
            />
          ) : (
            <div className="space-y-2">
              {selectedCustomer && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCustomerSelectorOpen(false)}
                    className="text-xs h-7 text-slate-500"
                  >
                    Cancel
                  </Button>
                </div>
              )}
              <CustomerSelector
                onSelect={handleCustomerSelect}
                selectedCustomerId={selectedCustomer?.id}
                assignedRepId={currentUser.role === 'SALES_REP' ? currentUser.id : undefined}
              />
            </div>
          )}
        </FormSection>

        {/* Validity & Commercial Terms */}
        <FormSection
          title="Document Validity & Terms"
          icon={Calendar}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Valid Until Date" required>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Payment & Delivery Terms">
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-primary font-sans"
                  placeholder="Standard payment terms..."
                />
              </FormField>
            </div>
          </div>
        </FormSection>
      </div>

      {/* Full-Width Product Line Items Section */}
      <FormSection
        title={`Product Line Items (${items.length})`}
        icon={Package}
        noPadding
        actions={
          <Button
            size="sm"
            onClick={() => setIsProductSelectorOpen(true)}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs h-8 gap-1.5 font-medium cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </Button>
        }
      >
        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-600">No product line items added yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Click "Add Product" to select items from the central catalog.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-4 text-left font-semibold">Product & SKU</th>
                  <th className="py-2.5 px-3 text-left font-semibold min-w-[190px]">Stock / Batch</th>
                  <th className="py-2.5 px-3 text-right font-semibold w-[120px]">List Price</th>
                  <th className="py-2.5 px-3 text-center font-semibold w-[90px]">Qty</th>
                  <th className="py-2.5 px-3 text-center font-semibold min-w-[150px]">Disc %</th>
                  <th className="py-2.5 px-3 text-right font-semibold w-[100px]">
                    {effectiveTaxEnabled ? `${taxName || 'VAT'} (${effectiveTaxRate}%)` : 'Tax (0%)'}
                  </th>
                  <th className="py-2.5 px-4 text-right font-semibold w-[120px]">Line Total</th>
                  <th className="py-2.5 px-2 text-center w-[44px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculatedItems.map((it, idx) => {
                  const isExcessDiscount = it.evalResult.requiresSpecialApproval;

                  return (
                    <tr
                      key={it.id || idx}
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors',
                        isExcessDiscount && 'bg-amber-50/30'
                      )}
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{it.product.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {it.product.sku} • {it.product.uomCode}
                        </div>
                      </td>

                      {/* Stock / Batch Column */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="font-medium">Stock:</span>
                          <span className="font-mono font-semibold">{it.availableStock} {it.product.uomCode}</span>
                        </div>

                        {it.productBatches.length > 0 ? (
                          <div className="mt-1 flex items-center gap-1">
                            <Boxes className="h-3 w-3 text-primary shrink-0" />
                            <select
                              value={it.selectedBatchId || 'DEFAULT'}
                              onChange={(e) => handleSelectBatch(idx, e.target.value)}
                              className="text-[11px] h-6 px-1 py-0 bg-white border border-slate-200 rounded font-mono text-slate-800 focus:ring-1 focus:ring-primary max-w-[200px]"
                              title="Select stock batch lot"
                            >
                              {it.productBatches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.batchNumber} ({b.warehouseId} • {b.availableQuantity} avail)
                                </option>
                              ))}
                              <option value="DEFAULT">
                                Catalog Stock ({it.product.stockOnHand})
                              </option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                            General Inventory
                          </span>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3 text-right font-mono text-slate-800">
                        {formatCurrency(it.unitPrice)}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3 text-center align-top">
                        <Input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-18 h-7 text-xs text-center mx-auto tabular-nums font-mono"
                        />
                      </td>

                      {/* Discount % Control */}
                      <td className="py-3 px-3 text-center align-top">
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={it.discountPercentage}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'discountPercentage', parseFloat(e.target.value) || 0)
                            }
                            className={cn(
                              'w-16 h-7 text-xs text-center tabular-nums font-mono',
                              isExcessDiscount && 'border-amber-400 bg-amber-50 text-amber-900 font-semibold focus:ring-amber-500'
                            )}
                          />
                          <span className="text-slate-400 font-medium">%</span>
                        </div>

                        {/* Quick Authorized Discount Levels */}
                        {it.configuredLevels.length > 0 ? (
                          <div className="flex flex-wrap justify-center gap-1 mt-1 max-w-[140px] mx-auto">
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(idx, 'discountPercentage', 0)}
                              className={cn(
                                'px-1 py-0.5 text-[9.5px] rounded font-medium transition-colors cursor-pointer',
                                it.discountPercentage === 0
                                  ? 'bg-slate-700 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              )}
                            >
                              0%
                            </button>
                            {it.availableLevels.map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handleUpdateItem(idx, 'discountPercentage', lvl)}
                                className={cn(
                                  'px-1 py-0.5 text-[9.5px] rounded font-medium transition-colors cursor-pointer',
                                  it.discountPercentage === lvl
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                )}
                                title={`Permitted for ${normalizeCustomerLoyaltyLevel(selectedCustomer)}`}
                              >
                                {lvl}%
                              </button>
                            ))}
                            {it.configuredLevels
                              .filter((lvl) => !it.availableLevels.includes(lvl))
                              .map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => handleUpdateItem(idx, 'discountPercentage', lvl)}
                                  className={cn(
                                    'px-1 py-0.5 text-[9.5px] rounded font-medium transition-colors cursor-pointer',
                                    it.discountPercentage === lvl
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                  )}
                                  title="Requires Management Approval"
                                >
                                  {lvl}%*
                                </button>
                              ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Standard
                          </span>
                        )}

                        {isExcessDiscount && (
                          <span className="text-[9.5px] text-amber-700 font-semibold block mt-1 leading-tight">
                            ⚠️ Approval Req.
                          </span>
                        )}
                      </td>

                      {/* Tax */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {effectiveTaxEnabled ? formatCurrency(it.taxAmount) : formatCurrency(0)}
                      </td>

                      {/* Line Total */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(it.total)}
                      </td>

                      {/* Remove */}
                      <td className="py-3 px-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(idx)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>

      {/* Bottom Remarks & Financial Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Remarks */}
        <FormSection
          title="Internal Remarks"
          description="Fulfillment instructions and commercial notes"
          icon={FileText}
        >
          <FormField label="Internal Notes (Optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery schedule, customer specifications, or internal instructions..."
              rows={4}
              className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-primary"
            />
          </FormField>
        </FormSection>

        {/* Pricing Summary */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="py-3 px-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-800">
              Quotation Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal:</span>
                <span className="font-mono tabular-nums font-medium">{formatCurrency(totals.grossSubtotal)}</span>
              </div>

              <div className="flex justify-between text-emerald-600">
                <span>Total Discount:</span>
                <span className="font-mono tabular-nums font-medium">- {formatCurrency(totals.totalDiscount)}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>{effectiveTaxEnabled ? `${effectiveTaxRate}% ${taxName || 'VAT'}:` : 'Tax:'}</span>
                <span className="font-mono tabular-nums font-medium">
                  {effectiveTaxEnabled ? formatCurrency(totals.totalTax) : formatCurrency(0)}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between font-semibold text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="text-primary font-mono font-semibold tabular-nums">{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>

            {/* Approval status banner */}
            {totals.anyRequiresApproval ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Special Approval Required</span>
                  <span className="text-[11px] text-amber-800">
                    Discounts exceed authorized rep limits. Submitting will route to Sales Manager for authorization.
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] text-emerald-800 font-medium">
                  All discounts within authorized limits. Quotation can be issued immediately.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Selector Catalog Modal */}
      <Dialog open={isProductSelectorOpen} onOpenChange={setIsProductSelectorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Product Item</DialogTitle>
          </DialogHeader>
          <ProductSelector onSelect={handleAddProduct} />
        </DialogContent>
      </Dialog>

      {/* Sticky Document Action Bar */}
      <DocumentActionBar
        status={
          totals.anyRequiresApproval ? (
            <Badge variant="warning" className="text-xs">Approval Required</Badge>
          ) : (
            <Badge variant="success" className="text-xs">Standard Authority</Badge>
          )
        }
        summary={
          <div className="text-right">
            <span className="text-xs text-slate-500 mr-2">Grand Total:</span>
            <span className="text-base font-bold font-mono text-primary tabular-nums">
              {formatCurrency(totals.grandTotal)}
            </span>
          </div>
        }
        rightActions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !selectedCustomer || items.length === 0}
              className="gap-1.5 font-medium cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save as Draft</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || !selectedCustomer || items.length === 0}
              className="bg-primary hover:bg-primary-hover text-primary-foreground gap-1.5 font-semibold cursor-pointer shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>
                {isSubmitting
                  ? 'Submitting...'
                  : totals.anyRequiresApproval
                  ? 'Submit for Approval'
                  : 'Generate Quotation'}
              </span>
            </Button>
          </>
        }
      />
    </div>
  );
}
