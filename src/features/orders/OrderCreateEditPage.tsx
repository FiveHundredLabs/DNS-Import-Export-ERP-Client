import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useTax } from '../../hooks/useTax';
import { customerService } from '../../services/CustomerService';
import { productService } from '../../services/ProductService';
import { quotationService } from '../../services/QuotationService';
import { invoiceService } from '../../services/InvoiceService';
import { toast } from 'sonner';
import { Customer } from '../../types/customer';
import { Product } from '../../types/product';
import { CustomerSelector } from '../../components/selectors/CustomerSelector';
import { CustomerSummaryCard } from '../../components/selectors/CustomerSummaryCard';
import { ProductSelector } from '../../components/selectors/ProductSelector';
import { DocumentActionBar } from '../../components/common/DocumentActionBar';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormField } from '../../components/common/FormField';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../utils/cn';
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
  Boxes,
  Tag,
} from 'lucide-react';
import { batchInventoryService } from '../../services/BatchInventoryService';

interface LocalItem {
  id: string;
  product: Product;
  quantity: number;
  discountPercentage: number;
  selectedBatchId?: string;
  selectedBatchNumber?: string;
  selectedUnitPrice?: number;
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
                selectedUnitPrice: it.unitPriceSnapshot,
                selectedBatchId: it.batchId,
                selectedBatchNumber: it.batchNumber,
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
    const available = Math.max(0, (product.stockOnHand ?? 0) - (product.damagedStock ?? 0));
    if (available <= 0) {
      toast.error(`"${product.name}" has 0 available stock and cannot be added.`);
      return;
    }

