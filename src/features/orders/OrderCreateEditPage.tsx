import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useTax } from '../../hooks/useTax';
import { customerService } from '../../services/CustomerService';
import { productService } from '../../services/ProductService';
import { quotationService } from '../../services/QuotationService';
import { Customer } from '../../types/customer';
import { Product } from '../../types/product';
import { CustomerSelector } from '../../components/selectors/CustomerSelector';
import { ProductSelector } from '../../components/selectors/ProductSelector';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { formatCurrency } from '../../utils/formatters';
import { evaluateOrderApproval } from '../../rules/orderRules';
import {
  getProductDiscountLevels,
  getAllowedDiscountLevels,
  getMaxAllowedDiscount,
  normalizeCustomerLoyaltyLevel,
} from '../../rules/discountRules';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  ShoppingCart,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Building2,
  Save,
  Send,
  ArrowLeft,
  ShieldAlert,
  CreditCard,
  Clock,
  Calendar,
  Truck,
  FileSpreadsheet,
} from 'lucide-react';

interface LocalItem {
  id: string;
  product: Product;
  quantity: number;
  discountPercentage: number;
}

export function OrderCreateEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { createOrder, updateOrder } = useOrders();
  const { taxEnabled, taxRate, taxName } = useTax();

  const isEdit = Boolean(id);
  const quotationId = searchParams.get('quotationId');
  const initialCustomerId = searchParams.get('customerId');

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [items, setItems] = useState<LocalItem[]>([]);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);

  const [requestedCreditDays, setRequestedCreditDays] = useState<number>(30);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [customerPoNumber, setCustomerPoNumber] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [quotationNumber, setQuotationNumber] = useState<string | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Load initial data (edit mode, quotation prefill, or customer prefill)
  useEffect(() => {
    async function loadData() {
      try {
        setPageLoading(true);

        if (isEdit && id) {
          const existing = await import('../../services/OrderService').then((m) =>
            m.orderService.getOrderById(id)
          );
          if (!existing) {
            setFormError('Sales Order not found.');
            return;
          }
          if (existing.status !== 'DRAFT') {
            setFormError(`Only DRAFT orders can be edited. Current status is ${existing.status}`);
            return;
          }

          const cust = await customerService.getCustomer(existing.customerId);
          if (cust) {
            setSelectedCustomer(cust);
          }

          setRequestedCreditDays(existing.requestedCreditDays || 30);
          setDeliveryAddress(existing.deliveryAddress || '');
          setRequestedDeliveryDate(existing.requestedDeliveryDate || '');
          setCustomerPoNumber(existing.customerPoNumber || '');
          setPaymentTerms(existing.paymentTerms || '');
          setNotes(existing.notes || '');
          setQuotationNumber(existing.quotationNumber);

          const localItems: LocalItem[] = [];
          for (const it of existing.items) {
            const prod = await productService.getProduct(it.productId);
            if (prod) {
              localItems.push({
                id: it.id,
                product: prod,
                quantity: it.orderedQuantity,
                discountPercentage: it.discountPercentage,
              });
            }
          }
          setItems(localItems);
        } else if (quotationId) {
          // Pre-fill from converted or referenced Quotation
          const quote = await quotationService.getQuotationById(quotationId);
          if (quote) {
            const cust = await customerService.getCustomer(quote.customerId);
            if (cust) {
              setSelectedCustomer(cust);
              setRequestedCreditDays(cust.commercialTerms?.creditDays || 30);
              setPaymentTerms(cust.commercialTerms?.paymentTermNotes || `${cust.commercialTerms?.creditDays || 30} Days Credit`);
            }
            setQuotationNumber(quote.quotationNumber);
            setDeliveryAddress(quote.customerAddressSnapshot || '');

            const localItems: LocalItem[] = [];
            for (const it of quote.items) {
              const prod = await productService.getProduct(it.productId);
              if (prod) {
                localItems.push({
                  id: `it-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                  product: prod,
                  quantity: it.quantity,
                  discountPercentage: it.discountPercentage,
                });
              }
            }
            setItems(localItems);
          }
        } else if (initialCustomerId) {
          const cust = await customerService.getCustomer(initialCustomerId);
          if (cust) {
            setSelectedCustomer(cust);
            setRequestedCreditDays(cust.commercialTerms?.creditDays || 30);
            setDeliveryAddress(cust.deliveryAddress || cust.address || '');
            setPaymentTerms(cust.commercialTerms?.paymentTermNotes || `${cust.commercialTerms?.creditDays || 30} Days Credit`);
          }
        }
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'Error loading initial data.');
      } finally {
        setPageLoading(false);
      }
    }
    loadData();
  }, [id, isEdit, quotationId, initialCustomerId]);

  // When customer changes, update defaults
  const handleSelectCustomer = (customer: Customer) => {
    if (currentUser.role === 'SALES_REP' && customer.assignedRepId && customer.assignedRepId !== currentUser.id) {
      setFormError(`Cannot select ${customer.name}: this customer is assigned to another sales representative.`);
      return;
    }
    setFormError(null);
    setSelectedCustomer(customer);
    setRequestedCreditDays(customer.commercialTerms?.creditDays || 30);
    setDeliveryAddress(customer.deliveryAddress || customer.address || '');
    setPaymentTerms(customer.commercialTerms?.paymentTermNotes || `${customer.commercialTerms?.creditDays || 30} Days Credit`);
    setIsCustomerSelectorOpen(false);
  };

  const handleAddProduct = (product: Product) => {
    const existingIdx = items.findIndex((i) => i.product.id === product.id);
    if (existingIdx >= 0) {
      const next = [...items];
      next[existingIdx].quantity += 1;
      setItems(next);
    } else {
      setItems([
        ...items,
        {
          id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          product,
          quantity: 1,
          discountPercentage: selectedCustomer?.commercialTerms?.defaultDiscountPercentage || 0,
        },
      ]);
    }
    setIsProductSelectorOpen(false);
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantity' | 'discountPercentage',
    val: number
  ) => {
    const next = [...items];
    next[index] = {
      ...next[index],
      [field]: val,
    };
    setItems(next);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Real-time Credit Limit & Business Rule Evaluation
  const evaluation = useMemo(() => {
    if (!selectedCustomer) {
      return null;
    }

    return evaluateOrderApproval({
      customer: selectedCustomer,
      items: items.map((i) => ({
        productId: i.product.id,
        productNameSnapshot: i.product.name,
        unitPriceSnapshot: i.product.pricing.currentSellingPrice,
        orderedQuantity: i.quantity,
        discountPercentage: i.discountPercentage,
        taxPercentage: taxEnabled ? taxRate : 0,
        product: i.product,
      })),
      requestedCreditDays,
      userRole: currentUser.role,
    });
  }, [selectedCustomer, items, requestedCreditDays, currentUser.role, taxEnabled, taxRate]);

  const handleSubmit = async (saveAsDraft: boolean) => {
    try {
      setFormError(null);
      if (!selectedCustomer) {
        setFormError('Please select a customer.');
        return;
      }

      if (items.length === 0) {
        setFormError('Order must contain at least one product item.');
        return;
      }

      if (!deliveryAddress.trim()) {
        setFormError('Delivery address is required.');
        return;
      }

      setIsSubmitting(true);

      const itemsPayload = items.map((i) => ({
        productId: i.product.id,
        orderedQuantity: i.quantity,
        requestedDiscountPercentage: i.discountPercentage,
      }));

      if (isEdit && id) {
        await updateOrder(id, {
          customerId: selectedCustomer.id,
          items: itemsPayload,
          requestedCreditDays,
          deliveryAddress,
          requestedDeliveryDate,
          customerPoNumber: customerPoNumber.trim() || undefined,
          paymentTerms: paymentTerms.trim() || undefined,
          notes: notes.trim() || undefined,
          saveAsDraft,
        });
        navigate(`/orders/${id}`);
      } else {
        const created = await createOrder({
          customerId: selectedCustomer.id,
          items: itemsPayload,
          requestedCreditDays,
          deliveryAddress,
          requestedDeliveryDate,
          customerPoNumber: customerPoNumber.trim() || undefined,
          paymentTerms: paymentTerms.trim() || undefined,
          notes: notes.trim() || undefined,
          saveAsDraft,
          quotationId: quotationId || undefined,
          quotationNumber,
        });
        navigate(`/orders/${created.id}`);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save sales order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pageLoading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading order editor...</div>;
  }

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sales Orders
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            {isEdit ? 'Edit Sales Order Draft' : 'Create Enterprise Sales Order'}
          </h1>
          {quotationNumber && (
            <p className="text-xs text-primary font-medium mt-0.5">
              Converting from Approved Quotation: <span className="font-mono font-semibold">{quotationNumber}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="text-xs gap-1.5 font-medium h-11 sm:h-9 cursor-pointer"
          >
            <Save className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            Save as Draft
          </Button>
          <Button
            size="sm"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs gap-1.5 font-semibold shadow-xs h-11 sm:h-9 cursor-pointer"
          >
            <Send className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            Submit Order
          </Button>
        </div>
      </div>

      {formError && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Validation Error</h4>
            <p>{formError}</p>
          </div>
        </div>
      )}

      {/* Real-time Credit Limit & Credit Days Validation Banner */}
      {selectedCustomer && evaluation && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card
              className={`p-3 border ${
                evaluation.creditLimitBreached
                  ? 'bg-rose-50 border-rose-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Credit Limit</span>
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="mt-1 text-xl font-semibold font-mono text-slate-900 tabular-nums">
                {formatCurrency(selectedCustomer.commercialTerms?.creditLimit || 0)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Current Due: {formatCurrency(selectedCustomer.financials?.totalOutstanding || 0)}
              </div>
            </Card>

            <Card
              className={`p-3 border ${
                evaluation.creditLimitBreached
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Available Credit</span>
                <CheckCircle className="h-3.5 w-3.5" />
              </div>
              <div className="mt-1 text-xl font-semibold font-mono tabular-nums">
                {formatCurrency(evaluation.availableCredit)}
              </div>
              <div className="text-xs opacity-80 mt-0.5">
                {evaluation.availableCredit >= evaluation.totalAmount
                  ? 'Sufficient credit available'
                  : `Breached by ${formatCurrency(evaluation.projectedOutstanding - (selectedCustomer.commercialTerms?.creditLimit || 0))}`}
              </div>
            </Card>

            <Card
              className={`p-3 border ${
                evaluation.creditDaysBreached
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Credit Days</span>
                <Clock className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {requestedCreditDays} <span className="text-xs font-normal text-slate-500">days req.</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Customer limit: {selectedCustomer.commercialTerms?.creditDays || 30} days
              </div>
            </Card>

            <Card className="p-3 bg-primary-light border border-primary-border text-indigo-900">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Projected Total</span>
                <ShoppingCart className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="mt-1 text-xl font-semibold font-mono text-indigo-950 tabular-nums">
                {formatCurrency(evaluation.totalAmount)}
              </div>
              <div className="text-xs text-primary mt-0.5">
                New balance: {formatCurrency(evaluation.projectedOutstanding)}
              </div>
            </Card>
          </div>

          {/* Visible Special Approval Warning Banner */}
          {evaluation.isSpecialApproval && (
            <div className="rounded-lg bg-amber-500 text-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-6 w-6 text-white shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm tracking-wide">
                      Special Approval Required
                    </h3>
                    <Badge variant="outline" className="bg-white text-amber-900 font-semibold text-xs border-amber-200">
                      Routes to {evaluation.targetApproverRole.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-50">
                    This order breaches standard authority or credit limits. It cannot be approved at the Sales Representative level and requires senior commercial review:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-amber-100 space-y-0.5 pt-1">
                    {evaluation.specialApprovalReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Customer & Delivery Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Selection Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="py-3 px-4 border-b border-slate-200 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Customer Information
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomerSelectorOpen(true)}
              className="text-xs h-7 gap-1 font-medium"
            >
              {selectedCustomer ? 'Change Customer' : 'Select Customer'}
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {selectedCustomer ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="font-semibold text-sm text-slate-900">{selectedCustomer.name}</div>
                  <Badge
                    variant={
                      normalizeCustomerLoyaltyLevel(selectedCustomer) === 'PLATINUM'
                        ? 'purple'
                        : normalizeCustomerLoyaltyLevel(selectedCustomer) === 'PREMIUM'
                        ? 'info'
                        : 'secondary'
                    }
                    className="font-medium text-[11px]"
                  >
                    Loyalty: {normalizeCustomerLoyaltyLevel(selectedCustomer)}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 font-mono">Code: {selectedCustomer.code}</div>
                <div className="text-xs text-slate-600">{selectedCustomer.phone}</div>
                <div className="text-xs text-slate-600">{selectedCustomer.email}</div>
                <div className="text-xs text-slate-500 border-t border-slate-100 pt-2">
                  <span className="font-medium text-slate-700">Billing Address:</span>
                  <p className="mt-0.5">{selectedCustomer.address}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                No customer selected. Please select a customer to begin.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Terms & Delivery Details */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3 px-4 border-b border-slate-200">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-primary" />
              Delivery & Commercial Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Delivery Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Warehouse or store delivery location"
                rows={2}
                className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Requested Delivery Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="date"
                    value={requestedDeliveryDate}
                    onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Customer PO / Reference #
                </label>
                <Input
                  value={customerPoNumber}
                  onChange={(e) => setCustomerPoNumber(e.target.value)}
                  placeholder="e.g. PO-89210"
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Requested Credit Days
              </label>
              <Input
                type="number"
                min={0}
                max={90}
                value={requestedCreditDays}
                onChange={(e) => setRequestedCreditDays(Number(e.target.value))}
                className="text-xs"
              />
              <span className="text-xs text-slate-400">
                Customer limit: {selectedCustomer?.commercialTerms?.creditDays || 30} days
              </span>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Payment Terms Notes
              </label>
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. 30 Days PDC upon invoice"
                className="text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Order Notes / Special Instructions
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special fulfillment or packaging instructions..."
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Line Items */}
      <Card>
        <CardHeader className="py-3 px-4 border-b border-slate-200 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Order Line Items
            </CardTitle>
            <p className="text-xs text-slate-500">
              Product prices and discounts will snapshot immutably upon order saving.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsProductSelectorOpen(true)}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs gap-1.5 font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              No products added yet. Click "Add Product Item" to select products from the Product Master.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] tabular-nums">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[12.5px]">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-semibold">Product</th>
                    <th className="py-2.5 px-3 text-right font-semibold w-[120px]">Unit Price</th>
                    <th className="py-2.5 px-3 text-center font-semibold w-[100px]">Qty</th>
                    <th className="py-2.5 px-3 text-center font-semibold w-[110px]">Disc %</th>
                    <th className="py-2.5 px-3 text-right font-semibold w-[120px]">Disc Amount</th>
                    <th className="py-2.5 px-3 text-right font-semibold w-[100px]">
                      {taxEnabled ? `${taxName || 'VAT'} (${taxRate}%)` : 'Tax (0%)'}
                    </th>
                    <th className="py-2.5 px-4 text-right font-semibold w-[130px]">Line Total</th>
                    <th className="py-2.5 px-2 text-center w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => {
                    const price = it.product.pricing.currentSellingPrice;
                    const sub = price * it.quantity;
                    const disc = (sub * it.discountPercentage) / 100;
                    const effectiveRate = taxEnabled ? taxRate : 0;
                    const tax = ((sub - disc) * effectiveRate) / 100;
                    const total = sub - disc + tax;

                    const configuredLevels = getProductDiscountLevels(it.product);
                    const availableLevels = getAllowedDiscountLevels(it.product, selectedCustomer);
                    const maxAllowed = getMaxAllowedDiscount(it.product, selectedCustomer);
                    const isExcessDisc =
                      configuredLevels.length === 0
                        ? it.discountPercentage > 0
                        : it.discountPercentage > maxAllowed;

                    return (
                      <tr key={it.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{it.product.name}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            {it.product.sku} • Stock: {it.product.stockOnHand} {it.product.uomCode}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">
                          {formatCurrency(price)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="w-16 h-7 text-xs text-center mx-auto tabular-nums"
                          />
                        </td>
                        <td className="py-3 px-3 text-center align-top">
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              value={it.discountPercentage}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'discountPercentage', parseFloat(e.target.value) || 0)
                              }
                              className={`w-16 h-7 text-xs text-center tabular-nums ${
                                isExcessDisc ? 'border-amber-500 font-semibold text-amber-700 bg-amber-50' : ''
                              }`}
                            />
                            <span className="text-slate-400">%</span>
                          </div>

                          {configuredLevels.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-1 mt-1 max-w-[140px] mx-auto">
                              <button
                                type="button"
                                onClick={() => handleUpdateItem(idx, 'discountPercentage', 0)}
                                className={`px-1 py-0.5 text-[10px] rounded font-medium ${
                                  it.discountPercentage === 0
                                    ? 'bg-slate-700 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                0%
                              </button>
                              {availableLevels.map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => handleUpdateItem(idx, 'discountPercentage', lvl)}
                                  className={`px-1 py-0.5 text-[10px] rounded font-medium ${
                                    it.discountPercentage === lvl
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                  title={`Available for ${normalizeCustomerLoyaltyLevel(selectedCustomer)}`}
                                >
                                  {lvl}%
                                </button>
                              ))}
                              {configuredLevels
                                .filter((lvl) => !availableLevels.includes(lvl))
                                .map((lvl) => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => handleUpdateItem(idx, 'discountPercentage', lvl)}
                                    className={`px-1 py-0.5 text-[10px] rounded font-medium ${
                                      it.discountPercentage === lvl
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                    }`}
                                    title="Exceeds customer loyalty level — Requires Management Approval"
                                  >
                                    {lvl}%*
                                  </button>
                                ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-700 block mt-1 leading-tight max-w-[130px] mx-auto">
                              No discount available (Approval Req.)
                            </span>
                          )}

                          {isExcessDisc && (
                            <span
                              className="text-[10px] text-amber-700 font-medium block mt-1 leading-tight max-w-[130px] mx-auto"
                              title="⚠️ This discount exceeds the customer's allowed discount level. Management approval is required."
                            >
                              ⚠️ Approval Req.
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">
                          - {formatCurrency(disc)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">
                          {formatCurrency(tax)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(total)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Remove Line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Financial Summary */}
          {evaluation && (
            <div className="border-t border-slate-200 p-4 bg-slate-50/50 flex flex-col items-end text-xs space-y-1.5">
              <div className="flex justify-between w-64 text-slate-600">
                <span>Subtotal (List):</span>
                <span className="font-mono font-medium tabular-nums">{formatCurrency(evaluation.subtotal)}</span>
              </div>
              <div className="flex justify-between w-64 text-emerald-600">
                <span>Total Discount:</span>
                <span className="font-mono font-medium tabular-nums">- {formatCurrency(evaluation.discountAmount)}</span>
              </div>
              <div className="flex justify-between w-64 text-slate-600">
                <span>{taxEnabled ? `${taxRate}% ${taxName || 'VAT'}:` : 'Tax:'}</span>
                <span className="font-mono font-medium tabular-nums">{formatCurrency(evaluation.taxAmount)}</span>
              </div>
              <div className="flex justify-between w-64 border-t border-slate-300 pt-2 font-semibold text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono font-semibold text-primary tabular-nums">{formatCurrency(evaluation.totalAmount)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Selector Modal */}
      <Dialog open={isCustomerSelectorOpen} onOpenChange={(open) => setIsCustomerSelectorOpen(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>
              Choose a customer from the central Customer Master.
              {currentUser.role === 'SALES_REP' && ' Only customers assigned to your territory are shown.'}
            </DialogDescription>
          </DialogHeader>
          <CustomerSelector
            onSelect={handleSelectCustomer}
            selectedCustomerId={selectedCustomer?.id}
            assignedRepId={currentUser.role === 'SALES_REP' ? currentUser.id : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Product Selector Modal */}
      <Dialog open={isProductSelectorOpen} onOpenChange={(open) => setIsProductSelectorOpen(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Product Item</DialogTitle>
            <DialogDescription>
              Select an item from the Product Master catalog to add to the sales order.
            </DialogDescription>
          </DialogHeader>
          <ProductSelector onSelect={handleAddProduct} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
