import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useQuotations } from '../../hooks/useQuotations';
import { customerService } from '../../services/CustomerService';
import { productService } from '../../services/ProductService';
import { Customer } from '../../types/customer';
import { Product } from '../../types/product';
import { Quotation } from '../../types/quotation';
import { CustomerSelector } from '../../components/selectors/CustomerSelector';
import { ProductSelector } from '../../components/selectors/ProductSelector';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { formatCurrency } from '../../utils/formatters';
import { evaluateDiscount } from '../../rules/discountRules';
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
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';

interface LocalItem {
  id: string;
  product: Product;
  quantity: number;
  discountPercentage: number;
}

export function QuotationCreateEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { createQuotation, updateQuotation } = useQuotations();

  const isEdit = Boolean(id);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [items, setItems] = useState<LocalItem[]>([]);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [validDays, setValidDays] = useState(30);
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
          // Editing existing draft quotation
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

          const cust = await customerService.getCustomer(existing.customerId);
          if (cust) setSelectedCustomer(cust);

          setValidUntil(existing.validUntil);
          setNotes(existing.notes || '');
          setTerms(existing.termsAndConditions || terms);

          // Populate items
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
          // Pre-select customer from query param if available
          const queryCustId = searchParams.get('customerId');
          if (queryCustId) {
            const cust = await customerService.getCustomer(queryCustId);
            if (cust) {
              // Check rep scoping: if rep, must be their customer
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
    // Role scoping: if rep, check assignment
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
    // If item already in list, increase quantity
    const existingIndex = items.findIndex((it) => it.product.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          id: `tmp-${Date.now()}-${items.length}`,
          product,
          quantity: 1,
          discountPercentage: selectedCustomer?.commercialTerms.defaultDiscountPercentage || 0,
        },
      ]);
    }
    setIsProductSelectorOpen(false);
  };

  const handleUpdateItem = (index: number, field: 'quantity' | 'discountPercentage', value: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations & Validations per line item
  const calculatedItems = useMemo(() => {
    const repAuthority = currentUser.role === 'SALES_REP' ? 5 : 15;

    return items.map((it) => {
      const unitPrice = it.product.pricing.currentSellingPrice;
      const subtotal = unitPrice * it.quantity;
      const discountRate = Math.max(0, Math.min(100, it.discountPercentage || 0));
      const discountAmount = (subtotal * discountRate) / 100;
      const net = subtotal - discountAmount;
      const taxRate = it.product.pricing.taxRatePercentage ?? 18;
      const taxAmount = (net * taxRate) / 100;
      const total = net + taxAmount;

      const evalResult = evaluateDiscount({
        requestedDiscountPercentage: discountRate,
        repMaxDiscountPercentage: repAuthority,
        customerMaxDiscountPercentage: selectedCustomer?.commercialTerms.maxDiscountPercentage || 12,
        productMaxDiscountPercentage: it.product.pricing.maxDiscountPercentage || 15,
        isPromotional: it.product.isPromotional,
        promotionalDiscountPercentage: it.product.pricing.promotionalDiscountPercentage,
      });

      return {
        ...it,
        unitPrice,
        subtotal,
        discountRate,
        discountAmount,
        taxAmount,
        total,
        evalResult,
      };
    });
  }, [items, selectedCustomer, currentUser]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => navigate('/quotations')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Quotations
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
            {isEdit ? 'Edit Draft Quotation' : 'Create New Quotation'}
          </h1>
          <p className="text-xs text-slate-500">
            Generate formal dealer price quotes with automated discount rule evaluation and tax calculations.
          </p>
        </div>
      </div>

      {formError && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Customer & Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                Customer & Commercial Terms
              </CardTitle>
              {selectedCustomer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCustomerSelectorOpen(!isCustomerSelectorOpen)}
                  className="text-xs h-7"
                >
                  {isCustomerSelectorOpen ? 'Cancel' : 'Change Customer'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {selectedCustomer && !isCustomerSelectorOpen ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {selectedCustomer.name}
                        <Badge variant="outline">{selectedCustomer.type}</Badge>
                      </h4>
                      <p className="text-slate-500 mt-0.5">
                        Code: <span className="font-mono">{selectedCustomer.code}</span> | Contact: {selectedCustomer.contactPerson} ({selectedCustomer.phone})
                      </p>
                    </div>
                    <Badge variant="success">Approved Master Record</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Credit Limit:</span>
                      <strong className="text-slate-800">{formatCurrency(selectedCustomer.commercialTerms.creditLimit)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Credit Days:</span>
                      <strong className="text-slate-800">{selectedCustomer.commercialTerms.creditDays} Days</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Max Dealer Discount:</span>
                      <strong className="text-slate-800">{selectedCustomer.commercialTerms.maxDiscountPercentage || 12}%</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Select a dealer or customer from the central Customer Master.
                    {currentUser.role === 'SALES_REP' && ' (Filtered to your assigned portfolio)'}
                  </p>
                  <CustomerSelector
                    onSelect={handleCustomerSelect}
                    selectedCustomerId={selectedCustomer?.id}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Line Items Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-600" />
                Product Line Items ({items.length})
              </CardTitle>
              <Button
                size="sm"
                onClick={() => setIsProductSelectorOpen(!isProductSelectorOpen)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Selector Dropdown / Search Modal */}
              {isProductSelectorOpen && (
                <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/40 p-3 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-indigo-900">Select Item from Product Master:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsProductSelectorOpen(false)}
                      className="text-xs h-6 px-2 text-slate-500"
                    >
                      Close
                    </Button>
                  </div>
                  <ProductSelector onSelect={handleAddProduct} />
                </div>
              )}

              {/* Items List Table */}
              {items.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
                  <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No product line items added yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click "Add Product" above to search and append products from the central catalog.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {calculatedItems.map((it, idx) => {
                    const isExcessDiscount = it.evalResult.requiresSpecialApproval;

                    return (
                      <div
                        key={it.id || idx}
                        className={`rounded-lg border p-3 text-xs transition-colors ${
                          isExcessDiscount ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {it.product.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-mono">SKU: {it.product.sku}</span>
                              <span>•</span>
                              <span>UOM: {it.product.uomCode}</span>
                              <span>•</span>
                              <span>Stock On Hand: {it.product.stockOnHand}</span>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(idx)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                            title="Remove Line Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Quantity and Discount Fields */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 pt-3 border-t border-slate-100 items-end">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">
                              Quantity
                            </label>
                            <Input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">
                              List Price (LKR)
                            </label>
                            <div className="h-8 flex items-center font-mono font-medium text-slate-700 bg-slate-50 px-2 rounded border border-slate-200 text-xs">
                              {formatCurrency(it.unitPrice)}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">
                              Discount %
                            </label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={it.discountPercentage}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'discountPercentage', parseFloat(e.target.value) || 0)
                              }
                              className={`h-8 text-xs font-mono ${
                                isExcessDiscount ? 'border-amber-400 focus:ring-amber-500' : ''
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">
                              VAT (18%)
                            </label>
                            <div className="h-8 flex items-center font-mono text-slate-500 text-xs">
                              {formatCurrency(it.taxAmount)}
                            </div>
                          </div>

                          <div className="text-right sm:col-span-1 col-span-2">
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">
                              Line Total
                            </label>
                            <div className="h-8 flex items-center justify-end font-mono font-bold text-slate-900 text-xs">
                              {formatCurrency(it.total)}
                            </div>
                          </div>
                        </div>

                        {/* Discount Warning / Validation Feedback */}
                        {isExcessDiscount && (
                          <div className="mt-2.5 rounded bg-amber-100/70 border border-amber-300 p-2 text-[11px] text-amber-900 flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>
                              <strong>Approval Required:</strong> {it.evalResult.reason}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Financial Summary & Submission */}
        <div className="space-y-6">
          {/* Validity & Notes Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                Document Validity & Remarks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Valid Until Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Internal Remarks / Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes regarding delivery schedule, site requirements..."
                  rows={2}
                  className="w-full rounded-md border border-slate-200 p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-200 p-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing Summary Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quotation Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono">{formatCurrency(totals.grossSubtotal)}</span>
                </div>

                <div className="flex justify-between text-emerald-600">
                  <span>Total Discount:</span>
                  <span className="font-mono">- {formatCurrency(totals.totalDiscount)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>18% VAT:</span>
                  <span className="font-mono">{formatCurrency(totals.totalTax)}</span>
                </div>

                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                  <span>Grand Total (LKR):</span>
                  <span className="text-indigo-600 font-mono">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>

              {/* Approval status banner */}
              {totals.anyRequiresApproval ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Special Approval Required
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    One or more requested discounts exceed your standard authority limit (5%). Submitting this
                    quotation will route it to the <strong>Sales Manager</strong> for approval before it can be sent or converted.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Standard Authority Quotation
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    All discounts are within your authorized rep limit. This quotation can be issued immediately.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || !selectedCustomer || items.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting
                    ? 'Submitting...'
                    : totals.anyRequiresApproval
                    ? 'Submit for Approval'
                    : 'Generate Quotation'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting || !selectedCustomer || items.length === 0}
                  className="w-full text-slate-700 gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
