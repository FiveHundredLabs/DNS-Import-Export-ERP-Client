import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerCreditNoteService } from '../../services/customerCreditNoteService';
import { CustomerCreditNote, CustomerCreditNoteLineItem } from '../../api/types';
import { MOCK_CUSTOMERS } from '../../../../mock/mockCustomers';
import { MOCK_PRODUCTS } from '../../../../mock/mockProducts';
import { arService } from '../../services/arService';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../components/ui/dialog';
import { Textarea } from '../../../../components/ui/textarea';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import Decimal from 'decimal.js';
import { DoubleEntryHoverBadge } from '../../components/DoubleEntryHoverBadge';
import {
  RotateCcw,
  CheckCircle2,
  Plus,
  Trash2,
  Search,
  Receipt,
  Building2,
  Package,
  Layers,
  ArrowRight,
  ArrowLeft,
  Landmark,
  ShieldCheck,
  ChevronRight,
  SlidersHorizontal,
  X,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export function CustomerCreditNotesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab: 'REGISTRY' | 'CREATE'
  const [activeTab, setActiveTab] = useState<'REGISTRY' | 'CREATE'>(
    searchParams.get('create') ? 'CREATE' : 'REGISTRY'
  );

  const [creditNotes, setCreditNotes] = useState<CustomerCreditNote[]>(() =>
    customerCreditNoteService.getCreditNotes()
  );

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    searchParams.get('customerId') || 'cust-001'
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [creditNoteDate, setCreditNoteDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [returnReason, setReturnReason] = useState<string>(
    'Customer returned merchandise due to specification adjustment'
  );
  const [returnToInventory, setReturnToInventory] = useState<boolean>(true);
  const [lineItems, setLineItems] = useState<CustomerCreditNoteLineItem[]>([
    {
      id: 'init-li-1',
      productId: 'prod-001',
      productName: 'Hybrid Solar Inverter 5kW Pure Sine',
      sku: 'INV-5KW-HYB',
      returnedQuantity: 1,
      unitPrice: 60000.0,
      unitCost: 42000.0,
      taxRate: 0.18,
      subtotal: 60000.0,
      vatAmount: 10800.0,
      lineTotal: 70800.0,
      costTotal: 42000.0,
      condition: 'GOOD_RETURN_TO_STOCK',
      reason: 'Surplus units returned in original packaging',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('ALL');

  // Selected item for detail drawer
  const [selectedCN, setSelectedCN] = useState<CustomerCreditNote | null>(null);

  const refreshCreditNotes = () => {
    setCreditNotes(customerCreditNoteService.getCreditNotes());
  };

  const handleVoidCreditNote = async (cn: CustomerCreditNote) => {
    try {
      await customerCreditNoteService.voidCustomerCreditNote(cn.id, 'Voided by Finance Manager');
      toast.success(`Customer Credit Note ${cn.creditNoteNumber} voided and balances restored.`);
      refreshCreditNotes();
      setSelectedCN(customerCreditNoteService.getCreditNoteById(cn.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to void credit note');
    }
  };

  const metrics = useMemo(() => {
    return customerCreditNoteService.getMetrics();
  }, [creditNotes]);

  const selectedCustomer = useMemo(() => {
    return MOCK_CUSTOMERS.find((c) => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId]);

  const customerOpenInvoices = useMemo(() => {
    if (!selectedCustomerId) return [];
    return arService.getOpenInvoicesForCustomer(selectedCustomerId);
  }, [selectedCustomerId]);

  const filteredCreditNotes = useMemo(() => {
    return creditNotes.filter((cn) => {
      if (filterCustomer !== 'ALL' && cn.customerId !== filterCustomer) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        cn.creditNoteNumber.toLowerCase().includes(q) ||
        cn.customerName.toLowerCase().includes(q) ||
        (cn.invoiceNumber && cn.invoiceNumber.toLowerCase().includes(q)) ||
        cn.reason.toLowerCase().includes(q)
      );
    });
  }, [creditNotes, filterCustomer, searchQuery]);

  // Form totals calculation
  const formTotals = useMemo(() => {
    let subtotal = new Decimal(0);
    let vat = new Decimal(0);
    let cost = new Decimal(0);

    for (const item of lineItems) {
      const q = new Decimal(item.returnedQuantity || 0);
      const p = new Decimal(item.unitPrice || 0);
      const c = new Decimal(item.unitCost || 0);
      const t = new Decimal(item.taxRate !== undefined ? item.taxRate : 0.18);

      const lineSub = q.times(p);
      const lineV = lineSub.times(t).toDecimalPlaces(2);
      const lineCost = q.times(c);

      subtotal = subtotal.plus(lineSub);
      vat = vat.plus(lineV);
      cost = cost.plus(lineCost);
    }

    return {
      subtotal: subtotal.toNumber(),
      vatAmount: vat.toNumber(),
      totalAmount: subtotal.plus(vat).toNumber(),
      totalCostAmount: cost.toNumber(),
    };
  }, [lineItems]);

  const handleLoadFromInvoice = () => {
    const inv = customerOpenInvoices.find((i) => i.id === selectedInvoiceId);
    if (!inv) {
      toast.error('Please select an invoice first.');
      return;
    }
    if (inv.items && inv.items.length > 0) {
      const mapped: CustomerCreditNoteLineItem[] = inv.items.map((item, idx) => {
        const subtotal = item.unitPrice;
        const taxRate = item.taxRate ?? 0.18;
        const vat = Number(new Decimal(subtotal).times(taxRate).toFixed(2));
        return {
          id: `inv-li-${Date.now()}-${idx}`,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          returnedQuantity: 1,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost,
          taxRate,
          subtotal,
          vatAmount: vat,
          lineTotal: subtotal + vat,
          costTotal: item.unitCost,
          condition: 'GOOD_RETURN_TO_STOCK',
          reason: `Returned from invoice ${inv.invoiceNumber}`,
        };
      });
      setLineItems(mapped);
      toast.success(`Loaded ${mapped.length} item(s) from invoice ${inv.invoiceNumber}`);
    } else {
      toast.error('No line item breakdown found on selected invoice.');
    }
  };

  const handleAddCatalogItem = () => {
    const firstProd = MOCK_PRODUCTS[0];
    const unitPrice = firstProd?.pricing?.currentSellingPrice ?? 50000;
    const unitCost = firstProd?.pricing?.costPrice ?? 35000;
    const subtotal = unitPrice;
    const vat = Number(new Decimal(subtotal).times(0.18).toFixed(2));

    const newLine: CustomerCreditNoteLineItem = {
      id: `li-${Date.now()}`,
      productId: firstProd?.id || 'prod-001',
      productName: firstProd?.name || 'Solar Inverter',
      sku: firstProd?.sku || 'INV-5KW',
      returnedQuantity: 1,
      unitPrice,
      unitCost,
      taxRate: 0.18,
      subtotal,
      vatAmount: vat,
      lineTotal: subtotal + vat,
      costTotal: unitCost,
      condition: 'GOOD_RETURN_TO_STOCK',
      reason: 'Returned goods',
    };
    setLineItems([...lineItems, newLine]);
  };

  const handleAddCustomItem = () => {
    const newLine: CustomerCreditNoteLineItem = {
      id: `custom-li-${Date.now()}`,
      productId: `custom-${Date.now()}`,
      productName: 'Custom Returned Item',
      sku: 'CUSTOM-01',
      returnedQuantity: 1,
      unitPrice: 10000,
      unitCost: 7000,
      taxRate: 0.18,
      subtotal: 10000,
      vatAmount: 1800,
      lineTotal: 11800,
      costTotal: 7000,
      condition: 'GOOD_RETURN_TO_STOCK',
      reason: 'Non-catalog return or custom adjustment',
    };
    setLineItems([...lineItems, newLine]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleProductChange = (index: number, productId: string) => {
    const prod = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!prod) return;

    setLineItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const qty = item.returnedQuantity || 1;
        const price = prod.pricing?.currentSellingPrice ?? 50000;
        const cost = prod.pricing?.costCost ?? prod.pricing?.costPrice ?? price * 0.7;
        const sub = qty * price;
        const vat = Number(new Decimal(sub).times(item.taxRate || 0.18).toFixed(2));
        return {
          ...item,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          unitPrice: price,
          unitCost: cost,
          subtotal: sub,
          vatAmount: vat,
          lineTotal: sub + vat,
          costTotal: qty * cost,
        };
      })
    );
  };

  const handleLineChange = (
    index: number,
    field: 'returnedQuantity' | 'unitPrice' | 'unitCost' | 'taxRate' | 'reason' | 'productName' | 'sku' | 'productId',
    value: number | string
  ) => {
    setLineItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, [field]: value };
        const qty = Number(updated.returnedQuantity) || 0;
        const price = Number(updated.unitPrice) || 0;
        const cost = Number(updated.unitCost) || 0;
        const taxRate = Number(updated.taxRate) || 0;

        const sub = qty * price;
        const vat = Number(new Decimal(sub).times(taxRate).toFixed(2));
        return {
          ...updated,
          subtotal: sub,
          vatAmount: vat,
          lineTotal: sub + vat,
          costTotal: qty * cost,
        };
      })
    );
  };

  const handleSubmitCreditNote = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer.');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Add at least one return line item.');
      return;
    }

    try {
      setSubmitting(true);
      const inv = customerOpenInvoices.find((i) => i.id === selectedInvoiceId);

      const created = await customerCreditNoteService.postCustomerCreditNote({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerCode: selectedCustomer.code,
        invoiceId: inv?.id,
        invoiceNumber: inv?.invoiceNumber,
        date: creditNoteDate,
        reason: returnReason,
        lineItems,
        returnToInventory,
      });

      toast.success(
        `Customer Credit Note ${created.creditNoteNumber} posted! GL entries committed: Dr 4010 Sales Revenue, Dr 2020 VAT, Cr 1020 A/R, and Dr 1100 Inventory / Cr 5010 COGS.`
      );
      refreshCreditNotes();
      setActiveTab('REGISTRY');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post customer credit note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Customer Credit Notes
            </h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              AR Returns & Revenue Reversal
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Process customer sales returns: reversing revenue & output tax (Debit 4010, Debit 2020, Credit 1020 A/R), and restoring stock to physical inventory (Debit 1100, Credit 5010 COGS).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'REGISTRY' ? (
            <Button
              size="sm"
              onClick={() => setActiveTab('CREATE')}
              className="text-xs gap-1.5 bg-primary hover:bg-primary-hover text-white shadow-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Issue Credit Note</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('REGISTRY')}
              className="text-xs gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Registry</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/ar/approvals')}
            className="text-xs gap-1.5"
          >
            <Receipt className="h-3.5 w-3.5 text-primary" />
            <span>Receipt Approvals</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/ar/pdc-vault')}
            className="text-xs gap-1.5 border-amber-300 bg-amber-50/50 text-amber-800"
          >
            <Landmark className="h-3.5 w-3.5 text-amber-700" />
            <span>PDC Vault (1018)</span>
          </Button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('REGISTRY')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'REGISTRY'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Credit Notes Registry</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              {creditNotes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CREATE')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'CREATE'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Issue Credit Note (Returns)</span>
          </button>
        </div>
      </div>

      {activeTab === 'REGISTRY' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">Total Credit Notes</span>
                <RotateCcw className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1.5 tabular-nums">
                {formatCurrency(metrics.totalGross)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {metrics.totalCount} customer credit notes issued
              </div>
            </Card>

            <Card className="p-4 border-rose-200 bg-rose-50/40 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-rose-800">Revenue Reversed (4010)</span>
                <Receipt className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-950 mt-1.5 tabular-nums">
                {formatCurrency(metrics.totalRevenueReversed)}
              </div>
              <div className="text-[11px] text-rose-700 mt-1">
                Net sales revenue deducted
              </div>
            </Card>

            <Card className="p-4 border-emerald-200 bg-emerald-50/40 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-emerald-800">Stock Restored (1100/5010)</span>
                <Package className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-950 mt-1.5 tabular-nums">
                {formatCurrency(metrics.totalInventoryRestored)}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">
                Merchandise added back to physical stock
              </div>
            </Card>

            <Card className="p-4 border-blue-200 bg-blue-50/40 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-blue-800">Output VAT Reversed (2020)</span>
                <Layers className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-blue-950 mt-1.5 tabular-nums">
                {formatCurrency(metrics.totalVatReversed)}
              </div>
              <div className="text-[11px] text-blue-700 mt-1">
                Output VAT tax liability relieved
              </div>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="h-9 text-xs rounded-md border border-slate-300 px-3 bg-white text-slate-800"
              >
                <option value="ALL">All Customers</option>
                {MOCK_CUSTOMERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search credit note #, customer, reason..."
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>

          {/* Registry Table */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Credit Note #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Linked Invoice</th>
                    <th className="px-4 py-3 text-right">Gross Total (A/R)</th>
                    <th className="px-4 py-3 text-right">Stock Value (1100)</th>
                    <th className="px-4 py-3 text-center">Physical Stock</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCreditNotes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                        No credit notes found. Click "Issue Credit Note" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredCreditNotes.map((cn) => (
                      <tr
                        key={cn.id}
                        onClick={() => setSelectedCN(cn)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-primary">
                          <div className="flex items-center gap-1.5">
                            <span>{cn.creditNoteNumber}</span>
                            <DoubleEntryHoverBadge
                              lines={[
                                { accountCode: '4010', accountName: 'Sales Revenue', type: 'DEBIT', amount: cn.subtotal },
                                ...(cn.vatAmount > 0
                                  ? [{ accountCode: '2020', accountName: 'VAT Payable (Output)', type: 'DEBIT' as const, amount: cn.vatAmount }]
                                  : []),
                                { accountCode: '1020', accountName: `Accounts Receivable (${cn.customerName})`, type: 'CREDIT', amount: cn.totalAmount },
                                ...(cn.returnToInventory && (cn.totalCostAmount || 0) > 0
                                  ? [
                                      { accountCode: '1100', accountName: 'Merchandise Inventory', type: 'DEBIT' as const, amount: cn.totalCostAmount || 0 },
                                      { accountCode: '5010', accountName: 'Cost of Goods Sold', type: 'CREDIT' as const, amount: cn.totalCostAmount || 0 },
                                    ]
                                  : []),
                              ]}
                              title={`Credit Note ${cn.creditNoteNumber} GL Postings`}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{cn.customerName}</div>
                          {cn.customerCode && (
                            <span className="font-mono text-[11px] text-slate-400">{cn.customerCode}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {formatDate(cn.date)}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {cn.invoiceNumber || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                          {formatCurrency(cn.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-emerald-700">
                          {formatCurrency(cn.totalCostAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {cn.returnToInventory ? (
                            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50">
                              Stock Restored (1100)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              No Stock Return
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedCN(cn)}
                            className="h-7 text-xs text-slate-500 hover:text-slate-800"
                          >
                            Details <ChevronRight className="h-3 w-3 ml-0.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer for Selected Credit Note */}
      {selectedCN && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary">{selectedCN.creditNoteNumber}</span>
                <Badge variant="success" className="text-[10px]">
                  {selectedCN.status}
                </Badge>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-1">
                Credit Note Ledger Audit
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCN(null)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Customer</span>
                  <span className="font-bold text-slate-900">{selectedCN.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Gross Credit Note</span>
                  <span className="font-bold font-mono text-primary text-base tabular-nums">
                    {formatCurrency(selectedCN.totalAmount)}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 flex justify-between">
                <span>Date: {formatDate(selectedCN.date)}</span>
                <span>Linked Invoice: {selectedCN.invoiceNumber || 'None'}</span>
              </div>
              <p className="text-[11px] text-slate-500 italic mt-1">{selectedCN.reason}</p>
            </div>

            {/* Line Items List */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 block">Returned Line Items:</span>
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Unit Price</th>
                      <th className="p-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedCN.lineItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <div className="font-medium text-slate-800">{item.productName}</div>
                          <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                        </td>
                        <td className="p-2 text-center font-mono font-bold">{item.returnedQuantity}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Universal Journal Entry Breakdown */}
            <div className="p-4 rounded-lg bg-slate-900 text-slate-100 space-y-2.5 font-mono text-[11px]">
              <div className="text-[10px] uppercase font-bold font-sans text-slate-400 flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" />
                Double-Entry Accounting Voucher Lines
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-800">
                <div className="flex justify-between text-rose-300">
                  <span>Dr 4010 Sales Revenue (Net Reversal)</span>
                  <span>{formatCurrency(selectedCN.subtotal)}</span>
                </div>
                {selectedCN.vatAmount > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Dr 2020 VAT Payable (18% Tax Reversal)</span>
                    <span>{formatCurrency(selectedCN.vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-blue-300">
                  <span>Cr 1020 Accounts Receivable ({selectedCN.customerName})</span>
                  <span>{formatCurrency(selectedCN.totalAmount)}</span>
                </div>
                {selectedCN.returnToInventory && selectedCN.totalCostAmount > 0 && (
                  <>
                    <div className="flex justify-between text-emerald-400 pt-1 border-t border-slate-800">
                      <span>Dr 1100 Merchandise Inventory (Physical Stock)</span>
                      <span>{formatCurrency(selectedCN.totalCostAmount)}</span>
                    </div>
                    <div className="flex justify-between text-teal-300">
                      <span>Cr 5010 Cost of Goods Sold (COGS Reversal)</span>
                      <span>{formatCurrency(selectedCN.totalCostAmount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {selectedCN.status === 'ISSUED' && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVoidCreditNote(selectedCN)}
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 text-xs"
                >
                  Void Credit Note & Reverse Entries
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE TAB: Issue Customer Credit Note Form */}
      {activeTab === 'CREATE' && (
        <div className="space-y-4 max-w-4xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('REGISTRY')}
            className="text-xs gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Credit Notes Registry</span>
          </Button>

          <Card className="p-6 border-slate-200 shadow-2xs space-y-5">
            <div className="border-b border-slate-200 pb-3 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  <span>Issue Customer Credit Note & Return Stock</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Execute formal sales return accounting: debit revenue and tax, credit customer A/R balance, and restock physical inventory.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('REGISTRY')}
                className="text-xs gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </Button>
            </div>

            {/* Header Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer / Dealer <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setSelectedInvoiceId('');
                  }}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 px-2.5 bg-white text-slate-800"
                >
                  {MOCK_CUSTOMERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Linked Sales Invoice
                  </label>
                  {selectedInvoiceId && (
                    <button
                      type="button"
                      onClick={handleLoadFromInvoice}
                      className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                    >
                      <Package className="h-3 w-3" />
                      Load Lines
                    </button>
                  )}
                </div>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full h-9 text-xs rounded-md border border-slate-300 px-2.5 bg-white text-slate-800"
                >
                  <option value="">None / Standalone Return</option>
                  {customerOpenInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} (Bal: LKR {inv.balanceDue.toLocaleString()})
                    </option>
                  ))}
                </select>
                {selectedInvoiceId && (
                  <div className="mt-1 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={handleLoadFromInvoice}
                      className="text-[11px] h-6 px-2 gap-1 text-primary border-primary-border bg-primary-light/40"
                    >
                      <Package className="h-3 w-3" />
                      <span>Load Items from Invoice</span>
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Note Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={creditNoteDate}
                  onChange={(e) => setCreditNoteDate(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Return / Dispute <span className="text-rose-500">*</span>
              </label>
              <Input
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Returned surplus items from site installation in sealed carton"
                className="h-9 text-xs bg-white"
              />
            </div>

            {/* Return to Physical Stock Checkbox */}
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="return-stock-cb"
                checked={returnToInventory}
                onChange={(e) => setReturnToInventory(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div>
                <label htmlFor="return-stock-cb" className="text-xs font-bold text-slate-900 cursor-pointer block">
                  Return Items to Physical Stock (Dr 1100 Inventory / Cr 5010 COGS)
                </label>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  When checked, automatically increases merchandise inventory valuation in warehouse and reverses historical cost of goods sold.
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Returned Merchandise Line Items ({lineItems.length})
                </span>
                <div className="flex items-center gap-2">
                  {selectedInvoiceId && (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={handleLoadFromInvoice}
                      className="text-xs h-7 gap-1 text-primary border-primary-border bg-primary-light/40"
                    >
                      <Package className="h-3 w-3" />
                      <span>Load Invoice Items</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={handleAddCatalogItem}
                    className="text-xs h-7 gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add from Catalog</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={handleAddCustomItem}
                    className="text-xs h-7 gap-1 text-slate-700"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>Add Custom Line</span>
                  </Button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
                    <tr>
                      <th className="p-2.5 text-left">Product Selection / Description</th>
                      <th className="p-2.5 text-center w-20">Return Qty</th>
                      <th className="p-2.5 text-right w-28">Selling Price</th>
                      <th className="p-2.5 text-right w-28">Unit Cost</th>
                      <th className="p-2.5 text-right w-28">Line Gross (A/R)</th>
                      <th className="p-2.5 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map((item, index) => (
                      <tr key={item.id || index}>
                        <td className="p-2.5">
                          {item.productId.startsWith('custom-') ? (
                            <div className="space-y-1">
                              <Input
                                placeholder="Custom Product / Description"
                                value={item.productName}
                                onChange={(e) => handleLineChange(index, 'productName', e.target.value)}
                                className="h-8 text-xs font-medium"
                              />
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="SKU / Code"
                                  value={item.sku}
                                  onChange={(e) => handleLineChange(index, 'sku', e.target.value)}
                                  className="h-6 text-[10px] font-mono w-28"
                                />
                                <Badge variant="outline" className="text-[10px] text-slate-500 py-0 px-1.5">
                                  Custom Item
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => handleProductChange(index, MOCK_PRODUCTS[0]?.id || 'prod-001')}
                                  className="text-[10px] text-primary hover:underline"
                                >
                                  Switch to Catalog
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <select
                                value={item.productId}
                                onChange={(e) => {
                                  if (e.target.value === 'CUSTOM') {
                                    handleLineChange(index, 'productId', `custom-${Date.now()}`);
                                  } else {
                                    handleProductChange(index, e.target.value);
                                  }
                                }}
                                className="w-full h-8 text-xs rounded border border-slate-300 px-2 bg-white text-slate-800"
                              >
                                {MOCK_PRODUCTS.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
                                  </option>
                                ))}
                                <option value="CUSTOM">+ Custom / Non-Catalog Product...</option>
                              </select>
                              <div className="flex items-center gap-2 pl-1">
                                <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            min="1"
                            value={item.returnedQuantity}
                            onChange={(e) =>
                              handleLineChange(index, 'returnedQuantity', Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="h-8 text-xs text-center font-mono font-bold"
                          />
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleLineChange(index, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))
                            }
                            className="h-8 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            value={item.unitCost}
                            onChange={(e) =>
                              handleLineChange(index, 'unitCost', Math.max(0, parseFloat(e.target.value) || 0))
                            }
                            className="h-8 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatCurrency(item.lineTotal)}
                        </td>
                        <td className="p-2.5 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveLineItem(index)}
                            disabled={lineItems.length === 1}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Financial & Double-Entry Impact Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Financial Calculation Box */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Summary Totals
                </span>
                <div className="flex justify-between text-slate-600">
                  <span>Net Revenue Reversal (Subtotal):</span>
                  <span className="font-mono font-semibold">{formatCurrency(formTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Output VAT Reversal (18%):</span>
                  <span className="font-mono font-semibold">{formatCurrency(formTotals.vatAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1 text-sm">
                  <span>Total Credit Note Value (A/R Credit):</span>
                  <span className="font-mono text-primary">{formatCurrency(formTotals.totalAmount)}</span>
                </div>
                {returnToInventory && (
                  <div className="flex justify-between text-emerald-700 font-medium pt-1 border-t border-slate-200 text-[11px]">
                    <span>Inventory Restored to Stock (1100):</span>
                    <span className="font-mono font-bold">{formatCurrency(formTotals.totalCostAmount)}</span>
                  </div>
                )}
              </div>

              {/* Universal Ledger Double-Entry Preview */}
              <div className="p-4 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono space-y-1.5">
                <div className="font-sans font-bold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-primary" />
                  Live Double-Entry GL Ledger Effect
                </div>
                <div className="flex justify-between text-rose-300">
                  <span>Dr 4010 Sales Revenue</span>
                  <span>+{formatCurrency(formTotals.subtotal)}</span>
                </div>
                {formTotals.vatAmount > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Dr 2020 VAT Payable (18%)</span>
                    <span>+{formatCurrency(formTotals.vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-blue-300">
                  <span>Cr 1020 Accounts Receivable</span>
                  <span>-{formatCurrency(formTotals.totalAmount)}</span>
                </div>
                {returnToInventory && formTotals.totalCostAmount > 0 && (
                  <>
                    <div className="flex justify-between text-emerald-400 pt-1 border-t border-slate-800">
                      <span>Dr 1100 Merchandise Inventory</span>
                      <span>+{formatCurrency(formTotals.totalCostAmount)}</span>
                    </div>
                    <div className="flex justify-between text-teal-300">
                      <span>Cr 5010 Cost of Goods Sold</span>
                      <span>-{formatCurrency(formTotals.totalCostAmount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('REGISTRY')}
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <DoubleEntryHoverBadge
                  lines={[
                    { accountCode: '4010', accountName: 'Sales Revenue', type: 'DEBIT', amount: formTotals.subtotal },
                    ...(formTotals.vatAmount > 0
                      ? [{ accountCode: '2020', accountName: 'VAT Payable (Output)', type: 'DEBIT' as const, amount: formTotals.vatAmount }]
                      : []),
                    { accountCode: '1020', accountName: `Accounts Receivable (${selectedCustomer?.name || 'Customer'})`, type: 'CREDIT', amount: formTotals.totalAmount },
                    ...(returnToInventory && formTotals.totalCostAmount > 0
                      ? [
                          { accountCode: '1100', accountName: 'Merchandise Inventory', type: 'DEBIT' as const, amount: formTotals.totalCostAmount },
                          { accountCode: '5010', accountName: 'Cost of Goods Sold', type: 'CREDIT' as const, amount: formTotals.totalCostAmount },
                        ]
                      : []),
                  ]}
                  title="Credit Note Double-Entry Impact"
                />
                <Button
                  size="sm"
                  onClick={handleSubmitCreditNote}
                  disabled={submitting}
                  className="bg-primary hover:bg-primary-hover text-white gap-1.5 font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Issue Credit Note & Commit Ledger</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
