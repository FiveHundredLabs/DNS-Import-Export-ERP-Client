import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { invoiceService } from '../../services/InvoiceService';
import { productService } from '../../services/ProductService';
import { batchInventoryService } from '../../services/BatchInventoryService';
import { useAuth } from '../../hooks/useAuth';
import { Invoice, InvoiceItem } from '../../types/invoice';
import { Product } from '../../types/product';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Package,
  Layers,
  FileText
} from 'lucide-react';

export function InvoiceDraftEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Add Item Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [addUnitPrice, setAddUnitPrice] = useState<number>(0);
  const [addDiscountPct, setAddDiscountPct] = useState<number>(0);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  const activeRole = currentUser?.role || role;
  const isSalesManager = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'].includes(activeRole);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        const [inv, prodsResult] = await Promise.all([
          invoiceService.getInvoiceById(id),
          productService.listProducts({ limit: 100 }),
        ]);

        if (inv) {
          setInvoice(inv);
          setItems(inv.items || []);
        }
        if (prodsResult && prodsResult.data) {
          setAllProducts(prodsResult.data);
        }
      } catch (err) {
        console.error('Failed to load draft invoice:', err);
        toast.error('Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Recalculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPriceSnapshot, 0);
  const discountTotal = items.reduce(
    (sum, item) => sum + (item.quantity * item.unitPriceSnapshot * (item.discountPercentage || 0)) / 100,
    0
  );
  const taxableBase = Math.max(0, subtotal - discountTotal);
  const taxRate = invoice?.taxRatePercentage || (invoice?.taxEnabled ? 15 : 0);
  const taxTotal = (taxableBase * taxRate) / 100;
  const totalAmount = taxableBase + taxTotal;

  // Helper to determine available stock for a product or specific batch
  const getAvailableQuantityForItem = (item: { productId: string; batchId?: string }) => {
    if (item.batchId && item.batchId !== 'DEFAULT') {
      const batch = batchInventoryService.getBatchById(item.batchId);
      if (batch) return batch.availableQuantity;
    }
    const prod = allProducts.find((p) => p.id === item.productId);
    if (prod) {
      return Math.max(0, (prod.stockOnHand ?? 0) - (prod.damagedStock ?? 0));
    }
    return 0;
  };

  // Handlers for Line Items
  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const itm = items[index];
    const available = getAvailableQuantityForItem(itm);
    if (available > 0 && newQty > available) {
      toast.warning(
        `Quantity cannot exceed available stock (${available} ${itm.uomSnapshot || 'units'}).`
      );
    }
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], quantity: newQty };
      const gross = item.quantity * item.unitPriceSnapshot;
      const discount = (gross * (item.discountPercentage || 0)) / 100;
      const net = Math.max(0, gross - discount);
      const tax = (net * (item.taxPercentage || 0)) / 100;
      item.discountAmount = discount;
      item.taxAmount = tax;
      item.lineTotal = net + tax;
      copy[index] = item;
      return copy;
    });
  };

  const handleDiscountChange = (index: number, newDiscountPct: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(newDiscountPct) ? 0 : newDiscountPct));
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], discountPercentage: clamped };
      const gross = item.quantity * item.unitPriceSnapshot;
      const discount = (gross * clamped) / 100;
      const net = Math.max(0, gross - discount);
      const itemTaxRate = invoice?.taxRatePercentage || (invoice?.taxEnabled ? 15 : 0);
      const tax = (net * itemTaxRate) / 100;
      item.discountAmount = discount;
      item.taxAmount = tax;
      item.taxPercentage = itemTaxRate;
      item.lineTotal = net + tax;
      copy[index] = item;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('Invoice must contain at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    toast.info('Item removed from draft invoice');
  };

  const handleProductSelectChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = allProducts.find((p) => p.id === prodId);
    if (prod) {
      const batches = batchInventoryService.getActiveBatches(prodId);
      if (batches.length > 0) {
        setSelectedBatchId(batches[0].id);
        setAddUnitPrice(batches[0].sellingPrice);
      } else {
        setSelectedBatchId('');
        setAddUnitPrice(prod.pricing?.currentSellingPrice || 0);
      }
    }
  };

  const handleBatchSelectChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    if (batchId === 'DEFAULT') {
      const prod = allProducts.find((p) => p.id === selectedProductId);
      setAddUnitPrice(prod?.pricing?.currentSellingPrice || 0);
    } else {
      const batch = batchInventoryService.getBatchById(batchId);
      if (batch) {
        setAddUnitPrice(batch.sellingPrice);
      }
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId) {
      toast.error('Please select a product to add.');
      return;
    }
    const prod = allProducts.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const availableToAdd =
      selectedBatchId && selectedBatchId !== 'DEFAULT'
        ? (batchInventoryService.getBatchById(selectedBatchId)?.availableQuantity ?? 0)
        : Math.max(0, (prod.stockOnHand ?? 0) - (prod.damagedStock ?? 0));

    if (availableToAdd > 0 && addQuantity > availableToAdd) {
      toast.error(
        `Quantity (${addQuantity}) cannot exceed available stock (${availableToAdd} ${prod.uomCode || 'units'}).`
      );
      return;
    }

    const gross = addQuantity * addUnitPrice;
    const discount = (gross * addDiscountPct) / 100;
    const net = Math.max(0, gross - discount);
    const itemTaxRate = invoice?.taxRatePercentage || 0;
    const tax = (net * itemTaxRate) / 100;

    const chosenBatch =
      selectedBatchId && selectedBatchId !== 'DEFAULT'
        ? batchInventoryService.getBatchById(selectedBatchId)
        : undefined;

    const newItem: InvoiceItem = {
      id: `draft-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: prod.id,
      productNameSnapshot: prod.name,
      skuSnapshot: prod.sku,
      unitPriceSnapshot: addUnitPrice,
      quantity: addQuantity,
      discountPercentage: addDiscountPct,
      discountAmount: discount,
      taxPercentage: itemTaxRate,
      taxAmount: tax,
      lineTotal: net + tax,
      uomSnapshot: prod.uomCode || 'Unit',
      batchId: chosenBatch?.id,
      batchNumber: chosenBatch?.batchNumber,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedProductId('');
    setAddQuantity(1);
    setAddUnitPrice(0);
    setAddDiscountPct(0);
    setSelectedBatchId('');
    toast.success(`Added ${prod.name} to draft invoice.`);
  };

  const handleSaveDraft = async () => {
    if (!invoice || !id) return;
    if (!currentUser) {
      toast.error('Authentication required to save draft');
      return;
    }

    // Available stock validation
    for (const it of items) {
      const avail = getAvailableQuantityForItem(it);
      if (avail > 0 && it.quantity > avail) {
        toast.error(
          `Cannot save draft: Quantity for "${it.productNameSnapshot}" (${it.quantity}) cannot exceed available stock (${avail}).`
        );
        return;
      }
    }

    try {
      setSaving(true);
      await invoiceService.updateDraftInvoiceItems(id, items, currentUser);
      toast.success('Draft invoice line items updated successfully');
    } catch (err: any) {
      console.error('Failed to update draft items:', err);
      toast.error(err.message || 'Failed to update draft invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeAndIssue = async () => {
    if (!invoice || !id) return;
    if (!currentUser) {
      toast.error('Authentication required to finalize invoice');
      return;
    }

    // Available stock validation
    for (const it of items) {
      const avail = getAvailableQuantityForItem(it);
      if (avail > 0 && it.quantity > avail) {
        toast.error(
          `Cannot finalize: Quantity for "${it.productNameSnapshot}" (${it.quantity}) cannot exceed available stock (${avail}).`
        );
        return;
      }
    }

    try {
      setFinalizing(true);
      // First persist any current item adjustments
      await invoiceService.updateDraftInvoiceItems(id, items, currentUser);
      // Then finalize and transition to ISSUED
      await invoiceService.finalizeAndIssueInvoice(id, currentUser);
      toast.success('Invoice finalized and issued successfully!');
      navigate(`/invoices/${id}`);
    } catch (err: any) {
      console.error('Failed to finalize draft invoice:', err);
      toast.error(err.message || 'Failed to finalize invoice');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return <TableLoadingSkeleton />;
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <h2 className="text-base font-bold text-slate-900">Draft Invoice Not Found</h2>
        <Link to="/invoices" className="text-primary text-xs font-semibold underline mt-4 block">
          Return to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link to={`/invoices/${invoice.id}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> Back to Invoice
            </Button>
          </Link>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-900">{invoice.invoiceNumber}</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              DRAFT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={saving || finalizing || !isSalesManager}
            className="text-xs gap-1.5 border-slate-300"
          >
            <Save className="h-3.5 w-3.5 text-slate-600" />
            {saving ? 'Saving...' : 'Save Draft Changes'}
          </Button>

          <Button
            size="sm"
            onClick={handleFinalizeAndIssue}
            disabled={saving || finalizing || !isSalesManager}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm font-semibold"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {finalizing ? 'Finalizing...' : 'Finalize & Issue'}
          </Button>
        </div>
      </div>

      {/* Role Permission Alert */}
      {!isSalesManager ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-900">Sales Manager Authority Required</h4>
            <p className="mt-0.5 text-rose-700">
              Only users with the <strong>SALES_MANAGER</strong> role can modify draft invoice line items or finalize and issue the invoice.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900 flex items-start gap-3">
          <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-amber-950">Sales Manager Line Item Review Mode</h4>
            <p className="text-amber-800">
              Adjust product quantities, add replacement products, or remove items before finalizing the invoice. All pricing and tax totals update immediately.
            </p>
          </div>
        </div>
      )}

      {/* Invoice Overview Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Customer</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{invoice.customerName}</span>
              <span className="font-mono text-slate-500 text-[11px]">{invoice.customerCode}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Order Reference</span>
              <span className="font-mono font-bold text-primary text-sm mt-0.5 block">{invoice.orderNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Issue Date</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{invoice.issueDate}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Sales Representative</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{invoice.salesRepName}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Draft Invoice Line Items</CardTitle>
            <p className="text-xs text-slate-500">Edit quantities or delete line items as needed.</p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-600">Product / SKU</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-center w-28">Quantity</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-right">Unit Price</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-center">Discount</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-right">Line Total</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-center w-16">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const available = getAvailableQuantityForItem(item);
                const isExceeding = available > 0 && item.quantity > available;

                return (
                  <TableRow key={item.id || index} className="hover:bg-slate-50/60">
                    <TableCell className="py-3">
                      <div className="font-bold text-slate-900 text-xs">{item.productNameSnapshot}</div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {item.skuSnapshot}
                        {item.batchNumber && (
                          <span className="ml-2 text-indigo-600 font-semibold">• Batch: {item.batchNumber}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-2 align-top">
                      <input
                        type="number"
                        min="1"
                        max={available > 0 ? available : undefined}
                        value={item.quantity}
                        disabled={!isSalesManager}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                        className={cn(
                          'w-20 text-center font-mono font-bold text-xs py-1 px-2 border rounded-md focus:ring-1 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400',
                          isExceeding
                            ? 'border-rose-500 bg-rose-50 text-rose-800 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-primary'
                        )}
                      />
                      <span
                        className={cn(
                          'text-[9.5px] block mt-0.5 font-mono whitespace-nowrap',
                          isExceeding ? 'text-rose-600 font-bold' : 'text-slate-400'
                        )}
                      >
                        {isExceeding ? `Exceeds (${available})` : `Max: ${available}`}
                      </span>
                    </TableCell>
                  <TableCell className="text-right font-mono text-xs text-slate-700 py-3">
                    {formatCurrency(item.unitPriceSnapshot)}
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <div className="inline-flex items-center gap-1 justify-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={item.discountPercentage ?? 0}
                        disabled={!isSalesManager}
                        onChange={(e) => handleDiscountChange(index, parseFloat(e.target.value))}
                        className="w-16 text-center font-mono font-bold text-xs py-1 px-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <span className="text-xs text-slate-500 font-bold">%</span>
                    </div>
                    {item.discountAmount > 0 && (
                      <div className="text-[10px] text-amber-700 font-mono mt-0.5">
                        -{formatCurrency(item.discountAmount)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-xs text-slate-900 py-3">
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      disabled={!isSalesManager}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Product Section (Only for Sales Manager) */}
      {isSalesManager && (
        <Card className="border-indigo-100 bg-indigo-50/30 shadow-xs">
          <CardHeader className="p-4 border-b border-indigo-100/60">
            <CardTitle className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              Add Product to Draft Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Select Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelectChange(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Product --</option>
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProductId && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Available Batch</label>
                  <select
                    value={selectedBatchId || 'DEFAULT'}
                    onChange={(e) => handleBatchSelectChange(e.target.value)}
                    className="w-full text-xs py-2 px-3 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  >
                    {batchInventoryService.getActiveBatches(selectedProductId).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} (Avail: {b.availableQuantity}, LKR {b.sellingPrice})
                      </option>
                    ))}
                    <option value="DEFAULT">
                      Catalog Default Price (LKR {allProducts.find((p) => p.id === selectedProductId)?.pricing?.currentSellingPrice || 0})
                    </option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 block">Quantity</label>
                  {selectedProductId && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      Avail:{' '}
                      {selectedBatchId && selectedBatchId !== 'DEFAULT'
                        ? (batchInventoryService.getBatchById(selectedBatchId)?.availableQuantity ?? 0)
                        : Math.max(
                            0,
                            ((allProducts.find((p) => p.id === selectedProductId)?.stockOnHand ?? 0) -
                              (allProducts.find((p) => p.id === selectedProductId)?.damagedStock ?? 0))
                          )}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs py-2 px-3 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Unit Price (LKR)</label>
                <input
                  type="number"
                  value={addUnitPrice}
                  onChange={(e) => setAddUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs py-2 px-3 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={addDiscountPct}
                  onChange={(e) => setAddDiscountPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                  className="w-full text-xs py-2 px-3 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  placeholder="0%"
                />
              </div>

              <div className="sm:col-span-1">
                <Button
                  onClick={handleAddItem}
                  disabled={!selectedProductId}
                  className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-[38px] gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary Card */}
      <div className="flex flex-col sm:flex-row justify-end">
        <div className="w-full sm:w-96 rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
            Recalculated Financial Summary
          </h4>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Subtotal</span>
            <span className="font-mono font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-xs text-amber-700">
              <span>Total Discount</span>
              <span className="font-mono font-semibold">-{formatCurrency(discountTotal)}</span>
            </div>
          )}
          {invoice.taxEnabled && (
            <div className="flex justify-between text-xs text-slate-600">
              <span>VAT ({taxRate}%)</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrency(taxTotal)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Total Invoice Amount</span>
            <span className="font-mono text-base font-black text-emerald-700">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceDraftEditPage;
