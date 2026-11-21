import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useSuppliers } from '../../api/suppliers/suppliers.hooks';
import type { Supplier } from '../../api/suppliers/suppliers.types';
import { useProducts as useApiProducts } from '../../api/products/products.hooks';
import { usePurchaseOrder, usePurchaseOrderActions } from '../../hooks/usePurchaseOrders';
import { useAuth } from '../../hooks/useAuth';
import type { CreatePurchaseOrderPayload } from '../../api/purchase-orders/purchase-orders.types';
import { formatCurrency } from '../../utils/formatters';
import { AlertCircle, ArrowLeft, Building2, Package, Plus, Save, Send, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ConfirmButton } from '../../components/ui/confirm-button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { PageHeader, FormSection, FormField, DocumentActionBar } from '../../components';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { toast } from 'sonner';

type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

interface LineFormState {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  notes: string;
}

const purchaseOrderFormSchema = z.object({
  supplierId: z.string().uuid('Select an active supplier.'),
  orderDate: z.string().min(1, 'PO date is required.'),
  expectedDeliveryDate: z.string().optional(),
  paymentTerms: z.string().max(100, 'Payment terms must be 100 characters or fewer.'),
  note: z.string().max(5000, 'Notes must be 5,000 characters or fewer.'),
  deliveryInstructions: z.string().max(5000, 'Delivery instructions must be 5,000 characters or fewer.'),
  items: z.array(z.object({
    productId: z.string().uuid('Select a product for each line.'),
    quantity: z.number().int('Quantity must be a whole number.').min(1, 'Quantity must be at least 1.'),
    unitPrice: z.number().min(0, 'Unit cost cannot be negative.'),
    discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    discountValue: z.number().min(0, 'Discount cannot be negative.'),
    notes: z.string().max(2000, 'Line notes must be 2,000 characters or fewer.'),
  })).min(1, 'Add at least one product line.'),
}).superRefine((values, ctx) => {
  if (values.expectedDeliveryDate && values.expectedDeliveryDate < values.orderDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expectedDeliveryDate'], message: 'Expected delivery cannot be earlier than the PO date.' });
  }
  values.items.forEach((line, index) => {
    if (line.discountType === 'PERCENTAGE' && line.discountValue > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'discountValue'], message: 'Percentage discount cannot exceed 100%.' });
    }
    if (line.discountType === 'FIXED_AMOUNT' && line.discountValue > line.quantity * line.unitPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'discountValue'], message: 'Discount cannot exceed the line amount.' });
    }
  });
  const selectedProducts = values.items.map((line) => line.productId).filter(Boolean);
  if (new Set(selectedProducts).size !== selectedProducts.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Each product can appear only once. Combine quantities on a single line.' });
  }
});

function makeLine(): LineFormState {
  return {
    id: `line-${crypto.randomUUID()}`,
    productId: '',
    productCode: '',
    productName: '',
    quantity: 1,
    unitPrice: 0,
    discountType: 'PERCENTAGE',
    discountValue: 0,
    notes: '',
  };
}

