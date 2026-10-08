import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { apService, VendorBillLineItem } from '../../services/apService';
import { CurrencyInput } from '../../components/CurrencyInput';
import { DoubleEntryHoverBadge } from '../../components/DoubleEntryHoverBadge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../../components/ui/dialog';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import Decimal from 'decimal.js';
import {
  Warehouse,
  Receipt,
  CheckCircle2,
  Lock,
  RotateCcw,
  Calculator,
  Percent,
  Sliders,
  Landmark,
  Scale,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export function VendorBillCostingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const availableGRNs = useMemo(() => apService.getAvailableGRNs(), []);

  // Selected GRN state
  const [selectedGRNId, setSelectedGRNId] = useState<string>(
    availableGRNs[0]?.id || ''
  );
  const selectedGRN = useMemo(() => {
    return availableGRNs.find((g) => g.id === selectedGRNId) || availableGRNs[0] || null;
  }, [availableGRNs, selectedGRNId]);

  // Existing bill if already costed/posted
  const existingBill = useMemo(() => {
    return selectedGRN ? apService.getBillByGrnId(selectedGRN.id) : undefined;
  }, [selectedGRN]);

  const isAuditLocked = Boolean(selectedGRN?.status === 'COSTED' || existingBill?.status === 'POSTED');
  const isAuthorizedForVoid = !currentUser || ['FINANCE_MANAGER', 'MANAGER', 'DIRECTOR'].includes(currentUser.role);

  // Financial Form Header
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  // Financial Line Items Form Array
  const [lineItems, setLineItems] = useState<VendorBillLineItem[]>([]);
  const [freightCharges, setFreightCharges] = useState<number>(0);
  const [otherLandingCosts, setOtherLandingCosts] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Landed Cost Engine Modal State
  const [showApportionModal, setShowApportionModal] = useState(false);
  const [apportionBulkFreight, setApportionBulkFreight] = useState<number>(0);
  const [apportionMethod, setApportionMethod] = useState<'BY_VALUE' | 'BY_QUANTITY'>('BY_VALUE');

  // Advance Prepayments integration
  const unappliedAdvances = useMemo(() => {
    if (!selectedGRN) return [];
    return apService.getUnappliedAdvancesForSupplier(
      selectedGRN.supplierId || selectedGRN.supplierName
    );
  }, [selectedGRN]);

  const [applyAdvanceEnabled, setApplyAdvanceEnabled] = useState(false);
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string>('');
  const [advanceAmountToApply, setAdvanceAmountToApply] = useState<number>(0);

  // Auto-initialize line items & auto-pull historical purchase price from Supplier Master
  useEffect(() => {
    if (existingBill) {
      setVendorInvoiceNumber(existingBill.vendorInvoiceNumber);
      setInvoiceDate(existingBill.invoiceDate);
      setDueDate(existingBill.dueDate);
      setFreightCharges(existingBill.freightCharges);
      setOtherLandingCosts(existingBill.otherLandingCosts);
      setLineItems(existingBill.lineItems);
    } else if (selectedGRN) {
      setVendorInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      const items: VendorBillLineItem[] = selectedGRN.items.map((item, idx) => {
        // Auto-pull last known historical purchase price from Supplier Master
        const histPrice = apService.getHistoricalPurchasePrice(
          selectedGRN.supplierId || selectedGRN.supplierName,
          item.productId
        );
        const actualCost = histPrice > 0 ? histPrice : (item.unitCostSnapshot || 0);
        const qty = item.receivedQuantity || 1;
        const discount = 0;
        const net = new Decimal(qty).times(actualCost).minus(discount);
        const vat = net.times(0.18).toNumber();

        return {
          id: `line-${idx}`,
          productId: item.productId,
          productName: item.productNameSnapshot,
          sku: item.skuSnapshot,
          receivedQuantity: qty,
          draftUnitCost: item.unitCostSnapshot || actualCost,
          unitCost: actualCost,
          historicalPurchasePrice: histPrice,
          lineDiscount: 0,
          vatCode: 'STANDARD_18',
          vatAmount: vat,
          lineTotal: net.plus(vat).toNumber(),
          apportionedFreight: 0,
          landedUnitCost: actualCost,
        };
      });
      setLineItems(items);
      setFreightCharges(0);
      setOtherLandingCosts(0);
      setApportionBulkFreight(0);
    }
  }, [selectedGRN, existingBill]);

  // Update advance selection when unapplied advances change
  useEffect(() => {
    if (unappliedAdvances.length > 0) {
      setSelectedAdvanceId(unappliedAdvances[0].id);
      setAdvanceAmountToApply(unappliedAdvances[0].unappliedBalance);
    } else {
      setSelectedAdvanceId('');
      setAdvanceAmountToApply(0);
      setApplyAdvanceEnabled(false);
    }
  }, [unappliedAdvances]);

  // Handler for line item updates
  const updateLineItem = (index: number, field: keyof VendorBillLineItem, val: any) => {
    if (isAuditLocked) return;
    setLineItems((prev) => {
      const next = [...prev];
      const current = { ...next[index], [field]: val };

      const qty = new Decimal(current.receivedQuantity || 0);
      const cost = new Decimal(current.unitCost || 0);
      const discount = new Decimal(current.lineDiscount || 0);
      const net = Decimal.max(0, qty.times(cost).minus(discount));

      const vat = current.vatCode === 'STANDARD_18' ? net.times(0.18) : new Decimal(0);
      current.vatAmount = vat.toNumber();
      current.lineTotal = net.plus(vat).toNumber();

      // Recalculate landed unit cost if apportioned freight is present
      const lineFreight = new Decimal(current.apportionedFreight || 0);
      current.landedUnitCost = qty.isZero()
        ? 0
        : net.plus(lineFreight).dividedBy(qty).toDecimalPlaces(2).toNumber();

      next[index] = current;
      return next;
    });
  };

  // Reset line item to historical purchase price from Supplier Master
  const resetToHistoricalCost = (index: number) => {
    if (isAuditLocked) return;
    const hist = lineItems[index]?.historicalPurchasePrice;
    if (hist && hist > 0) {
      updateLineItem(index, 'unitCost', hist);
      toast.info(`Reset ${lineItems[index].productName} to historical master price of ${formatCurrency(hist)}`);
    }
  };

  // Calculations for summary totals
  const { subtotal, vatTotal, grandTotal } = useMemo(() => {
    let sub = new Decimal(0);
    let vat = new Decimal(0);

    for (const item of lineItems) {
      const net = Decimal.max(
        0,
        new Decimal(item.receivedQuantity).times(new Decimal(item.unitCost)).minus(item.lineDiscount || 0)
      );
      sub = sub.plus(net);
      vat = vat.plus(item.vatAmount || 0);
    }

    const landed = sub.plus(freightCharges || 0).plus(otherLandingCosts || 0);
    const grand = landed.plus(vat);

    return {
      subtotal: sub.toNumber(),
      vatTotal: vat.toNumber(),
      grandTotal: grand.toNumber(),
    };
  }, [lineItems, freightCharges, otherLandingCosts]);

  // Landed Cost Apportionment Engine
  const previewApportionment = useMemo(() => {
    return apService.apportionFreight(lineItems, apportionBulkFreight, apportionMethod);
  }, [lineItems, apportionBulkFreight, apportionMethod]);

  const handleApplyApportionment = () => {
    if (apportionBulkFreight < 0) {
      toast.error('Bulk freight amount cannot be negative');
      return;
    }
    const apportionedItems = apService.apportionFreight(lineItems, apportionBulkFreight, apportionMethod);
    setLineItems(apportionedItems);
    setFreightCharges(apportionBulkFreight);
    setShowApportionModal(false);
    toast.success(
      `Freight of ${formatCurrency(apportionBulkFreight)} successfully apportioned across ${lineItems.length} line items by ${
        apportionMethod === 'BY_VALUE' ? 'Net Line Value' : 'Received Quantity'
      }. True landed unit costs calculated.`
    );
  };

  // Validation: header inputs required, valid costs
  const isFormValid = useMemo(() => {
    if (!selectedGRN) return false;
    if (!vendorInvoiceNumber.trim()) return false;
    if (!invoiceDate || !dueDate) return false;
    if (lineItems.length === 0) return false;
    return lineItems.every((item) => item.unitCost > 0);
  }, [selectedGRN, vendorInvoiceNumber, invoiceDate, dueDate, lineItems]);

  const handlePostVendorBill = async () => {
    if (!isFormValid || !selectedGRN) {
      toast.error('Please complete all required fields and enter valid costs.');
      return;
    }

    try {
      setSubmitting(true);
      const bill = await apService.postVendorBill({
        grnId: selectedGRN.id,
        vendorInvoiceNumber: vendorInvoiceNumber.trim(),
        invoiceDate,
        dueDate,
        lineItems,
        freightCharges,
        otherLandingCosts,
        applyAdvanceId: applyAdvanceEnabled ? selectedAdvanceId : undefined,
        advanceAmountToApply: applyAdvanceEnabled ? advanceAmountToApply : undefined,
      });

      toast.success(
        `Vendor Bill ${bill.billNumber} posted successfully! True landed cost recorded and debited to 1025 Input VAT Receivable.`
      );
      navigate('/finance/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post vendor bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidVendorBill = async () => {
    if (!selectedGRN) return;
    try {
      setSubmitting(true);
      await apService.voidVendorBill(existingBill?.id || selectedGRN.id);
      toast.success(
        `Vendor Bill ${existingBill?.billNumber || ''} voided and reversed successfully! GRN returned to APPROVED status.`
      );
      navigate('/finance/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to void vendor bill');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Vendor Bill Processing (GRN Costing)
            </h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Accounts Payable
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Finance verification and landed costing after physical warehouse goods receipt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/ap/advances')}
            className="gap-1.5 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <Landmark className="h-3.5 w-3.5 text-emerald-600" />
            <span>Supplier Advances</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/ap/debit-notes')}
            className="gap-1.5 text-xs border-rose-300 text-rose-800 hover:bg-rose-50"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
            <span>Supplier Debit Notes</span>
          </Button>

          {/* GRN Selection Queue Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Inbound GRN:
            </label>
            <Select
              value={selectedGRNId}
              onChange={(e) => setSelectedGRNId(e.target.value)}
              className="text-xs h-9 min-w-56"
            >
              {availableGRNs.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.grnNumber} - {g.supplierName} ({g.status})
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Split-Screen Design: Left Pane (Read-Only Warehouse Data) & Right Pane (Editable Financial Data) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane (Read-Only Warehouse Data) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 border-slate-200 bg-slate-50/70 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Warehouse className="h-4 w-4 text-primary" />
                <span>Warehouse Goods Receipt (Read-Only)</span>
              </div>
              <Badge variant="outline" className="text-xs font-semibold bg-white">
                {selectedGRN?.status || 'SUBMITTED'}
              </Badge>
            </div>

            {selectedGRN ? (
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Supplier Name
                  </span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedGRN.supplierName}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                      GRN Reference
                    </span>
                    <span className="font-mono font-semibold text-slate-700">
                      {selectedGRN.grnNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                      Received Warehouse
                    </span>
                    <span className="font-semibold text-slate-700">
                      {selectedGRN.warehouseId}
                    </span>
                  </div>
                </div>

                {selectedGRN.submittedAt && (
                  <div className="pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                      Received Date
                    </span>
                    <span className="text-slate-700">
                      {formatDate(selectedGRN.submittedAt)}
                    </span>
                  </div>
                )}

                {/* Warehouse Physical Line Items */}
                <div className="pt-3 border-t border-slate-200">
                  <span className="text-slate-600 font-bold block mb-2">
                    Verified Physical Inbound Quantities:
                  </span>
                  <div className="space-y-2">
                    {selectedGRN.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-200/80 bg-white p-3 space-y-1 shadow-2xs"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-semibold text-slate-800">{item.productNameSnapshot}</span>
                          <span className="font-mono text-xs font-bold text-primary tabular-nums">
                            {item.receivedQuantity} units
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>SKU: {item.skuSnapshot}</span>
                          {item.damagedQuantity > 0 && (
                            <span className="text-rose-600 font-semibold">
                              Damaged: {item.damagedQuantity}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs py-4 text-center">
                No GRN selected
              </p>
            )}
          </Card>
        </div>

        {/* Right Pane (Editable Financial Data or Audit Locked) */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="p-5 border-slate-200 shadow-xs bg-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Receipt className="h-4 w-4 text-primary" />
                <span>Vendor Invoice & Costing Details</span>
              </div>
              {isAuditLocked && (
                <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-800 border-amber-300 text-xs font-semibold">
                  <Lock className="h-3 w-3" />
                  <span>Audit Locked (POSTED)</span>
                </Badge>
              )}
            </div>

            {/* Audit Lock Warning Banner */}
            {isAuditLocked && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 flex items-center justify-between text-amber-900 animate-in fade-in-50">
                <div className="flex items-center gap-2.5">
                  <Lock className="h-4 w-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="font-bold text-xs uppercase tracking-wide block">
                      Audit Lock Active: Transaction Cleared & Costed (Read-Only)
                    </span>
                    <span className="text-xs text-amber-800">
                      This Vendor Bill has been posted to the General Ledger. All financial inputs are locked against modification.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Header: Vendor Invoice Number, Invoice Date, Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendor Invoice # <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={vendorInvoiceNumber}
                  onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-SCH-90214"
                  className="h-9 text-xs font-mono"
                  disabled={isAuditLocked}
                  readOnly={isAuditLocked}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="h-9 text-xs"
                  disabled={isAuditLocked}
                  readOnly={isAuditLocked}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                  disabled={isAuditLocked}
                  readOnly={isAuditLocked}
                  required
                />
              </div>
            </div>

            {/* Line Items Dynamic Form Array */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Costing Breakdown per Item
                </span>
                <span className="text-[11px] text-slate-400">
                  Historical prices auto-pulled from Supplier Master
                </span>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => {
                  const hist = item.historicalPurchasePrice || 0;
                  const priceDiff = item.unitCost - hist;
                  const hasVariance = hist > 0 && Math.abs(priceDiff) > 0.01;

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              {item.productName}
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-slate-100 font-mono">
                              {item.sku}
                            </Badge>
                          </div>
                          {/* Historical price auto-pull display */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-slate-500 font-medium">
                              Last Historical Price:
                            </span>
                            <span className="text-[11px] font-mono font-semibold text-primary">
                              {hist > 0 ? formatCurrency(hist) : 'No prior history'}
                            </span>
                            <span className="text-[10px] text-slate-400">(Supplier Master)</span>

                            {hasVariance && (
                              <div className="flex items-center gap-1.5 ml-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] py-0 px-1.5 ${
                                    priceDiff > 0
                                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  }`}
                                >
                                  {priceDiff > 0 ? `+${formatCurrency(priceDiff)}` : formatCurrency(priceDiff)}
                                </Badge>
                                {!isAuditLocked && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => resetToHistoricalCost(index)}
                                    className="h-5 text-[10px] px-1 text-primary hover:text-primary-hover hover:underline"
                                  >
                                    Reset to Master
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-slate-900 tabular-nums block">
                            Total: {formatCurrency(item.lineTotal)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {item.receivedQuantity} received units
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Base Unit Cost <span className="text-rose-500">*</span>
                          </label>
                          <CurrencyInput
                            value={item.unitCost}
                            onChange={(val) => updateLineItem(index, 'unitCost', val)}
                            placeholder="0.00"
                            disabled={isAuditLocked || submitting}
                            readOnly={isAuditLocked}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Line Discount (LKR)
                          </label>
                          <CurrencyInput
                            value={item.lineDiscount}
                            onChange={(val) => updateLineItem(index, 'lineDiscount', val)}
                            placeholder="0.00"
                            disabled={isAuditLocked || submitting}
                            readOnly={isAuditLocked}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            VAT Code
                          </label>
                          <Select
                            value={item.vatCode}
                            onChange={(e) =>
                              updateLineItem(index, 'vatCode', e.target.value)
                            }
                            disabled={isAuditLocked || submitting}
                            className="h-9 text-xs"
                          >
                            <option value="STANDARD_18">Standard VAT (18%)</option>
                            <option value="EXEMPT">Exempt / Zero-Rated</option>
                          </Select>
                        </div>
                      </div>

                      {/* Landed Cost Breakdown Display if freight is apportioned */}
                      {(item.apportionedFreight || 0) > 0 && (
                        <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs bg-slate-100/60 rounded px-2.5 py-1.5 font-mono">
                          <span className="text-slate-600 text-[11px]">
                            Apportioned Freight: +{formatCurrency(item.apportionedFreight || 0)} (+{formatCurrency((item.apportionedFreight || 0) / (item.receivedQuantity || 1))}/unit)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700 text-[11px]">True Landed Unit Cost:</span>
                            <span className="font-bold text-primary text-xs">
                              {formatCurrency(item.landedUnitCost || item.unitCost)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Landed Cost Engine: Apportion Freight Tool & Additional Landing Costs */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Additional Landed Charges (Landed Cost Engine - Capitalized to Inventory)
                </span>
                {!isAuditLocked && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setApportionBulkFreight(freightCharges || 0);
                      setShowApportionModal(true);
                    }}
                    className="h-7 text-xs gap-1.5 bg-primary-light text-primary-text border-primary-border hover:bg-primary-light/80 font-semibold"
                  >
                    <Calculator className="h-3.5 w-3.5" />
                    <span>Apportion Freight Tool</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Freight Charges (LKR)
                  </label>
                  <CurrencyInput
                    value={freightCharges}
                    onChange={(val) => {
                      setFreightCharges(val);
                      // Auto distribute if freight is directly edited
                      if (val > 0) {
                        const apportioned = apService.apportionFreight(lineItems, val, apportionMethod);
                        setLineItems(apportioned);
                      }
                    }}
                    placeholder="0.00"
                    disabled={isAuditLocked || submitting}
                    readOnly={isAuditLocked}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Use Apportion Freight tool above to distribute across line items
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Other Landing Costs (Customs / Handling)
                  </label>
                  <CurrencyInput
                    value={otherLandingCosts}
                    onChange={(val) => setOtherLandingCosts(val)}
                    placeholder="0.00"
                    disabled={isAuditLocked || submitting}
                    readOnly={isAuditLocked}
                  />
                </div>
              </div>
            </div>

            {/* Advance Prepayments Application Banner */}
            {unappliedAdvances.length > 0 && !isAuditLocked && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 space-y-3 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900">
                      Supplier Advance Prepayment Available
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-300 text-[11px] font-mono">
                    Unapplied: {formatCurrency(unappliedAdvances[0].unappliedBalance)}
                  </Badge>
                </div>

                <p className="text-xs text-emerald-800">
                  Prepayment {unappliedAdvances[0].advanceNumber} (Ref: {unappliedAdvances[0].reference}) can be drawn down to offset this vendor bill commitment.
                </p>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-emerald-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyAdvanceEnabled}
                      onChange={(e) => setApplyAdvanceEnabled(e.target.checked)}
                      className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Apply Advance Prepayment to this Bill</span>
                  </label>

                  {applyAdvanceEnabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-800 font-semibold">Amount to Draw:</span>
                      <div className="w-36">
                        <CurrencyInput
                          value={advanceAmountToApply}
                          onChange={(val) => setAdvanceAmountToApply(Math.min(val, unappliedAdvances[0].unappliedBalance))}
                          max={unappliedAdvances[0].unappliedBalance}
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Financial Summary Box */}
            <div className="rounded-lg border border-primary-border/60 bg-primary-light/40 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Net Subtotal:</span>
                <span className="font-mono font-semibold tabular-nums text-slate-800">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Freight & Landed Additions:</span>
                <span className="font-mono font-semibold tabular-nums text-slate-800">
                  {formatCurrency((freightCharges || 0) + (otherLandingCosts || 0))}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>1025 Input VAT Receivable (Asset):</span>
                <span className="font-mono font-semibold tabular-nums text-slate-800">
                  {formatCurrency(vatTotal)}
                </span>
              </div>
              <div className="pt-2 border-t border-primary-border/80 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Accounts Payable Commitment:</span>
                <span className="font-mono text-primary text-base tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {applyAdvanceEnabled && advanceAmountToApply > 0 && (
                <div className="pt-2 border-t border-emerald-200 flex justify-between text-xs font-bold text-emerald-900">
                  <span>Less Prepayment Advance Drawn:</span>
                  <span className="font-mono text-emerald-700 tabular-nums">
                    -{formatCurrency(advanceAmountToApply)}
                  </span>
                </div>
              )}

              {applyAdvanceEnabled && advanceAmountToApply > 0 && (
                <div className="flex justify-between text-xs font-bold text-slate-900">
                  <span>Net Payable Balance Due to Supplier:</span>
                  <span className="font-mono text-slate-900 tabular-nums">
                    {formatCurrency(Math.max(0, grandTotal - advanceAmountToApply))}
                  </span>
                </div>
              )}
            </div>

            {/* Footer Action: Void/Reverse button if Audit Locked; Post Vendor Bill if New/Editable */}
            <div className="pt-2 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/finance/dashboard')}
              >
                Cancel
              </Button>

              {isAuditLocked ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 italic">
                    {isAuthorizedForVoid ? 'Authorized role detected:' : 'Read-only mode active.'}
                  </span>
                  {isAuthorizedForVoid && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleVoidVendorBill}
                      disabled={submitting}
                      className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{submitting ? 'Reversing...' : 'Void / Reverse Vendor Bill'}</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePostVendorBill}
                    disabled={!isFormValid || submitting}
                    className="gap-2 bg-primary hover:bg-primary-hover text-white shadow-xs font-semibold"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{submitting ? 'Posting Double-Entry...' : 'Post Vendor Bill'}</span>
                  </Button>

                  <DoubleEntryHoverBadge
                    title="GRN Vendor Bill Costing Impact"
                    description="Posting this vendor bill commits landed cost & VAT to General Ledger:"
                    lines={[
                      {
                        accountCode: '1100',
                        accountName: 'Merchandise Inventory (Landed Cost)',
                        type: 'DEBIT',
                        amount: subtotal + (freightCharges || 0) + (otherLandingCosts || 0),
                      },
                      ...(vatTotal > 0
                        ? [
                            {
                              accountCode: '1025',
                              accountName: 'Input VAT Receivable (18%)',
                              type: 'DEBIT' as const,
                              amount: vatTotal,
                            },
                          ]
                        : []),
                      {
                        accountCode: '2010',
                        accountName: `Accounts Payable (${selectedGRN?.supplierName || 'Trade Creditors'})`,
                        type: 'CREDIT',
                        amount: grandTotal,
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Landed Cost Engine: Apportion Freight Modal */}
      <Dialog open={showApportionModal} onOpenChange={setShowApportionModal}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Calculator className="h-5 w-5 text-primary" />
              <span>Landed Cost Engine: Apportion Freight</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Distribute bulk shipping and freight charges across line items to establish true landed unit cost.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bulk Freight Amount (LKR)
                </label>
                <CurrencyInput
                  value={apportionBulkFreight}
                  onChange={(val) => setApportionBulkFreight(val)}
                  placeholder="0.00"
                  className="bg-white h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Apportionment Method
                </label>
                <Select
                  value={apportionMethod}
                  onChange={(e) => setApportionMethod(e.target.value as 'BY_VALUE' | 'BY_QUANTITY')}
                  className="bg-white h-9 text-xs"
                >
                  <option value="BY_VALUE">By Line Value (Proportional to Net Value)</option>
                  <option value="BY_QUANTITY">By Quantity (Proportional to Units)</option>
                </Select>
              </div>
            </div>

            {/* Live Distribution Preview Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-left">Item</th>
                    <th className="py-2 px-2 text-right">Units</th>
                    <th className="py-2 px-2 text-right">Base Cost</th>
                    <th className="py-2 px-2 text-right">Apportioned Freight</th>
                    <th className="py-2 px-3 text-right">True Landed Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewApportionment.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-800 block truncate max-w-[160px]">
                          {item.productName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.sku}</span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-medium">{item.receivedQuantity}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatCurrency(item.unitCost)}</td>
                      <td className="py-2 px-2 text-right font-mono text-primary font-semibold">
                        +{formatCurrency(item.apportionedFreight || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.landedUnitCost || item.unitCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowApportionModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApplyApportionment}
              className="bg-primary hover:bg-primary-hover text-white gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Apply Apportionment</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
