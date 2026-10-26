import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apService, VendorBill } from '../../services/apService';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { CurrencyInput } from '../../components/CurrencyInput';
import { DoubleEntryHoverBadge } from '../../components/DoubleEntryHoverBadge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import {
  SupplierDebitNote,
  SupplierDebitNoteLineItem,
} from '../../api/types';
import { MOCK_PRODUCTS } from '../../../../mock/mockProducts';
import Decimal from 'decimal.js';
import {
  RotateCcw,
  CheckCircle2,
  Receipt,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  FileText,
  Warehouse,
} from 'lucide-react';
import { toast } from 'sonner';

export function SupplierDebitNotesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { suppliers } = useFinanceLedger();

  // Tab: 'REGISTRY' or 'CREATE'
  const [activeTab, setActiveTab] = useState<'REGISTRY' | 'CREATE'>(
    searchParams.get('grnId') ? 'CREATE' : 'REGISTRY'
  );

  // Initial Debit Notes
  const [debitNotes, setDebitNotes] = useState<SupplierDebitNote[]>(() =>
    apService.getDebitNotes()
  );

  // Form Header State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedGRNId, setSelectedGRNId] = useState<string>(
    searchParams.get('grnId') || ''
  );
  const [debitNoteDate, setDebitNoteDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [returnReason, setReturnReason] = useState<string>(
    'Defective / damaged stock returned to supplier for refund credit'
  );
  const [targetBillId, setTargetBillId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Form Line Items
  const [lineItems, setLineItems] = useState<SupplierDebitNoteLineItem[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('ALL');

  // Available GRNs
  const allGRNs = useMemo(() => apService.getAvailableGRNs(), []);

  // Filter GRNs for selected supplier
  const supplierGRNs = useMemo(() => {
    if (!selectedSupplierId) return allGRNs;
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    return allGRNs.filter(
      (g) =>
        g.supplierId === selectedSupplierId ||
        (sup && g.supplierName.toLowerCase().includes(sup.name.toLowerCase()))
    );
  }, [allGRNs, selectedSupplierId, suppliers]);

  // Open bills for selected supplier
  const openBills = useMemo(() => {
    if (!selectedSupplierId) return [];
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    return apService.getOpenBillsForSupplier(sup?.name || selectedSupplierId);
  }, [selectedSupplierId, suppliers]);

  // Auto-select first supplier
  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplierId) {
      // Check if grn param matches a supplier
      const grnParam = searchParams.get('grnId');
      if (grnParam) {
        const found = allGRNs.find((g) => g.id === grnParam);
        if (found) {
          const supMatch = suppliers.find(
            (s) => s.id === found.supplierId || s.name.toLowerCase().includes(found.supplierName.toLowerCase())
          );
          if (supMatch) setSelectedSupplierId(supMatch.id);
          else setSelectedSupplierId(suppliers[0].id);
          return;
        }
      }
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId, searchParams, allGRNs]);

  // When GRN changes, auto-populate damaged line items
  useEffect(() => {
    if (selectedGRNId) {
      const grn = allGRNs.find((g) => g.id === selectedGRNId);
      if (grn) {
        // Pre-fill damaged items from GRN if any
        const damagedItems: SupplierDebitNoteLineItem[] = [];
        for (const item of grn.items) {
          const damagedQty = item.damagedQuantity || 0;
          const unitCost = item.unitCostSnapshot || apService.getHistoricalPurchasePrice(grn.supplierId, item.productId);
          if (damagedQty > 0) {
            damagedItems.push({
              productId: item.productId,
              productName: item.productNameSnapshot,
              sku: item.skuSnapshot,
              damagedQuantity: damagedQty,
              unitCost,
              lineTotal: new Decimal(damagedQty).times(unitCost).toNumber(),
              reason: 'Transit / warehouse intake damage',
            });
          }
        }

        if (damagedItems.length > 0) {
          setLineItems(damagedItems);
        } else if (grn.items.length > 0) {
          // If no explicitly flagged damaged items, add first item as starter with qty 1
          const first = grn.items[0];
          const unitCost = first.unitCostSnapshot || apService.getHistoricalPurchasePrice(grn.supplierId, first.productId);
          setLineItems([
            {
              productId: first.productId,
              productName: first.productNameSnapshot,
              sku: first.skuSnapshot,
              damagedQuantity: 1,
              unitCost,
              lineTotal: unitCost,
              reason: 'Damaged item return',
            },
          ]);
        }
      }
    }
  }, [selectedGRNId, allGRNs]);

  // Refresh list
  const refreshDebitNotes = () => {
    setDebitNotes(apService.getDebitNotes());
  };

  // Add line item manually
  const handleAddLineItem = () => {
    const defaultProduct = MOCK_PRODUCTS[0];
    const cost = defaultProduct.pricing.costPrice;
    setLineItems((prev) => [
      ...prev,
      {
        productId: defaultProduct.id,
        productName: defaultProduct.name,
        sku: defaultProduct.sku,
        damagedQuantity: 1,
        unitCost: cost,
        lineTotal: cost,
        reason: 'Defective units return',
      },
    ]);
  };

  const handleUpdateLine = (index: number, field: keyof SupplierDebitNoteLineItem, val: any) => {
    setLineItems((prev) => {
      const next = [...prev];
      const cur = { ...next[index], [field]: val };

      if (field === 'productId') {
        const prod = MOCK_PRODUCTS.find((p) => p.id === val);
        if (prod) {
          cur.productName = prod.name;
          cur.sku = prod.sku;
          cur.unitCost = prod.pricing.costPrice;
        }
      }

      cur.lineTotal = new Decimal(cur.damagedQuantity || 0)
        .times(cur.unitCost || 0)
        .toNumber();

      next[index] = cur;
      return next;
    });
  };

  const handleRemoveLine = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Total Debit Note Amount
  const totalDebitNoteAmount = useMemo(() => {
    return lineItems.reduce((acc, i) => acc + (i.lineTotal || 0), 0);
  }, [lineItems]);

  // Post Supplier Debit Note
  const handlePostDebitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('At least one damaged item line must be added');
      return;
    }
    for (const item of lineItems) {
      if (item.damagedQuantity <= 0) {
        toast.error(`Return quantity must be > 0 for ${item.productName}`);
        return;
      }
      if (item.unitCost < 0) {
        toast.error(`Unit cost cannot be negative for ${item.productName}`);
        return;
      }
    }

    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    const grn = allGRNs.find((g) => g.id === selectedGRNId);

    try {
      setSubmitting(true);
      const dn = await apService.postSupplierDebitNote({
        supplierId: selectedSupplierId,
        supplierName: sup?.name || 'Selected Supplier',
        grnId: selectedGRNId || undefined,
        grnNumber: grn?.grnNumber || undefined,
        date: debitNoteDate,
        reason: returnReason.trim(),
        lineItems,
        targetBillId: targetBillId || undefined,
      });

      toast.success(
        `Supplier Debit Note ${dn.debitNoteNumber} issued! GL Double-Entry: Dr 2010 A/P, Cr 1100 Inventory.`
      );
      refreshDebitNotes();
      setActiveTab('REGISTRY');
      setLineItems([]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue Debit Note');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDebitNotes = useMemo(() => {
    return debitNotes.filter((dn) => {
      if (filterSupplier !== 'ALL' && dn.supplierId !== filterSupplier) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        dn.debitNoteNumber.toLowerCase().includes(q) ||
        dn.supplierName.toLowerCase().includes(q) ||
        dn.reason.toLowerCase().includes(q) ||
        (dn.grnNumber && dn.grnNumber.toLowerCase().includes(q))
      );
    });
  }, [debitNotes, filterSupplier, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Supplier Debit Notes (Purchase Returns)
            </h1>
            <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 text-xs">
              Accounts Payable
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Issue formal debit notes for damaged inbound stock returned to suppliers (Dr 2010 Accounts Payable, Cr 1030 Inventory).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'REGISTRY' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('REGISTRY')}
            className="text-xs"
          >
            Debit Notes History
          </Button>
          <Button
            variant={activeTab === 'CREATE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('CREATE')}
            className="text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Issue Debit Note</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/ap/bills/new')}
            className="text-xs text-primary border-primary/30"
          >
            Vendor Bill Costing
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Returns Issued
            </span>
            <RotateCcw className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            {formatCurrency(debitNotes.reduce((acc, d) => acc + d.totalAmount, 0))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total damaged stock credited</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Active Return Notes
            </span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            {debitNotes.length} Notes
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Processed supplier return vouchers</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              GL Double-Entry Core
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xs font-bold text-slate-800 mt-2">
            Dr 2010 A/P · Cr 1100 Inventory
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Reduces supplier liability & inventory asset</p>
        </Card>
      </div>

      {/* View 1: ISSUE DEBIT NOTE FORM */}
      {activeTab === 'CREATE' && (
        <Card className="p-6 border-slate-200 max-w-4xl mx-auto bg-white shadow-xs">
          <form onSubmit={handlePostDebitNote} className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Issue Supplier Debit Note</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record damaged stock returns to vendor and execute automated GL adjustment.
                </p>
              </div>
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-xs">
                Dr 2010 A/P · Cr 1100 Inventory
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Target Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Related Inbound GRN (Optional)
                </label>
                <select
                  value={selectedGRNId}
                  onChange={(e) => setSelectedGRNId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">None / Manual Entry</option>
                  {supplierGRNs.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.grnNumber} ({g.warehouseId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Debit Note Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={debitNoteDate}
                  onChange={(e) => setDebitNoteDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Return Reason / Inspection Finding <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Broken terminal housings / cracked cases found during intake inspection"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Offset against Specific Open Bill (Optional)
                </label>
                <select
                  value={targetBillId}
                  onChange={(e) => setTargetBillId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">None (Credit general A/P balance)</option>
                  {openBills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.billNumber} (Due: {formatCurrency(b.balanceDue)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Damaged Stock Line Items
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLineItem}
                  className="h-7 text-xs gap-1 text-primary border-primary/30"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Line Item</span>
                </Button>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                  No damaged items added. Select a GRN with damaged goods or click &ldquo;Add Line Item&rdquo;.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Product</th>
                        <th className="py-2.5 px-3 text-right">Damaged Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost (LKR)</th>
                        <th className="py-2.5 px-3 text-right">Refund Total</th>
                        <th className="py-2.5 px-3 text-left">Defect Reason</th>
                        <th className="py-2.5 px-2 text-center" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 min-w-[200px]">
                            <select
                              value={item.productId}
                              onChange={(e) => handleUpdateLine(idx, 'productId', e.target.value)}
                              className="flex h-8 w-full rounded-md border border-slate-200/90 bg-white px-2 py-1 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                              {MOCK_PRODUCTS.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3 text-right w-24">
                            <Input
                              type="number"
                              min="1"
                              value={item.damagedQuantity}
                              onChange={(e) =>
                                handleUpdateLine(idx, 'damagedQuantity', parseInt(e.target.value) || 0)
                              }
                              className="h-8 text-xs text-right font-mono"
                            />
                          </td>
                          <td className="py-2 px-3 text-right w-36">
                            <CurrencyInput
                              value={item.unitCost}
                              onChange={(val) => handleUpdateLine(idx, 'unitCost', val)}
                              className="h-8 text-xs text-right font-mono"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                            {formatCurrency(item.lineTotal)}
                          </td>
                          <td className="py-2 px-3 min-w-[160px]">
                            <Input
                              value={item.reason || ''}
                              onChange={(e) => handleUpdateLine(idx, 'reason', e.target.value)}
                              placeholder="Defect details..."
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveLine(idx)}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right text-slate-600">
                          Total Debit Note Refund:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-sm text-rose-700">
                          {formatCurrency(totalDebitNoteAmount)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* GL Posting Preview */}
            <div className="rounded-lg border border-primary-border/60 bg-primary-light/30 p-3.5 space-y-1 text-xs">
              <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                Automated Double-Entry Voucher:
              </span>
              <div className="flex justify-between font-mono text-slate-700 pt-1">
                <span>Dr 2010 Accounts Payable (Reduces Liability)</span>
                <span className="font-bold">{formatCurrency(totalDebitNoteAmount)}</span>
              </div>
              <div className="flex justify-between font-mono text-slate-700">
                <span>Cr 1100 Inventory (Reduces Merchandise Inventory)</span>
                <span className="font-bold">{formatCurrency(totalDebitNoteAmount)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('REGISTRY')}
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || totalDebitNoteAmount <= 0}
                  className="bg-primary hover:bg-primary-hover text-white gap-2 font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{submitting ? 'Posting...' : 'Issue Debit Note & Post GL'}</span>
                </Button>
                <DoubleEntryHoverBadge
                  title="Supplier Debit Note Double-Entry Impact"
                  description="Issuing this debit note reduces accounts payable and stock valuation:"
                  lines={[
                    {
                      accountCode: '2010',
                      accountName: 'Accounts Payable (Liability Reduction)',
                      type: 'DEBIT',
                      amount: totalDebitNoteAmount,
                    },
                    {
                      accountCode: '1100',
                      accountName: 'Merchandise Inventory (Stock Return)',
                      type: 'CREDIT',
                      amount: totalDebitNoteAmount,
                    },
                  ]}
                />
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* View 2: DEBIT NOTES REGISTRY */}
      {activeTab === 'REGISTRY' && (
        <Card className="p-5 border-slate-200 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Search debit note #, supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="flex h-9 rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-52"
              >
                <option value="ALL">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-500">
              Showing {filteredDebitNotes.length} debit note records
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left">Debit Note #</th>
                  <th className="py-2.5 px-3 text-left">Date</th>
                  <th className="py-2.5 px-3 text-left">Supplier</th>
                  <th className="py-2.5 px-3 text-left">GRN Reference</th>
                  <th className="py-2.5 px-3 text-left">Return Reason</th>
                  <th className="py-2.5 px-3 text-right">Items Count</th>
                  <th className="py-2.5 px-3 text-right">Total Refund (LKR)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebitNotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No supplier debit notes found. Click &ldquo;Issue Debit Note&rdquo; to process damaged stock returns.
                    </td>
                  </tr>
                ) : (
                  filteredDebitNotes.map((dn) => (
                    <tr key={dn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {dn.debitNoteNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{formatDate(dn.date)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{dn.supplierName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{dn.grnNumber || 'Manual'}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={dn.reason}>
                        {dn.reason}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {dn.lineItems.reduce((acc, i) => acc + i.damagedQuantity, 0)} units
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        {formatCurrency(dn.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 font-semibold"
                        >
                          {dn.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