function asLocalDate(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function PurchaseOrderCreateEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const canManageOrders = currentUser?.role === 'PURCHASING_OFFICER' || currentUser?.role === 'PURCHASING_MANAGER' || currentUser?.role === 'MANAGER' || currentUser?.role === 'DIRECTOR';
  const initialSupplierId = searchParams.get('supplierId') ?? '';
  const today = new Date().toISOString().slice(0, 10);

  const { purchaseOrder: existing, loading: poLoading, error: poError } = usePurchaseOrder(id);
  const { createPO, updatePO, revisePO } = usePurchaseOrderActions();
  const supplierQuery = useSuppliers({ page: 1, limit: 100, status: 'ACTIVE', sortBy: 'name', sortOrder: 'asc' });
  const productQuery = useApiProducts({ page: 1, pageSize: 100, status: 'ACTIVE', sortBy: 'name', sortOrder: 'asc' });
  const suppliers = supplierQuery.data?.data ?? [];
  const products = productQuery.data?.data ?? [];

  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplierId);
  const [orderDate, setOrderDate] = useState(today);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<LineFormState[]>([makeLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing || !isEdit) return;
    setSelectedSupplierId(existing.supplierId);
    setOrderDate(asLocalDate(existing.orderDate) || today);
    setExpectedDeliveryDate(asLocalDate(existing.expectedDeliveryDate));
    setPaymentTerms(existing.paymentTerms || '');
    setDeliveryInstructions(existing.deliveryInstructions || '');
    setNote(existing.notes || '');
    setLines(existing.items.length > 0 ? existing.items.map((item) => ({
      id: item.id || `line-${crypto.randomUUID()}`,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountType: item.discountType ?? (item.discountPercent > 0 ? 'PERCENTAGE' : 'FIXED_AMOUNT'),
      discountValue: item.discountValue ?? (item.discountPercent > 0 ? item.discountPercent : item.discountAmount),
      notes: item.notes || '',
    })) : [makeLine()]);
  }, [existing?.id, isEdit]);

  const selectedSupplier = useMemo<Supplier | null>(
    () => suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null,
    [suppliers, selectedSupplierId],
  );

  useEffect(() => {
    if (!isEdit && selectedSupplier?.paymentTerms) setPaymentTerms(selectedSupplier.paymentTerms);
  }, [selectedSupplier?.id, isEdit]);

  const calculation = useMemo(() => {
    const rows = lines.filter((line) => line.productId).map((line) => {
      const gross = line.quantity * line.unitPrice;
      const discount = line.discountType === 'PERCENTAGE'
        ? gross * line.discountValue / 100
        : line.discountValue;
      return { gross, discount, net: Math.max(0, gross - discount) };
    });
    const subtotal = rows.reduce((total, row) => total + row.gross, 0);
    const totalDiscount = rows.reduce((total, row) => total + row.discount, 0);
    return { subtotal, totalDiscount, grandTotal: subtotal - totalDiscount };
  }, [lines]);

  if (!canManageOrders) {
    return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">Your role is not authorized to create or edit purchase orders.</div>;
  }

  const updateLine = (lineId: string, patch: Partial<LineFormState>) => {
    setLines((current) => current.map((line) => line.id === lineId ? { ...line, ...patch } : line));
    setFormError(null);
  };

  const chooseProduct = (lineId: string, productId: string) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;
    updateLine(lineId, {
      productId: product.id,
      productCode: product.sku,
      productName: product.name,
      unitPrice: Number(product.pricing?.costPrice ?? 0),
    });
  };

  const handleSaveOrder = async (submitForApproval: boolean) => {
    setFormError(null);
    const form = {
      supplierId: selectedSupplierId,
      orderDate,
      expectedDeliveryDate,
      paymentTerms,
      note,
      deliveryInstructions,
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        discountType: line.discountType,
        discountValue: Number(line.discountValue),
        notes: line.notes,
      })),
    };
    const parsed = purchaseOrderFormSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || 'Review the highlighted purchase order details.');
      return;
    }
    if (!selectedSupplier || selectedSupplier.status !== 'ACTIVE') {
      setFormError('Select an active supplier.');
      return;
    }

    const payload: CreatePurchaseOrderPayload = {
      supplierId: selectedSupplier.id,
      orderDate: `${orderDate}T00:00:00.000Z`,
      expectedDeliveryDate: expectedDeliveryDate ? `${expectedDeliveryDate}T00:00:00.000Z` : null,
      paymentTerms: paymentTerms.trim() || undefined,
      deliveryInstructions: deliveryInstructions.trim() || undefined,
      note: note.trim() || undefined,
      items: parsed.data.items.map((line) => ({
        productId: line.productId,
        qty: line.quantity,
        unitPrice: line.unitPrice,
        discountType: line.discountValue > 0 ? line.discountType : undefined,
        discountAmount: line.discountValue,
        notes: line.notes.trim() || undefined,
      })),
      submitForApproval,
    };

    setSubmitting(true);
    let revisionId: string | undefined;
    try {
      let result;
      if (!isEdit) {
        result = await createPO(payload);
      } else if (existing?.status === 'REJECTED' && id) {
        const revision = await revisePO(id);
        revisionId = revision.id;
        result = await updatePO(revision.id, payload);
      } else if (id && existing?.status === 'DRAFT') {
        result = await updatePO(id, payload);
      } else {
        setFormError('Only draft purchase orders can be edited. Create a revision for a rejected order.');
        return;
      }
      navigate(`/purchasing/orders/${result.id}`);
    } catch {
      if (revisionId) {
        toast.error('A draft revision was created but could not be updated. Continue editing the new revision.');
        navigate(`/purchasing/orders/${revisionId}/edit`);
      } else {
        setFormError('The purchase order could not be saved. Review the server error and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if ((isEdit && poLoading) || supplierQuery.isLoading || productQuery.isLoading) {
    return <TableLoadingSkeleton />;
  }

  if (isEdit && poError) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/purchasing/orders')}><ArrowLeft className="mr-2 h-4 w-4" />Orders</Button>
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{poError}</p>
      </div>
    );
  }

  if (isEdit && !poLoading && !existing) {
    return <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50 p-6">
      <h2 className="font-semibold text-rose-950">Purchase order not found</h2>
      <p className="text-sm text-rose-900">The requested purchase order could not be loaded.</p>
      <Button onClick={() => navigate('/purchasing/orders')}>Back to Purchase Orders</Button>
    </div>;
  }

  if (isEdit && existing && !['DRAFT', 'REJECTED'].includes(existing.status)) {
    return (
      <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-semibold text-amber-950">This purchase order is locked</h2>
        <p className="text-sm text-amber-900">Only draft purchase orders can be edited. Its current status is {existing.status}.</p>
        <Button onClick={() => navigate(`/purchasing/orders/${existing.id}`)}>Return to Purchase Order</Button>
      </div>
    );
  }

  if (supplierQuery.isError || productQuery.isError) {
    return <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50 p-6">
      <h2 className="font-semibold text-rose-950">Supplier or product data could not be loaded</h2>
      <p className="text-sm text-rose-900">Reload the required purchasing data before saving a purchase order.</p>
      <div className="flex gap-2">
        {supplierQuery.isError && <Button variant="outline" onClick={() => void supplierQuery.refetch()}>Retry Suppliers</Button>}
        {productQuery.isError && <Button variant="outline" onClick={() => void productQuery.refetch()}>Retry Products</Button>}
      </div>
    </div>;
  }

  if (!supplierQuery.isLoading && suppliers.length === 0) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-8 text-center">
        <Building2 className="mx-auto h-8 w-8 text-slate-400" />
        <h2 className="font-semibold text-slate-900">No active suppliers</h2>
        <p className="text-sm text-slate-500">Add or activate a supplier before creating a purchase order.</p>
        <Button onClick={() => navigate('/purchasing/suppliers')}>Manage Suppliers</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={isEdit ? existing?.status === 'REJECTED' ? 'Create Purchase Order Revision' : 'Edit Draft Purchase Order' : 'Create Purchase Order'}
        subtitle="Prepare supplier, delivery, product, and discount details. Totals are recalculated by the server."
        backUrl="/purchasing/orders"
        backLabel="Orders"
        badge={<Badge variant="outline">{isEdit ? existing?.status : 'DRAFT'}</Badge>}
        actions={<div className="flex gap-2"><Button variant="outline" disabled={submitting} onClick={() => void handleSaveOrder(false)}><Save className="mr-2 h-4 w-4" />Save Draft</Button><Button disabled={submitting} onClick={() => void handleSaveOrder(true)}><Send className="mr-2 h-4 w-4" />Submit for Review</Button></div>}
      />

      {(supplierQuery.error || productQuery.error) && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="h-4 w-4" />
          Supplier or product data could not be loaded. Refresh and try again.
        </div>
      )}
      {formError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}

      <FormSection icon={Building2} title="Supplier & Order Details" description="Supplier and delivery terms are captured on this purchase order.">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Supplier" required>
            <select value={selectedSupplierId} onChange={(event) => setSelectedSupplierId(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option value="">Select an active supplier</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}{supplier.supplierCode ? ` (${supplier.supplierCode})` : ''}</option>)}
            </select>
          </FormField>
          <FormField label="PO Date" required>
            <Input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} />
          </FormField>
          <FormField label="Expected Delivery Date">
            <Input type="date" value={expectedDeliveryDate} onChange={(event) => setExpectedDeliveryDate(event.target.value)} />
          </FormField>
          <FormField label="Payment Terms">
            <Input maxLength={100} placeholder="e.g. Net 30" value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} />
          </FormField>
          {selectedSupplier && <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{selectedSupplier.name}</div>
            <div>{selectedSupplier.contactPerson || 'No contact person'}{selectedSupplier.phone ? ` · ${selectedSupplier.phone}` : ''}</div>
            <div>{selectedSupplier.address || 'No registered address'}</div>
            <div>Supplier terms: {selectedSupplier.paymentTerms || 'Not specified'}</div>
          </div>}
          <FormField label="Delivery Instructions" className="md:col-span-3">
            <Textarea maxLength={5000} rows={2} value={deliveryInstructions} onChange={(event) => setDeliveryInstructions(event.target.value)} placeholder="Delivery location and instructions" />
          </FormField>
        </div>
      </FormSection>

      <FormSection icon={Package} title="Product Lines" description="Enter quantities, unit costs, and any line discount agreed with the supplier.">
        <div className="mb-3 flex justify-end"><Button type="button" size="sm" variant="outline" onClick={() => setLines((current) => [...current, makeLine()])}><Plus className="mr-2 h-4 w-4" />Add Product</Button></div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>
              <th className="p-3">Product</th><th className="w-24 p-3 text-right">Qty</th><th className="w-36 p-3 text-right">Unit Cost (LKR)</th><th className="w-36 p-3">Discount</th><th className="w-36 p-3 text-right">Line Preview (LKR)</th><th className="w-10 p-3" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line) => {
                const gross = line.quantity * line.unitPrice;
                const discount = line.discountType === 'PERCENTAGE' ? gross * line.discountValue / 100 : line.discountValue;
                return <tr key={line.id}>
                  <td className="space-y-1 p-3">
                    <select value={line.productId} onChange={(event) => chooseProduct(line.id, event.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2">
                      <option value="">Select a product</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
                      {line.productId && !products.some((product) => product.id === line.productId) && <option value={line.productId}>{line.productCode} · {line.productName} (inactive)</option>}
                    </select>
                    <Input maxLength={2000} placeholder="Optional line notes" value={line.notes} onChange={(event) => updateLine(line.id, { notes: event.target.value })} />
                  </td>
                  <td className="p-3"><Input type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Math.max(1, Number.parseInt(event.target.value, 10) || 1) })} className="text-right" /></td>
                  <td className="p-3"><Input type="number" min="0" step="0.0001" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: Math.max(0, Number.parseFloat(event.target.value) || 0) })} className="text-right" /></td>
                  <td className="p-3"><div className="flex gap-1">
                    <select value={line.discountType} onChange={(event) => updateLine(line.id, { discountType: event.target.value as DiscountType })} className="h-9 rounded-md border border-slate-300 bg-white px-1 text-xs"><option value="PERCENTAGE">%</option><option value="FIXED_AMOUNT">LKR</option></select>
                    <Input type="number" min="0" step="0.0001" max={line.discountType === 'PERCENTAGE' ? 100 : undefined} value={line.discountValue} onChange={(event) => updateLine(line.id, { discountValue: Math.max(0, Number.parseFloat(event.target.value) || 0) })} aria-label="Line discount" />
                  </div></td>
                  <td className="p-3 text-right font-mono font-semibold">{formatCurrency(Math.max(0, gross - discount), 'LKR')}</td>
                  <td className="p-3"><Button type="button" variant="ghost" size="icon-sm" aria-label="Remove product line" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((candidate) => candidate.id !== line.id))}><Trash2 className="h-4 w-4 text-rose-600" /></Button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </FormSection>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><Textarea maxLength={5000} rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Internal purchasing notes and commercial terms" /></CardContent>
        </Card>
        <Card className="bg-slate-50 lg:col-span-5">
          <CardHeader><CardTitle className="text-sm">Order Preview (LKR)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Gross line total</span><span className="font-mono">{formatCurrency(calculation.subtotal, 'LKR')}</span></div>
            <div className="flex justify-between text-emerald-700"><span>Line discounts</span><span className="font-mono">−{formatCurrency(calculation.totalDiscount, 'LKR')}</span></div>
            <div className="flex justify-between border-t border-slate-300 pt-3 text-base font-bold"><span>Estimated Total</span><span className="font-mono">{formatCurrency(calculation.grandTotal, 'LKR')}</span></div>
            <p className="text-xs text-slate-500">The backend recalculates all discounts and totals before saving. Tax and additional charges are not configured for purchase orders.</p>
          </CardContent>
        </Card>
      </div>

      <DocumentActionBar
        status={<Badge variant="outline">{isEdit ? existing?.status : 'DRAFT'}</Badge>}
        summary={<span>Estimated total: <strong className="ml-1 font-mono">{formatCurrency(calculation.grandTotal, 'LKR')}</strong></span>}
        leftActions={<Button variant="ghost" onClick={() => navigate('/purchasing/orders')}><ArrowLeft className="mr-2 h-4 w-4" />Cancel</Button>}
        rightActions={<>
          <ConfirmButton variant="outline" confirmTitle="Save Draft Purchase Order" confirmMessage="Save the current purchase order as a draft?" confirmText="Save Draft" disabled={submitting} onConfirm={() => void handleSaveOrder(false)}><Save className="mr-2 h-4 w-4" />Save Draft</ConfirmButton>
          <ConfirmButton variant="default" confirmTitle="Submit Purchase Order" confirmMessage="Submit this purchase order to the Purchasing Manager for review?" confirmText="Submit for Review" disabled={submitting} onConfirm={() => void handleSaveOrder(true)}><Send className="mr-2 h-4 w-4" />Submit for Review</ConfirmButton>
        </>}
      />
    </div>
  );
}