    const existingIdx = items.findIndex((i) => i.product.id === product.id);
    if (existingIdx >= 0) {
      const next = [...items];
      const cur = next[existingIdx];
      const selectedBatch = cur.selectedBatchId ? batchInventoryService.getBatchById(cur.selectedBatchId) : null;
      const maxAllowed = selectedBatch
        ? selectedBatch.availableQuantity
        : Math.max(0, (product.stockOnHand ?? 0) - (product.damagedStock ?? 0));

      if (maxAllowed > 0 && cur.quantity + 1 > maxAllowed) {
        toast.warning(`Cannot exceed available quantity (${maxAllowed}) for "${product.name}".`);
        return;
      }
      next[existingIdx].quantity += 1;
      setItems(next);
    } else {
      const activeBatches = batchInventoryService.getActiveBatches(product.id);
      const defaultBatch = activeBatches[0];
      setItems([
        ...items,
        {
          id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          product,
          quantity: 1,
          discountPercentage: 0,
          selectedBatchId: defaultBatch?.id,
          selectedBatchNumber: defaultBatch?.batchNumber,
          selectedUnitPrice: defaultBatch ? defaultBatch.sellingPrice : product.pricing.currentSellingPrice,
        },
      ]);
    }
    setIsProductSelectorOpen(false);
  };

  const handleSelectBatch = (index: number, batchId: string) => {
    const next = [...items];
    const item = next[index];
    if (batchId === 'DEFAULT') {
      next[index] = {
        ...item,
        selectedBatchId: undefined,
        selectedBatchNumber: undefined,
        selectedUnitPrice: item.product.pricing.currentSellingPrice,
      };
    } else {
      const batch = batchInventoryService.getBatchById(batchId);
      if (batch) {
        next[index] = {
          ...item,
          selectedBatchId: batch.id,
          selectedBatchNumber: batch.batchNumber,
          selectedUnitPrice: batch.sellingPrice,
        };
      }
    }
    setItems(next);
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantity' | 'discountPercentage',
    val: number
  ) => {
    const next = [...items];
    const item = next[index];
    if (field === 'quantity') {
      const selectedBatch = item.selectedBatchId ? batchInventoryService.getBatchById(item.selectedBatchId) : null;
      const maxAllowed = selectedBatch
        ? selectedBatch.availableQuantity
        : Math.max(0, (item.product.stockOnHand ?? 0) - (item.product.damagedStock ?? 0));

      if (maxAllowed > 0 && val > maxAllowed) {
        toast.warning(
          `Requested quantity (${val}) exceeds available stock (${maxAllowed} ${item.product.uomCode || 'units'}).`
        );
      }
    }
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
        unitPriceSnapshot: i.selectedUnitPrice ?? i.product.pricing.currentSellingPrice,
        orderedQuantity: i.quantity,
        discountPercentage: i.discountPercentage,
        taxPercentage: taxEnabled ? taxRate : 0,
        product: i.product,
      })),
      requestedCreditDays,
      userRole: currentUser.role,
    });
  }, [selectedCustomer, items, requestedCreditDays, currentUser.role, taxEnabled, taxRate]);

  // Price floor validation: checks if net price (after discount) drops below minimumSellingPrice
  const floorBreachedItems = useMemo(() => {
    return items
      .map((it) => {
        const unitPrice = it.selectedUnitPrice ?? it.product.pricing.currentSellingPrice;
        const netUnitPrice = unitPrice * (1 - it.discountPercentage / 100);
        const floorPrice = it.product.pricing.minimumSellingPrice || 0;
        const isBreached = floorPrice > 0 && netUnitPrice < floorPrice;
        return {
          id: it.id,
          product: it.product,
          unitPrice,
          netUnitPrice,
          floorPrice,
          isBreached,
          deficit: floorPrice - netUnitPrice,
        };
      })
      .filter((it) => it.isBreached);
  }, [items]);


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

      // Restrict: quantity cannot exceed available stock
      for (const i of items) {
        const selectedBatch = i.selectedBatchId ? batchInventoryService.getBatchById(i.selectedBatchId) : null;
        const availableStock = selectedBatch
          ? selectedBatch.availableQuantity
          : Math.max(0, (i.product.stockOnHand ?? 0) - (i.product.damagedStock ?? 0));

        if (availableStock > 0 && i.quantity > availableStock) {
          setFormError(
            `Ordered quantity for "${i.product.name}" (${i.quantity}) cannot exceed available stock (${availableStock} ${i.product.uomCode || 'units'}).`
          );
          setIsSubmitting(false);
          return;
        }
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
        batchId: i.selectedBatchId,
        batchNumber: i.selectedBatchNumber,
        unitPrice: i.selectedUnitPrice,
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

        if (searchParams.get('createInvoice') === 'true') {
          try {
            const draftInvoice = await invoiceService.createInvoiceFromOrder(
              created.id,
              currentUser!,
              { asDraft: true, allowUnapproved: true }
            );
            toast.success(`Sales Order ${created.orderNumber} created & converted to Draft Invoice!`);
            navigate(`/invoices/${draftInvoice.id}`);
            return;
          } catch (invErr: any) {
            console.error('Failed to create draft invoice:', invErr);
            toast.error(invErr?.message || 'Failed to auto-create draft invoice');
          }
        }

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
    <div className="space-y-6 w-full pb-28">
      {/* Top Header */}
      <PageHeader
        title={isEdit ? 'Edit Sales Order Draft' : 'Create Enterprise Sales Order'}
        breadcrumbs={[
          { label: 'Sales Orders', href: '/orders' },
          { label: isEdit ? 'Edit Order' : 'New Order' },
        ]}
        onBack={() => navigate('/orders')}
        badge={
          quotationNumber ? (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
              Quote #{quotationNumber}
            </Badge>
          ) : undefined
        }
      />

      {searchParams.get('createInvoice') === 'true' && (
        <div className="text-xs text-emerald-800 font-medium flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Invoice Creation Mode: Saving will immediately convert this order into an editable draft invoice.</span>
        </div>
      )}

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
            <StatCard
              title="Credit Limit"
              value={formatCurrency(selectedCustomer.commercialTerms?.creditLimit || 0)}
              icon={CreditCard}
              variant="default"
            />

            <StatCard
              title="Available Credit"
              value={formatCurrency(evaluation.availableCredit)}
              icon={evaluation.creditLimitBreached ? AlertTriangle : CheckCircle}
              variant={evaluation.creditLimitBreached ? 'rose' : 'emerald'}
            />

            <StatCard
              title="Credit Days"
              value={`${requestedCreditDays} days req.`}
              icon={Clock}
              variant={evaluation.creditDaysBreached ? 'rose' : 'default'}
            />

            <StatCard
              title="Projected Total"
              value={formatCurrency(evaluation.totalAmount)}
              icon={ShoppingCart}
              variant={evaluation.creditLimitBreached ? 'amber' : 'default'}
            />
          </div>

          {/* Visible Special Approval Warning Banner */}
          {evaluation.isSpecialApproval && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-xs text-amber-900 uppercase tracking-wide">
                      Special Approval Required
                    </h3>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 font-semibold text-xs border-amber-300">
                      Routes to {evaluation.targetApproverRole.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-800">
                    This order breaches standard authority or credit limits. It cannot be approved at the Sales Representative level and requires senior commercial review:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-amber-900 space-y-0.5 font-medium">
                    {evaluation.specialApprovalReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Visible Price Floor Validation Warning Banner */}
          {floorBreachedItems.length > 0 && (
            <div className="rounded-lg bg-rose-50 border-2 border-rose-400 p-4 text-xs text-rose-900 shadow-xs flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-rose-950 text-sm">
                    Price Floor Violation Warning (Selling Below Authorized Minimum)
                  </h4>
                  <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-[10px]">
                    Requires Management Approval
                  </Badge>
                </div>
                <p className="text-rose-800 leading-relaxed">
                  The net selling price on <strong>{floorBreachedItems.length} line item(s)</strong> drops below the minimum commercial floor price. Representatives cannot sell below the minimum price without executive authorization:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-rose-900 font-mono text-[11.5px] pt-0.5">
                  {floorBreachedItems.map((item) => (
                    <li key={item.id}>
                      <strong className="font-sans font-bold">{item.product.name}:</strong> Net unit price of {formatCurrency(item.netUnitPrice)} is below minimum selling price of {formatCurrency(item.floorPrice)} (Deficit: -{formatCurrency(item.deficit)} per unit)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer & Delivery Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Customer Information */}
        <FormSection
          title="Customer Information"
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
                onSelect={handleSelectCustomer}
                selectedCustomerId={selectedCustomer?.id}
                assignedRepId={currentUser.role === 'SALES_REP' ? currentUser.id : undefined}
              />
            </div>
          )}
        </FormSection>

        {/* Order Terms & Delivery Details */}
        <FormSection
          title="Delivery & Commercial Terms"
          icon={Truck}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Delivery Address" required>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Warehouse or store delivery location..."
                  rows={2}
                  className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-primary font-sans"
                />
              </FormField>
            </div>

            <FormField label="Requested Delivery Date">
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="date"
                  value={requestedDeliveryDate}
                  onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </FormField>

            <FormField label="Customer PO / Reference #">
              <Input
                value={customerPoNumber}
                onChange={(e) => setCustomerPoNumber(e.target.value)}
                placeholder="e.g. PO-89210"
                className="text-xs"
              />
            </FormField>

            <FormField label="Requested Credit Days">
              <div>
                <Input
                  type="number"
                  min={0}
                  max={90}
                  value={requestedCreditDays}
                  onChange={(e) => setRequestedCreditDays(Number(e.target.value))}
                  className="text-xs"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Customer limit: {selectedCustomer?.commercialTerms?.creditDays || 30} days
                </span>
              </div>
            </FormField>

            <FormField label="Payment Terms Notes">
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. 30 Days PDC upon invoice"
                className="text-xs"
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Order Notes / Instructions">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery timing, gate instructions, packaging requirements..."
                  className="text-xs"
                />
              </FormField>
            </div>
          </div>
        </FormSection>
      </div>

      {/* Product Line Items */}
      <Card className="shadow-2xs">
        <CardHeader className="py-3 px-4 border-b border-slate-200 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Order Line Items ({items.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setIsProductSelectorOpen(true)}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs gap-1.5 font-medium cursor-pointer"
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
              <table className="w-full text-xs tabular-nums">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Product & SKU</th>
                    <th className="py-2.5 px-3 text-left font-semibold min-w-[200px]">Stock / Batch</th>
                    <th className="py-2.5 px-3 text-right font-semibold w-[120px]">Unit Price</th>
                    <th className="py-2.5 px-3 text-center font-semibold w-[90px]">Qty</th>
                    <th className="py-2.5 px-3 text-center font-semibold min-w-[140px]">Disc %</th>
                    <th className="py-2.5 px-3 text-right font-semibold w-[110px]">Disc Amount</th>
                    <th className="py-2.5 px-3 text-right font-semibold w-[100px]">
                      {taxEnabled ? `${taxName || 'VAT'} (${taxRate}%)` : 'Tax (0%)'}
                    </th>
                    <th className="py-2.5 px-4 text-right font-semibold w-[120px]">Line Total</th>
                    <th className="py-2.5 px-2 text-center w-[44px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => {
                    const price = it.selectedUnitPrice ?? it.product.pricing.currentSellingPrice;
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

                    const productBatches = batchInventoryService.getActiveBatches(it.product.id);
                    const selectedBatch = it.selectedBatchId ? batchInventoryService.getBatchById(it.selectedBatchId) : null;
                    const availableStock = selectedBatch
                      ? selectedBatch.availableQuantity
                      : Math.max(0, (it.product.stockOnHand ?? 0) - (it.product.damagedStock ?? 0));
                    const isExceedingStock = availableStock > 0 && it.quantity > availableStock;

                    const isBelowFloor =
                      (it.product.pricing.minimumSellingPrice || 0) > 0 &&
                      price * (1 - it.discountPercentage / 100) < (it.product.pricing.minimumSellingPrice || 0);

                    return (
                      <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{it.product.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {it.product.sku} • {it.product.uomCode}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="font-medium text-[11px]">Avail:</span>
                            <span className="font-mono font-semibold text-[11px]">
                              {availableStock} {it.product.uomCode}
                            </span>
                          </div>
                          {productBatches.length > 0 ? (
                            <div className="mt-1 flex items-center gap-1">
                              <Boxes className="h-3 w-3 text-primary shrink-0" />
                              <select
                                value={it.selectedBatchId || 'DEFAULT'}
                                onChange={(e) => handleSelectBatch(idx, e.target.value)}
                                className="text-[11px] h-6 px-1.5 py-0 bg-white border border-slate-200 rounded font-mono text-slate-800 focus:ring-1 focus:ring-primary max-w-[220px]"
                                title="Select stock batch lot (Strategy 1: batch-specific pricing)"
                              >
                                {productBatches.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.batchNumber} ({b.warehouseId} • {b.availableQuantity} avail • {formatCurrency(b.sellingPrice)})
                                  </option>
                                ))}
                                <option value="DEFAULT">
                                  Default Catalog ({formatCurrency(it.product.pricing.currentSellingPrice)})
                                </option>
                              </select>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              General Inventory
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">
                          <div>{formatCurrency(price)}</div>
                          {it.selectedBatchNumber && (
                            <span className="text-[10px] font-mono text-primary block">
                              {it.selectedBatchNumber}
                            </span>
                          )}
                          {isBelowFloor && (
                            <span className="inline-block mt-1 text-[9.5px] font-bold text-rose-700 bg-rose-50 border border-rose-300 rounded px-1 py-0.5 whitespace-nowrap">
                              Below Floor ({formatCurrency(it.product.pricing.minimumSellingPrice)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center align-top">
                          <Input
                            type="number"
                            min={1}
                            max={availableStock > 0 ? availableStock : undefined}
                            value={it.quantity}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className={cn(
                              'w-20 h-7 text-xs text-center mx-auto tabular-nums font-mono',
                              isExceedingStock && 'border-rose-500 bg-rose-50 text-rose-800 font-bold focus:ring-rose-500'
                            )}
                          />
                          <span
                            className={cn(
                              'text-[10px] block mt-0.5 font-mono whitespace-nowrap',
                              isExceedingStock ? 'text-rose-600 font-bold' : 'text-slate-400'
                            )}
                          >
                            {isExceedingStock ? `Exceeds (${availableStock})` : `Max: ${availableStock}`}
                          </span>
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
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
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

      {/* Product Selector Modal */}
      <Dialog open={isProductSelectorOpen} onOpenChange={(open) => setIsProductSelectorOpen(open)}>
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
          evaluation?.isSpecialApproval ? (
            <Badge variant="warning" className="text-xs">Special Approval Required</Badge>
          ) : (
            <Badge variant="success" className="text-xs">Standard Approval</Badge>
          )
        }
        summary={
          evaluation ? (
            <div className="text-right">
              <span className="text-xs text-slate-500 mr-2">Grand Total:</span>
              <span className="text-base font-bold font-mono text-primary tabular-nums">
                {formatCurrency(evaluation.totalAmount)}
              </span>
            </div>
          ) : null
        }
        rightActions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="gap-1.5 font-medium cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save as Draft</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-hover text-primary-foreground gap-1.5 font-semibold cursor-pointer shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit Order</span>
            </Button>
          </>
        }
      />
    </div>
  );
}
