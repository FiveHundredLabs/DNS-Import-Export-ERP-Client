import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { apService, VendorBillLineItem } from '../../services/apService';
import { CurrencyInput } from '../../components/CurrencyInput';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import Decimal from 'decimal.js';
import {
  Warehouse,
  Receipt,
  CheckCircle2,
  Lock,
  RotateCcw,
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

  // Initialize line items whenever selected GRN changes
  // Initialize line items and header whenever selected GRN changes
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
        const draftCost = item.unitCostSnapshot || 0;
        const qty = item.receivedQuantity || 1;
        const discount = 0;
        const net = new Decimal(qty).times(draftCost).minus(discount);
        const vat = net.times(0.18).toNumber();

        return {
          id: `line-${idx}`,
          productId: item.productId,
          productName: item.productNameSnapshot,
          sku: item.skuSnapshot,
          receivedQuantity: qty,
          draftUnitCost: draftCost,
          unitCost: draftCost,
          lineDiscount: 0,
          vatCode: 'STANDARD_18',
          vatAmount: vat,
          lineTotal: net.plus(vat).toNumber(),
        };
      });
      setLineItems(items);
      setFreightCharges(0);
      setOtherLandingCosts(0);
    }
  }, [selectedGRN, existingBill]);

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

      next[index] = current;
      return next;
    });
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
      });

      toast.success(
        `Vendor Bill ${bill.billNumber} posted successfully! GRN marked as COSTED and GL double-entry recorded.`
      );
      navigate('/finance/desk');
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
      navigate('/finance/desk');
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

        {/* GRN Selection Queue Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Select Inbound GRN:
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
                            <span className="text-rose-600">
                              Damaged: {item.damagedQuantity}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                          <span>Draft Unit Cost (Stock Keeper Ref):</span>
                          <span className="font-mono font-medium text-slate-700 tabular-nums">
                            {formatCurrency(item.unitCostSnapshot || 0)}
                          </span>
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

            {/* Line Items Dynamic Form Array: Unit Cost, Line Discount, VAT Code */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Costing Breakdown per Item
              </span>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {item.productName} ({item.receivedQuantity} Qty)
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                        Total: {formatCurrency(item.lineTotal)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Actual Unit Cost <span className="text-rose-500">*</span>
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
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Section: Freight Charges and Other Landing Costs */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Additional Landed Charges (Capitalized to Inventory)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Freight Charges (LKR)
                  </label>
                  <CurrencyInput
                    value={freightCharges}
                    onChange={(val) => setFreightCharges(val)}
                    placeholder="0.00"
                    disabled={isAuditLocked || submitting}
                    readOnly={isAuditLocked}
                  />
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
                <span>VAT Total (Input VAT):</span>
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
            </div>

            {/* Footer Action: Void/Reverse button if Audit Locked; Post Vendor Bill if New/Editable */}
            <div className="pt-2 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/finance/desk')}
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
                <Button
                  onClick={handlePostVendorBill}
                  disabled={!isFormValid || submitting}
                  className="gap-2 bg-primary hover:bg-primary-hover text-white shadow-xs font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{submitting ? 'Posting Double-Entry...' : 'Post Vendor Bill'}</span>
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
