import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { useFinanceLedger } from '../finance/hooks/useFinanceLedger';
import { purchaseOrderService } from '../../services/PurchaseOrderService';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { formatCurrency } from '../../utils/formatters';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  Send,
  ArrowLeft,
  Building2,
  Calendar,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { SUPPORTED_CURRENCIES } from '../../types/purchasing';

interface LineFormState {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  notes?: string;
}

export function PurchaseOrderCreateEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialSupplierId = searchParams.get('supplierId');

  const isEdit = Boolean(id);
  const { purchaseOrders, createPO, updatePO } = usePurchaseOrders();
  const { suppliers } = useFinanceLedger();

  // Form states
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(initialSupplierId || '');
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30');
  const [currency, setCurrency] = useState<string>('LKR');
  const [shippingCharges, setShippingCharges] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>(
    'Deliver to Central Warehouse, Wellampitiya during standard receiving hours.'
  );

  const [lines, setLines] = useState<LineFormState[]>([
    {
      id: `line-${Date.now()}`,
      productId: '',
      productCode: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxRate: 18,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Load existing PO if in edit mode
  useEffect(() => {
    if (isEdit && id) {
      const existing = purchaseOrders.find((p) => p.id === id);
      if (existing) {
        setSelectedSupplierId(existing.supplierId);
        setOrderDate(existing.orderDate);
        setExpectedDeliveryDate(existing.expectedDeliveryDate);
        setPaymentTerms(existing.paymentTerms);
        setShippingCharges(existing.shippingCharges || 0);
        setOtherCharges(existing.otherCharges || 0);
        setNotes(existing.notes || '');
        setCurrency(existing.currency || 'LKR');
        setDeliveryInstructions(existing.deliveryInstructions || '');
        setLines(
          existing.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            taxRate: item.taxRate || 18,
            notes: item.notes,
          }))
        );
      }
    }
  }, [isEdit, id, purchaseOrders]);

  // Selected supplier details
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Auto-fill supplier payment terms when supplier changes (on new form)
  useEffect(() => {
    if (selectedSupplier && !isEdit) {
      if (selectedSupplier.paymentTerms) {
        setPaymentTerms(selectedSupplier.paymentTerms);
      }
    }
  }, [selectedSupplier, isEdit]);

  // Live calculation of financial totals
  const calculation = useMemo(() => {
    const rawItems = lines.filter((l) => l.productId).map((l) => ({
      id: l.id,
      productId: l.productId,
      productCode: l.productCode,
      productName: l.productName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      taxRate: l.taxRate,
      notes: l.notes,
    }));

    return purchaseOrderService.calculateTotals(
      rawItems,
      shippingCharges,
      otherCharges
    );
  }, [lines, shippingCharges, otherCharges]);

  // Line helpers
  const handleProductChange = (lineId: string, productId: string) => {
    const prod = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!prod) return;

    // Check if supplier has negotiated historical price
    let unitPrice = prod.pricing?.costPrice || 1000;
    if (selectedSupplier?.historicalPrices?.[productId]) {
      unitPrice = selectedSupplier.historicalPrices[productId];
    }

    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        return {
          ...line,
          productId: prod.id,
          productCode: prod.sku,
          productName: prod.name,
          unitPrice,
          taxRate: prod.pricing?.taxRatePercentage ?? 18,
        };
      })
    );
  };

  const handleUpdateLine = (lineId: string, updates: Partial<LineFormState>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, ...updates } : l))
    );
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${prev.length}`,
        productId: '',
        productCode: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxRate: 18,
      },
    ]);
  };

  const handleRemoveLine = (lineId: string) => {
    if (lines.length <= 1) {
      toast.error('A Purchase Order must contain at least one line item.');
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const handleSaveOrder = async (submitForApproval: boolean) => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier.');
      return;
    }

    const validLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) {
      toast.error('Please add at least one valid product line with quantity > 0.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        supplierCode: selectedSupplier.code,
        supplierContactPerson: selectedSupplier.contactPerson,
        supplierEmail: selectedSupplier.email,
        supplierPhone: selectedSupplier.phone,
        supplierAddress: selectedSupplier.address,
        supplierVatNumber: selectedSupplier.taxNumber,
        orderDate,
        expectedDeliveryDate,
        paymentTerms,
        currency,
        items: validLines.map((l) => ({
          productId: l.productId,
          productCode: l.productCode,
          productName: l.productName,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discountPercent: Number(l.discountPercent) || 0,
          taxRate: Number(l.taxRate) || 0,
          notes: l.notes,
        })),
        shippingCharges: Number(shippingCharges) || 0,
        otherCharges: Number(otherCharges) || 0,
        notes,
        deliveryInstructions,
        submitForApproval,
      };

      if (isEdit && id) {
        await updatePO(id, payload);
        if (submitForApproval) {
          await purchaseOrderService.submitForApproval(id, {} as any);
        }
        navigate(`/purchasing/orders/${id}`);
      } else {
        const created = await createPO(payload);
        navigate(`/purchasing/orders/${created.id}`);
      }
    } catch (err) {
      // toast shown in hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/purchasing/orders')}
            className="text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft procurement order with line-item discounts, taxes, and internal managerial approval.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => handleSaveOrder(false)}
            className="gap-1.5 text-xs bg-white hover:bg-slate-50"
          >
            <Save className="h-3.5 w-3.5 text-slate-600" />
            <span>Save as Draft</span>
          </Button>

          <Button
            variant="default"
            disabled={submitting}
            onClick={() => handleSaveOrder(true)}
            className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Submit for Approval</span>
          </Button>
        </div>
      </div>

      {/* Supplier & Header Parameters Grid */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span>Vendor & Purchase Order Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Supplier / Vendor <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 bg-white px-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">Select Registered Supplier...</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name} ({sup.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Order Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">PO Issue Date</label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Expected Delivery Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Expected Delivery Date</label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Supplier Auto-Filled Context */}
          {selectedSupplier && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact</span>
                <span className="font-semibold text-slate-800">{selectedSupplier.contactPerson}</span> ({selectedSupplier.phone})
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Terms</span>
                <span className="font-mono text-slate-800">{selectedSupplier.paymentTerms}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tax / VAT No</span>
                <span>{selectedSupplier.taxNumber || 'Non-VAT'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Address</span>
                <span className="truncate block">{selectedSupplier.address || 'Colombo, Sri Lanka'}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Payment Terms</label>
              <Input
                placeholder="e.g. Net 30, Net 15, Advance Prepayment..."
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Currency</label>
              <select
                aria-label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Lines Section */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" />
            <span>Product Line Items</span>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLine}
            className="h-7 text-xs gap-1 bg-white hover:bg-slate-50 text-slate-700"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Product</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[260px]">Product / Description</th>
                  <th className="py-2.5 px-3 w-24 text-right">Quantity</th>
                  <th className="py-2.5 px-3 w-32 text-right">Unit Price ({currency})</th>
                  <th className="py-2.5 px-3 w-20 text-right">Disc %</th>
                  <th className="py-2.5 px-3 w-20 text-right">Tax %</th>
                  <th className="py-2.5 px-3 w-32 text-right">Line Total ({currency})</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => {
                  const lineTotal =
                    (line.quantity * line.unitPrice * (1 - line.discountPercent / 100)) *
                    (1 + line.taxRate / 100);

                  return (
                    <tr key={line.id} className="hover:bg-slate-50/40">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={line.productId}
                          onChange={(e) => handleProductChange(line.id, e.target.value)}
                          className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2 focus:ring-1 focus:ring-slate-400"
                        >
                          <option value="">Select Catalog Product...</option>
                          {MOCK_PRODUCTS.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.sku} - {prod.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          placeholder="Optional line notes (specifications, serial codes)..."
                          value={line.notes || ''}
                          onChange={(e) => handleUpdateLine(line.id, { notes: e.target.value })}
                          className="h-6 text-[10px] mt-1 text-slate-600"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            handleUpdateLine(line.id, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                          }
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) =>
                            handleUpdateLine(line.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })
                          }
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={line.discountPercent}
                          onChange={(e) =>
                            handleUpdateLine(line.id, {
                              discountPercent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                            })
                          }
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={line.taxRate}
                          onChange={(e) =>
                            handleUpdateLine(line.id, {
                              taxRate: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(lineTotal || 0, currency)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
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
        </CardContent>
      </Card>

      {/* Instructions & Financial Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Notes & Receiving Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Internal Order Notes</label>
                <Textarea
                  placeholder="Additional order terms, stock replenishment rationale, project allocation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Delivery Instructions</label>
                <Textarea
                  placeholder="Receiving dock instructions, gate passes, specific timing..."
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="border-slate-200 bg-slate-50/70 shadow-2xs">
            <CardHeader className="p-4 border-b border-slate-200/80">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Purchase Order Totals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({lines.length} lines):</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatCurrency(calculation.subtotal, currency)}
                </span>
              </div>

              {calculation.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Total Line Discounts:</span>
                  <span className="font-mono font-semibold tabular-nums">
                    -{formatCurrency(calculation.totalDiscount, currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Applicable Tax Total (VAT/SSCL):</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatCurrency(calculation.taxTotal, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 gap-2">
                <span>Shipping / Freight ({currency}):</span>
                <Input
                  type="number"
                  min="0"
                  value={shippingCharges}
                  onChange={(e) => setShippingCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-28 h-7 text-xs text-right font-mono bg-white"
                />
              </div>

              <div className="flex items-center justify-between text-slate-600 gap-2">
                <span>Other Handling Charges ({currency}):</span>
                <Input
                  type="number"
                  min="0"
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-28 h-7 text-xs text-right font-mono bg-white"
                />
              </div>

              <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-baseline text-slate-900">
                <span className="font-bold text-sm">Grand Total ({currency}):</span>
                <span className="font-mono font-black text-xl tabular-nums">
                  {formatCurrency(calculation.grandTotal, currency)}
                </span>
              </div>

              {calculation.grandTotal > 500000 && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Orders exceeding {currency} 500,000 equivalent require executive <strong>Director Authorization</strong> under ERP financial delegation rules.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
