import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { apService, VendorBillLineItem, LandedExpenseItem } from '../../services/apService';
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
import { cn } from '../../../../utils/cn';
import { MOCK_PRODUCTS } from '../../../../mock/mockProducts';
import { MOCK_WARRANTY_RECORDS } from '../../../../mock/mockWarranty';
import { GRNItem } from '../../../../types/inventory';
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
  Barcode,
  Hash,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  Copy,
  Check,
  Package,
  Layers,
  ShieldCheck,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

const LANDED_EXPENSE_CATEGORIES = [
  'Shipping / Freight Charges',
  'Port Charges & Demurrage',
  'Local Transportation & Haulage',
  'Handling & Offloading',
  'Customs Clearance & Duties',
  'Transit Insurance',
  'Other Related Expenses',
];

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
  const [freightBilledByThirdParty, setFreightBilledByThirdParty] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  // Incremental Additional Landed Expenses (Shipping, Port Charges, Transport, Handling, etc.)
  const [additionalExpenses, setAdditionalExpenses] = useState<LandedExpenseItem[]>([
    { id: 'exp-1', category: 'Shipping / Freight Charges', description: 'Sea / Air freight charges', amount: 0 },
    { id: 'exp-2', category: 'Port Charges & Demurrage', description: 'Port terminal handling & wharfage', amount: 0 },
    { id: 'exp-3', category: 'Local Transportation & Haulage', description: 'Port to warehouse transport', amount: 0 },
  ]);

  // Apportionment Engine settings
  const [showApportionModal, setShowApportionModal] = useState(false);
  const [apportionBulkFreight, setApportionBulkFreight] = useState<number>(0);
  const [apportionMethod, setApportionMethod] = useState<'BY_VALUE' | 'BY_QUANTITY'>('BY_VALUE');

  // Incremental expense addition and update helpers
  const handleAddExpense = () => {
    setAdditionalExpenses((prev) => [
      ...prev,
      {
        id: `exp-${Date.now()}`,
        category: 'Handling & Offloading',
        description: '',
        amount: 0,
      },
    ]);
  };

  const handleUpdateExpense = (id: string, field: keyof LandedExpenseItem, value: any) => {
    setAdditionalExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleRemoveExpense = (id: string) => {
    setAdditionalExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      return next.length > 0
        ? next
        : [{ id: `exp-${Date.now()}`, category: 'Shipping / Freight Charges', description: '', amount: 0 }];
    });
  };

  // Total Additional Landed Costs (sum of all incremental expenses)
  const totalAdditionalLandedCosts = useMemo(() => {
    return additionalExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [additionalExpenses]);

  // Dynamically calculate Landed Cost per Unit and Total Landed Cost for every product line
  const computedLineItems = useMemo(() => {
    return apService.apportionLandedCosts(lineItems, totalAdditionalLandedCosts, apportionMethod);
  }, [lineItems, totalAdditionalLandedCosts, apportionMethod]);

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

  // Left GRN Card states for compact list, expand/collapse, search & serial numbers
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
  const [productSearch, setProductSearch] = useState('');
  const [activeSerialItem, setActiveSerialItem] = useState<{
    item: GRNItem;
    product?: any;
    serialNumbers: string[];
    barcode: string;
  } | null>(null);
  const [serialSearchQuery, setSerialSearchQuery] = useState('');
  const [copiedSerials, setCopiedSerials] = useState(false);

  // Right-side Costing Breakdown Expand/Collapse state
  const [expandedCostingItemIds, setExpandedCostingItemIds] = useState<Record<string, boolean>>({
    'line-0': true, // Keep the first product expanded by default for immediate editing, others compact
  });
  const [costingProductSearch, setCostingProductSearch] = useState('');

  const toggleCostingItemExpand = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCostingItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleExpandAllCosting = () => {
    const all: Record<string, boolean> = {};
    computedLineItems.forEach((item) => {
      all[item.id] = true;
    });
    setExpandedCostingItemIds(all);
  };

  const handleCollapseAllCosting = () => {
    setExpandedCostingItemIds({});
  };

  // Reset left card & right card view states when selected GRN changes
  useEffect(() => {
    setIsListExpanded(false);
    setExpandedProductIds({});
    setProductSearch('');
    setActiveSerialItem(null);
    setExpandedCostingItemIds({ 'line-0': true });
    setCostingProductSearch('');
  }, [selectedGRNId]);

  // Product master details lookup helper
  const getProductMaster = (productId: string, sku: string) => {
    return MOCK_PRODUCTS.find((p) => p.id === productId || p.sku === sku);
  };

  // Product-level barcode helper (1 per product type, NOT per individual unit)
  const getProductBarcode = (item: GRNItem) => {
    const product = getProductMaster(item.productId, item.skuSnapshot);
    if (product?.barcode) return product.barcode;
    const digits = item.skuSnapshot.replace(/[^0-9]/g, '');
    return `89010${(digits + '12345678').slice(0, 8)}`;
  };

  // Real serial numbers resolution for a GRN item
  const getItemSerialNumbers = (item: GRNItem): string[] => {
    if (item.serialNumbers && item.serialNumbers.length > 0) {
      return Array.from(new Set(item.serialNumbers));
    }
    const matching = MOCK_WARRANTY_RECORDS
      .filter((w) => (w.productId === item.productId && w.sku === item.skuSnapshot) && Boolean(w.serialNumber))
      .map((w) => w.serialNumber as string);
    return Array.from(new Set(matching));
  };

  const COLLAPSED_PRODUCT_LIMIT = 10;

  const totalReceivedUnits = useMemo(() => {
    return selectedGRN?.items.reduce((s, it) => s + (it.receivedQuantity || 0), 0) || 0;
  }, [selectedGRN]);

  const totalDamagedUnits = useMemo(() => {
    return selectedGRN?.items.reduce((s, it) => s + (it.damagedQuantity || 0), 0) || 0;
  }, [selectedGRN]);

  const filteredGRNItems = useMemo(() => {
    if (!selectedGRN?.items) return [];
    if (!productSearch.trim()) return selectedGRN.items;
    const q = productSearch.toLowerCase().trim();
    return selectedGRN.items.filter((item) => {
      const barcode = getProductBarcode(item);
      return (
        item.productNameSnapshot.toLowerCase().includes(q) ||
        item.skuSnapshot.toLowerCase().includes(q) ||
        barcode.toLowerCase().includes(q)
      );
    });
  }, [selectedGRN, productSearch]);

  const displayedGRNItems = useMemo(() => {
    if (productSearch.trim() || isListExpanded) {
      return filteredGRNItems;
    }
    return filteredGRNItems.slice(0, COLLAPSED_PRODUCT_LIMIT);
  }, [filteredGRNItems, isListExpanded, productSearch]);

  const toggleProductExpand = (itemKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedProductIds((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  const handleExpandAllDetails = () => {
    if (!selectedGRN) return;
    const all: Record<string, boolean> = {};
    selectedGRN.items.forEach((item, idx) => {
      all[`item-${idx}-${item.productId}`] = true;
    });
    setExpandedProductIds(all);
  };

  const handleCollapseAllDetails = () => {
    setExpandedProductIds({});
  };

  const handleOpenSerials = (item: GRNItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const serials = getItemSerialNumbers(item);
    if (serials.length === 0) {
      toast.info('No unit serial numbers recorded for this product.');
      return;
    }
    const barcode = getProductBarcode(item);
    const product = getProductMaster(item.productId, item.skuSnapshot);
    setActiveSerialItem({
      item,
      product,
      serialNumbers: serials,
      barcode,
    });
    setSerialSearchQuery('');
    setCopiedSerials(false);
  };

  const filteredSerials = useMemo(() => {
    if (!activeSerialItem) return [];
    if (!serialSearchQuery.trim()) return activeSerialItem.serialNumbers;
    const q = serialSearchQuery.toLowerCase().trim();
    return activeSerialItem.serialNumbers.filter((sn) => sn.toLowerCase().includes(q));
  }, [activeSerialItem, serialSearchQuery]);

  const handleCopySerials = () => {
    if (!activeSerialItem) return;
    const text = activeSerialItem.serialNumbers.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedSerials(true);
    toast.success(`Copied ${activeSerialItem.serialNumbers.length} serial numbers to clipboard!`);
    setTimeout(() => setCopiedSerials(false), 2000);
  };

  // Auto-initialize line items & auto-pull historical purchase price from Supplier Master
  useEffect(() => {
    if (existingBill) {
      setVendorInvoiceNumber(existingBill.vendorInvoiceNumber);
      setInvoiceDate(existingBill.invoiceDate);
      setDueDate(existingBill.dueDate);
      setFreightBilledByThirdParty(Boolean(existingBill.freightBilledByThirdParty));
      setLineItems(existingBill.lineItems);

      if (existingBill.additionalExpenses && existingBill.additionalExpenses.length > 0) {
        setAdditionalExpenses(existingBill.additionalExpenses);
      } else {
        const initExps: LandedExpenseItem[] = [];
        if (existingBill.freightCharges > 0) {
          initExps.push({
            id: 'exp-freight',
            category: 'Shipping / Freight Charges',
            description: 'Ocean / Air freight charges',
            amount: existingBill.freightCharges,
          });
        }
        if (existingBill.otherLandingCosts > 0) {
          initExps.push({
            id: 'exp-other',
            category: 'Port Charges & Demurrage',
            description: 'Port authority & handling charges',
            amount: existingBill.otherLandingCosts,
          });
        }
        if (initExps.length === 0) {
          initExps.push({
            id: 'exp-1',
            category: 'Shipping / Freight Charges',
            description: 'Freight & forwarding charges',
            amount: 0,
          });
        }
        setAdditionalExpenses(initExps);
      }
    } else if (selectedGRN) {
      setVendorInvoiceNumber(selectedGRN.supplierInvoiceNumber || '');
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setFreightBilledByThirdParty(false);
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
          allocatedLandedCost: 0,
          landedUnitCost: actualCost,
          totalLandedCost: net.toNumber(),
        };
      });
      setLineItems(items);
      setApportionBulkFreight(0);
      setAdditionalExpenses([
        { id: `exp-1`, category: 'Shipping / Freight Charges', description: 'Sea / Air freight charges', amount: 0 },
        { id: `exp-2`, category: 'Port Charges & Demurrage', description: 'Port terminal handling & wharfage', amount: 0 },
        { id: `exp-3`, category: 'Local Transportation & Haulage', description: 'Port to warehouse transport', amount: 0 },
      ]);
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

  // Calculations for summary totals with recommended terminology:
  // - Supplier Goods Subtotal: payable to supplier for goods
  // - Additional Landed Costs: shipping, port charges, transportation, handling
  // - Total Landed Cost: total actual cost of the received inventory (capitalized to inventory)
  // - 1025 Input VAT Receivable (Asset)
  // - Total Accounts Payable Commitment
  const { subtotal, totalLandedCost, vatTotal, grandTotal } = useMemo(() => {
    let sub = new Decimal(0);
    let vat = new Decimal(0);

    for (const item of computedLineItems) {
      const net = Decimal.max(
        0,
        new Decimal(item.receivedQuantity).times(new Decimal(item.unitCost)).minus(item.lineDiscount || 0)
      );
      sub = sub.plus(net);
      vat = vat.plus(item.vatAmount || 0);
    }

    const landed = sub.plus(totalAdditionalLandedCosts || 0);
    const grand = landed.plus(vat);

    return {
      subtotal: sub.toNumber(),
      totalLandedCost: landed.toNumber(),
      vatTotal: vat.toNumber(),
      grandTotal: grand.toNumber(),
    };
  }, [computedLineItems, totalAdditionalLandedCosts]);

  // Landed Cost Apportionment Engine
  const previewApportionment = useMemo(() => {
    return apService.apportionLandedCosts(lineItems, apportionBulkFreight || totalAdditionalLandedCosts, apportionMethod);
  }, [lineItems, apportionBulkFreight, totalAdditionalLandedCosts, apportionMethod]);

  const handleApplyApportionment = () => {
    if (apportionBulkFreight < 0) {
      toast.error('Bulk expenses amount cannot be negative');
      return;
    }
    setAdditionalExpenses((prev) => {
      if (prev.length === 1) {
        return [{ ...prev[0], amount: apportionBulkFreight }];
      }
      return [
        { id: `exp-apportioned`, category: 'Shipping / Freight Charges', description: 'Allocated bulk landed expenses', amount: apportionBulkFreight },
      ];
    });
    setShowApportionModal(false);
    toast.success(
      `Additional expenses of ${formatCurrency(apportionBulkFreight)} successfully apportioned across ${lineItems.length} line items by ${
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
      const freightItem = additionalExpenses.find(
        (e) => e.category.toLowerCase().includes('freight') || e.category.toLowerCase().includes('shipping')
      );
      const freightAmount = freightItem ? Number(freightItem.amount) || 0 : 0;
      const otherCostsAmount = Math.max(0, totalAdditionalLandedCosts - freightAmount);

      const bill = await apService.postVendorBill({
        grnId: selectedGRN.id,
        vendorInvoiceNumber: vendorInvoiceNumber.trim(),
        invoiceDate,
        dueDate,
        lineItems: computedLineItems,
        freightCharges: freightAmount,
        otherLandingCosts: otherCostsAmount,
        freightBilledByThirdParty,
        additionalExpenses,
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
              onValueChange={(val) => setSelectedGRNId(val)}
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
          <Card className="p-3.5 border-slate-200 bg-slate-50/80 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Warehouse className="h-4 w-4 text-primary shrink-0" />
                <span>Warehouse Goods Receipt (Read-Only)</span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 bg-white",
                  selectedGRN?.status === 'APPROVED' && "border-emerald-300 text-emerald-800 bg-emerald-50/60",
                  selectedGRN?.status === 'COSTED' && "border-amber-300 text-amber-800 bg-amber-50/60",
                  selectedGRN?.status === 'SUBMITTED' && "border-blue-300 text-blue-800 bg-blue-50/60"
                )}
              >
                {selectedGRN?.status || 'SUBMITTED'}
              </Badge>
            </div>

            {selectedGRN ? (
              <div className="mt-3 space-y-2.5 text-xs">
                {/* Supplier & Warehouse Metadata */}
                <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 shadow-2xs space-y-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
                      Supplier Name
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {selectedGRN.supplierName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                        GRN Reference
                      </span>
                      <span className="font-mono font-semibold text-slate-700">
                        {selectedGRN.grnNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                        Received Warehouse
                      </span>
                      <span className="font-semibold text-slate-700">
                        {selectedGRN.warehouseId}
                      </span>
                    </div>
                    {selectedGRN.submittedAt && (
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                          Received Date
                        </span>
                        <span className="text-slate-700">
                          {formatDate(selectedGRN.submittedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Metrics Strip */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-white border border-slate-200 p-1.5 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Product Lines</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{selectedGRN.items.length}</span>
                  </div>
                  <div className="rounded-md bg-white border border-slate-200 p-1.5 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Received Units</span>
                    <span className="font-mono font-bold text-primary text-xs">{totalReceivedUnits}</span>
                  </div>
                  <div className={cn(
                    "rounded-md border p-1.5 shadow-2xs",
                    totalDamagedUnits > 0
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : "bg-white border-slate-200 text-slate-800"
                  )}>
                    <span className="text-[10px] font-semibold uppercase block opacity-75">Damaged Units</span>
                    <span className="font-mono font-bold text-xs">{totalDamagedUnits}</span>
                  </div>
                </div>

                {/* Physical Product Items Section */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-700 font-bold text-xs">
                        Verified Physical Inbound Quantities:
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-slate-600 bg-white">
                        {selectedGRN.items.length}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      {selectedGRN.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const isAnyExpanded = Object.values(expandedProductIds).some(Boolean);
                            if (isAnyExpanded) {
                              handleCollapseAllDetails();
                            } else {
                              handleExpandAllDetails();
                            }
                          }}
                          className="h-6 text-[10px] px-1.5 text-slate-500 hover:text-slate-800"
                          title="Toggle all product details & barcodes"
                        >
                          <Layers className="h-3 w-3 mr-1" />
                          <span>{Object.values(expandedProductIds).some(Boolean) ? 'Collapse All' : 'Expand All'}</span>
                        </Button>
                      )}

                      {selectedGRN.items.length > COLLAPSED_PRODUCT_LIMIT && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsListExpanded(!isListExpanded)}
                          className="h-6 text-[10px] px-2 font-semibold text-primary border-primary/30 hover:bg-primary-light"
                        >
                          {isListExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              <span>Collapse</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              <span>View All ({selectedGRN.items.length})</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Search filter for large product lists */}
                  {(selectedGRN.items.length > COLLAPSED_PRODUCT_LIMIT || isListExpanded) && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder={`Search ${selectedGRN.items.length} products by name, SKU, or barcode...`}
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="h-7 pl-8 text-xs bg-white border-slate-200"
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch('')}
                          className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs px-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )}

                  {/* Product Cards Container */}
                  <div
                    className={cn(
                      "space-y-1.5 pr-1",
                      isListExpanded && selectedGRN.items.length > COLLAPSED_PRODUCT_LIMIT
                        ? "max-h-[650px] overflow-y-auto"
                        : ""
                    )}
                  >
                    {displayedGRNItems.length > 0 ? (
                      displayedGRNItems.map((item, idx) => {
                        const itemKey = `item-${idx}-${item.productId}`;
                        const isExpanded = Boolean(expandedProductIds[itemKey]);
                        const product = getProductMaster(item.productId, item.skuSnapshot);
                        const barcode = getProductBarcode(item);
                        const serials = getItemSerialNumbers(item);
                        const costedItem = computedLineItems.find(
                          (ci) => ci.productId === item.productId || ci.sku === item.skuSnapshot
                        );

                        return (
                          <div
                            key={itemKey}
                            className={cn(
                              "rounded-lg border bg-white p-2.5 text-xs transition-all shadow-2xs",
                              isExpanded
                                ? "border-primary/40 ring-1 ring-primary/20 bg-slate-50/30"
                                : "border-slate-200/90 hover:border-slate-300"
                            )}
                          >
                            {/* Primary Compact Row */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-1.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => toggleProductExpand(itemKey, e)}
                                  className="text-slate-400 hover:text-primary transition-colors p-0.5 rounded -ml-1 mt-0.5 shrink-0"
                                  title={isExpanded ? "Collapse product details" : "Expand product details & barcode"}
                                  aria-label={isExpanded ? "Collapse product details" : "Expand product details & barcode"}
                                >
                                  <ChevronRight
                                    className={cn(
                                      "h-3.5 w-3.5 transition-transform duration-150",
                                      isExpanded && "rotate-90 text-primary"
                                    )}
                                  />
                                </button>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-800 truncate" title={item.productNameSnapshot}>
                                      {item.productNameSnapshot}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono mt-0.5">
                                    <span>SKU: {item.skuSnapshot}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-500">
                                      Supplier: <span className="font-semibold text-slate-700">{formatCurrency(costedItem?.unitCost || item.unitCostSnapshot || 0)}</span>
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-primary font-semibold">
                                      Landed: <span>{formatCurrency(costedItem?.landedUnitCost || item.unitCostSnapshot || 0)}</span>
                                      <span className="text-[10px] text-slate-400 font-sans ml-0.5">/unit</span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="font-mono text-xs font-bold text-primary tabular-nums">
                                  {item.receivedQuantity} units
                                </div>
                                {item.damagedQuantity > 0 && (
                                  <span className="inline-block text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.2 mt-0.5">
                                    Damaged: {item.damagedQuantity}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Serial Number & Barcode Action Line */}
                            <div className="flex items-center justify-between text-[11px] pt-1.5 mt-1.5 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={(e) => toggleProductExpand(itemKey, e)}
                                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-primary font-medium"
                              >
                                <Barcode className="h-3 w-3 text-slate-400" />
                                <span>{isExpanded ? 'Hide Barcode & Details' : 'Show Barcode & Details'}</span>
                              </button>

                              <div>
                                {serials.length > 0 ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => handleOpenSerials(item, e)}
                                    className="h-6 text-[10px] px-2 gap-1 text-primary hover:bg-primary-light border-primary/30 font-medium"
                                    title={`View ${serials.length} unit serial numbers`}
                                  >
                                    <Hash className="h-3 w-3 text-primary" />
                                    <span>View Serial Numbers ({serials.length})</span>
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    No unit serials
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Expandable Product Details Section */}
                            {isExpanded && (
                              <div className="mt-2 pt-2 border-t border-dashed border-slate-200 space-y-2 bg-slate-50/70 -mx-1 -mb-1 p-2 rounded-b-md">
                                {/* Product-Level Barcode */}
                                <div className="flex items-center justify-between bg-white border border-slate-200 rounded p-1.5 shadow-2xs">
                                  <div className="flex items-center gap-1.5 text-slate-700">
                                    <Barcode className="h-3.5 w-3.5 text-slate-900" />
                                    <span className="font-semibold text-[11px]">Product Barcode:</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono font-bold text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 tracking-wider">
                                      {barcode}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-500 text-right pr-0.5">
                                  Product-level barcode (one barcode per product type, not per unit)
                                </div>

                                {/* Product Specifications & Inventory Details */}
                                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white border border-slate-200 rounded p-2 text-slate-600">
                                  <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category</span>
                                    <span className="font-medium text-slate-800">{product?.categoryName || 'Electrical Switchgear'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">UOM</span>
                                    <span className="font-medium text-slate-800">{product?.uomCode || 'PCS'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Expected Inbound</span>
                                    <span className="font-mono font-medium text-slate-700">{item.expectedQuantity} units</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Unit Cost Snapshot</span>
                                    <span className="font-mono font-medium text-slate-700">{formatCurrency(item.unitCostSnapshot)}</span>
                                  </div>
                                </div>

                                {/* True Landed Inventory Costing Comparison Strip */}
                                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded p-2 text-xs space-y-1.5">
                                  <div className="flex items-center justify-between pb-1 border-b border-emerald-200/60">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1 font-sans">
                                      <Sparkles className="h-3 w-3 text-emerald-600" />
                                      <span>True Landed Inventory Costing</span>
                                    </span>
                                    <span className="text-[10px] font-mono font-semibold text-emerald-800">
                                      {item.receivedQuantity} received units
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                                    <div>
                                      <span className="text-slate-500 block text-[10px] font-sans">Supplier Unit Cost</span>
                                      <span className="font-bold text-slate-800">{formatCurrency(costedItem?.unitCost || item.unitCostSnapshot || 0)}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block text-[10px] font-sans">Allocated Landed</span>
                                      <span className="font-semibold text-slate-700">+{formatCurrency((costedItem?.allocatedLandedCost || 0) / (item.receivedQuantity || 1))}/unit</span>
                                    </div>
                                    <div>
                                      <span className="text-emerald-800 block text-[10px] font-sans font-semibold">Landed Cost / Unit</span>
                                      <span className="font-bold text-emerald-700 text-xs">{formatCurrency(costedItem?.landedUnitCost || item.unitCostSnapshot || 0)}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block text-[10px] font-sans">Total Landed Cost</span>
                                      <span className="font-bold text-slate-900">{formatCurrency(costedItem?.totalLandedCost || (costedItem ? costedItem.landedUnitCost * item.receivedQuantity : item.lineValue || 0))}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Serial Numbers Status in Expanded View */}
                                {serials.length > 0 && (
                                  <div className="flex items-center justify-between bg-primary-light/40 border border-primary-border/60 rounded p-2">
                                    <div className="flex items-center gap-1.5 text-primary-text text-[11px] font-medium">
                                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                      <span>{serials.length} unit serial numbers verified</span>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={(e) => handleOpenSerials(item, e)}
                                      className="h-6 text-[10px] px-2 bg-primary hover:bg-primary-hover text-white gap-1"
                                    >
                                      <Hash className="h-2.5 w-2.5" />
                                      <span>Inspect Serials</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400 bg-white rounded-lg border border-slate-200">
                        No products match "{productSearch}"
                      </div>
                    )}
                  </div>

                  {/* Collapsed State Banner & Action Button */}
                  {!isListExpanded && !productSearch && selectedGRN.items.length > COLLAPSED_PRODUCT_LIMIT && (
                    <div className="rounded-lg border border-dashed border-primary/30 bg-primary-light/20 p-2 text-center space-y-1.5">
                      <div className="text-[11px] text-slate-600 font-medium">
                        Showing {COLLAPSED_PRODUCT_LIMIT} of {selectedGRN.items.length} products in this GRN
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsListExpanded(true)}
                        className="w-full text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary-light bg-white shadow-2xs"
                      >
                        <Package className="h-3.5 w-3.5" />
                        <span>Expand / View All Products ({selectedGRN.items.length})</span>
                      </Button>
                    </div>
                  )}

                  {/* Expanded State Collapse Button */}
                  {isListExpanded && !productSearch && selectedGRN.items.length > COLLAPSED_PRODUCT_LIMIT && (
                    <div className="pt-1 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsListExpanded(false)}
                        className="w-full text-xs text-slate-500 hover:text-slate-800 gap-1.5"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                        <span>Collapse Products Summary</span>
                      </Button>
                    </div>
                  )}
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

            {/* Line Items Dynamic Form Array with Smaller Cards & Expanders */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Costing Breakdown per Item
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-slate-600 bg-white">
                    {computedLineItems.length} Products
                  </Badge>
                  <span className="text-[11px] text-slate-400 hidden md:inline">
                    • Auto-pulled from Supplier Master
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {computedLineItems.length > 3 && (
                    <div className="relative">
                      <Search className="absolute left-2 top-1.5 h-3 w-3 text-slate-400" />
                      <input
                        type="text"
                        value={costingProductSearch}
                        onChange={(e) => setCostingProductSearch(e.target.value)}
                        placeholder="Filter products..."
                        className="h-6 w-32 sm:w-40 pl-6 pr-2 text-[11px] rounded border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const isAnyExpanded = Object.values(expandedCostingItemIds).some(Boolean);
                      if (isAnyExpanded) {
                        handleCollapseAllCosting();
                      } else {
                        handleExpandAllCosting();
                      }
                    }}
                    className="h-6 text-[10px] px-2 text-slate-500 hover:text-slate-800"
                    title="Toggle all product costing cards"
                  >
                    <Layers className="h-3 w-3 mr-1" />
                    <span>{Object.values(expandedCostingItemIds).some(Boolean) ? 'Collapse All' : 'Expand All'}</span>
                  </Button>
                </div>
              </div>

              {/* FOB / 3rd-Party Logistics Freight Split Toggle */}
              {totalAdditionalLandedCosts > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2.5 mb-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={freightBilledByThirdParty}
                      onChange={(e) => setFreightBilledByThirdParty(e.target.checked)}
                      disabled={isAuditLocked || submitting}
                      className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800">
                        Freight & Clearing Billed Separately by 3rd-Party Logistics (FOB Shipment)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        When enabled, landed cost is capitalized into Inventory (Dr 1100), but freight & clearing are credited to Accruals (Account 2015) instead of inflating the merchandise vendor's payable balance.
                      </p>
                    </div>
                  </label>

                  {freightBilledByThirdParty && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                      <div className="p-2.5 rounded-md bg-white border border-slate-200">
                        <span className="text-slate-500 block text-[10px] font-semibold uppercase">Payable to {selectedGRN?.supplierName || 'Merchandise Vendor'}</span>
                        <span className="text-slate-900 font-bold font-mono text-xs">
                          {formatCurrency(subtotal + vatTotal)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-md bg-white border border-slate-200">
                        <span className="text-slate-500 block text-[10px] font-semibold uppercase">Accrued to Forwarder / Clearing Agent (2015)</span>
                        <span className="text-primary-text font-bold font-mono text-xs">
                          {formatCurrency(totalAdditionalLandedCosts)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {computedLineItems
                  .filter((item) => {
                    if (!costingProductSearch.trim()) return true;
                    const q = costingProductSearch.toLowerCase().trim();
                    return item.productName.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
                  })
                  .map((item) => {
                    const originalIndex = lineItems.findIndex((li) => li.id === item.id);
                    const index = originalIndex >= 0 ? originalIndex : 0;
                    const hist = item.historicalPurchasePrice || 0;
                    const priceDiff = item.unitCost - hist;
                    const hasVariance = hist > 0 && Math.abs(priceDiff) > 0.01;
                    const isExpanded = Boolean(expandedCostingItemIds[item.id]);

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-lg border transition-all duration-200 overflow-hidden shadow-2xs",
                          isExpanded
                            ? "border-primary/40 bg-white ring-1 ring-primary/10 shadow-xs"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs"
                        )}
                      >
                        {/* Compact Card Header Bar (Clickable to toggle expander) */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleCostingItemExpand(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleCostingItemExpand(item.id);
                            }
                          }}
                          className={cn(
                            "w-full text-left p-2 sm:px-3 sm:py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 cursor-pointer select-none transition-colors",
                            isExpanded ? "bg-slate-50/80 border-b border-slate-200/70" : "hover:bg-slate-50/50"
                          )}
                        >
                          {/* Left: Expander icon, Index #, Product Name, SKU, Received Qty, Master variance */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={cn(
                                "h-5 w-5 rounded flex items-center justify-center shrink-0 transition-colors",
                                isExpanded ? "bg-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              )}
                              title={isExpanded ? "Collapse product costing details" : "Expand product costing details"}
                            >
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 transition-transform duration-200",
                                  isExpanded && "rotate-180"
                                )}
                              />
                            </div>

                            <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              #{index + 1}
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-[320px]" title={item.productName}>
                                  {item.productName}
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono py-0 px-1 bg-slate-50 text-slate-600">
                                  {item.sku}
                                </Badge>
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium whitespace-nowrap">
                                  Qty: {item.receivedQuantity}
                                </span>
                                {hasVariance && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[9px] py-0 px-1 whitespace-nowrap",
                                      priceDiff > 0
                                        ? "bg-amber-50 text-amber-700 border-amber-300"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-300"
                                    )}
                                  >
                                    {priceDiff > 0 ? `+${formatCurrency(priceDiff)}` : formatCurrency(priceDiff)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Supplier Unit Cost, Landed Cost per Unit, Line Total & Action */}
                          <div className="flex items-center justify-between md:justify-end gap-2.5 sm:gap-4 shrink-0 text-xs">
                            {/* Supplier Unit Cost */}
                            <div className="text-right">
                              <span className="text-[9px] font-medium uppercase text-slate-400 block tracking-tight">Supplier Unit Cost</span>
                              <span className="font-mono text-xs font-semibold text-slate-700">
                                {formatCurrency(item.unitCost)}
                              </span>
                            </div>

                            {/* Landed Cost per Unit badge */}
                            <div className="text-right bg-primary/5 border border-primary/20 rounded px-2 py-0.5">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-primary block">Landed Cost per Unit</span>
                              <span className="font-mono text-xs font-bold text-primary">
                                {formatCurrency(item.landedUnitCost || item.unitCost)}
                                <span className="text-[9px] font-normal text-primary/70 ml-0.5 font-sans">/u</span>
                              </span>
                            </div>

                            {/* Line Total */}
                            <div className="text-right min-w-[80px]">
                              <span className="text-[9px] font-medium uppercase text-slate-400 block tracking-tight">Line Total</span>
                              <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                                {formatCurrency(item.lineTotal)}
                              </span>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => toggleCostingItemExpand(item.id, e)}
                              className="h-6 text-[10px] px-1.5 text-slate-400 hover:text-primary hover:bg-primary-light/50"
                            >
                              <span>{isExpanded ? 'Collapse' : 'Edit'}</span>
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Content: Master comparison, Inputs, Full True Landed Cost Breakdown */}
                        {isExpanded && (
                          <div className="p-3.5 space-y-3 bg-white">
                            {/* Master Price Info */}
                            <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] bg-slate-50 rounded-md p-2 border border-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">Last Historical Price:</span>
                                <span className="font-mono font-semibold text-primary">
                                  {hist > 0 ? formatCurrency(hist) : 'No prior history'}
                                </span>
                                <span className="text-[10px] text-slate-400">(Supplier Master)</span>

                                {hasVariance && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] py-0 px-1.5",
                                      priceDiff > 0
                                        ? "bg-amber-50 text-amber-700 border-amber-300"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-300"
                                    )}
                                  >
                                    {priceDiff > 0 ? `+${formatCurrency(priceDiff)} variance` : `${formatCurrency(priceDiff)} variance`}
                                  </Badge>
                                )}
                              </div>

                              {hasVariance && !isAuditLocked && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resetToHistoricalCost(index)}
                                  className="h-5 text-[10px] px-1.5 text-primary hover:text-primary-hover hover:underline"
                                >
                                  Reset to Master
                                </Button>
                              )}
                            </div>

                            {/* Editable Inputs Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Supplier Unit Cost <span className="text-rose-500">*</span>
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">(Payable to supplier)</span>
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

                            {/* True Landed Cost Breakdown Display - automatically recalculated */}
                            <div className="pt-2 border-t border-slate-200/70 rounded-md bg-slate-50/70 border border-slate-200/90 p-2.5 space-y-1.5 font-mono text-xs shadow-2xs">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <span className="text-slate-400 text-[10px] font-sans block uppercase font-medium">Supplier Unit Cost</span>
                                  <span className="font-bold text-slate-800 text-xs">{formatCurrency(item.unitCost)}</span>
                                  <span className="text-[10px] text-slate-400 font-sans block">payable to supplier</span>
                                </div>

                                <div>
                                  <span className="text-slate-400 text-[10px] font-sans block uppercase font-medium">Allocated Landed Costs</span>
                                  <span className="font-semibold text-slate-700 text-xs">
                                    {totalAdditionalLandedCosts > 0 ? (
                                      <>
                                        +{formatCurrency(item.allocatedLandedCost || 0)}
                                        <span className="text-[10px] text-slate-500 font-sans ml-1">
                                          (+{formatCurrency((item.allocatedLandedCost || 0) / (item.receivedQuantity || 1))}/unit)
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-slate-400 italic font-sans text-[11px]">No expenses allocated</span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-sans block">share of additional expenses</span>
                                </div>

                                <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-1.5">
                                  <span className="text-primary text-[10px] font-sans font-bold uppercase tracking-wider block">
                                    Landed Cost per Unit
                                  </span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="font-bold text-primary text-sm">
                                      {formatCurrency(item.landedUnitCost || item.unitCost)}
                                    </span>
                                    <span className="text-[10px] text-primary/70 font-sans">/ unit</span>
                                  </div>
                                  <span className="text-[9px] text-slate-400 font-sans block">actual capitalized unit cost</span>
                                </div>

                                <div className="text-right">
                                  <span className="text-slate-400 text-[10px] font-sans block uppercase font-medium">Total Landed Cost</span>
                                  <span className="font-bold text-slate-900 text-xs">
                                    {formatCurrency(item.totalLandedCost || item.lineTotal)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-sans block">supplier + allocated expenses</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Incremental Additional Landed Costs Section */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                    Additional Landed Costs (Additional Landed Charges - Capitalized to Inventory)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Shipping, port charges, transportation, handling, and other related expenses.
                  </span>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant="outline" className="bg-white text-primary border-primary/30 font-mono text-xs px-2.5 py-1">
                    Total Additional: {formatCurrency(totalAdditionalLandedCosts)}
                  </Badge>
                  {!isAuditLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setApportionBulkFreight(totalAdditionalLandedCosts);
                        setShowApportionModal(true);
                      }}
                      className="h-7 text-xs gap-1.5 bg-primary-light text-primary-text border-primary-border hover:bg-primary-light/80 font-semibold"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      <span>Apportion Freight Tool</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Allocation Method Selector Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-2.5">
                <div className="flex items-center gap-2">
                  <Scale className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Allocation Method:</span>
                  <div className="inline-flex rounded-md shadow-2xs">
                    <button
                      type="button"
                      onClick={() => !isAuditLocked && setApportionMethod('BY_VALUE')}
                      disabled={isAuditLocked}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-l-md border transition-colors",
                        apportionMethod === 'BY_VALUE'
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      By Net Value (Proportional to Line Value)
                    </button>
                    <button
                      type="button"
                      onClick={() => !isAuditLocked && setApportionMethod('BY_QUANTITY')}
                      disabled={isAuditLocked}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-r-md border-t border-r border-b -ml-px transition-colors",
                        apportionMethod === 'BY_QUANTITY'
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      By Quantity (Proportional to Received Units)
                    </button>
                  </div>
                </div>

                <span className="text-[11px] text-slate-500 font-mono">
                  Allocated across {computedLineItems.length} product lines
                </span>
              </div>

              {/* Incremental Expense Rows */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-400 px-1">
                  <div className="col-span-12 sm:col-span-4">Expense Category</div>
                  <div className="col-span-12 sm:col-span-4">Description / Reference #</div>
                  <div className="col-span-10 sm:col-span-3 text-right">Amount (LKR)</div>
                  <div className="col-span-2 sm:col-span-1 text-center">Action</div>
                </div>

                {additionalExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-200/90 rounded-md p-2 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="col-span-12 sm:col-span-4">
                      <Select
                        value={exp.category}
                        onChange={(e) => handleUpdateExpense(exp.id, 'category', e.target.value)}
                        disabled={isAuditLocked}
                        className="h-8 text-xs bg-white"
                      >
                        {LANDED_EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="col-span-12 sm:col-span-4">
                      <Input
                        value={exp.description}
                        onChange={(e) => handleUpdateExpense(exp.id, 'description', e.target.value)}
                        placeholder="e.g. Carrier, wharfage, haulage details"
                        disabled={isAuditLocked}
                        className="h-8 text-xs bg-white"
                      />
                    </div>

                    <div className="col-span-10 sm:col-span-3">
                      <CurrencyInput
                        value={exp.amount}
                        onChange={(val) => handleUpdateExpense(exp.id, 'amount', val)}
                        placeholder="0.00"
                        disabled={isAuditLocked || submitting}
                        readOnly={isAuditLocked}
                        className="h-8 text-xs text-right font-mono"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExpense(exp.id)}
                        disabled={isAuditLocked || (additionalExpenses.length === 1 && exp.amount === 0)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Remove expense line"
                        aria-label="Remove expense line"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}

                {!isAuditLocked && (
                  <div className="pt-1 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddExpense}
                      className="h-8 text-xs gap-1.5 border-dashed border-slate-300 hover:border-primary text-slate-600 hover:text-primary hover:bg-primary-light/50 font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Additional Landed Expense</span>
                    </Button>

                    <span className="text-[11px] text-slate-400 italic">
                      Expenses can be added incrementally; unit costs recalculate automatically.
                    </span>
                  </div>
                )}
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
                <span>Supplier Goods Subtotal (Payable to Supplier):</span>
                <span className="font-mono font-semibold tabular-nums text-slate-800">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Additional Landed Costs (Shipping, Port, Transport, Handling):</span>
                <span className="font-mono font-semibold tabular-nums text-slate-800">
                  +{formatCurrency(totalAdditionalLandedCosts)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700 font-semibold border-t border-primary-border/40 pt-1.5">
                <span>Total Landed Cost (Capitalized to Inventory):</span>
                <span className="font-mono font-bold tabular-nums text-slate-900">
                  {formatCurrency(totalLandedCost)}
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
                        accountName: 'Merchandise Inventory (Total Landed Cost)',
                        type: 'DEBIT',
                        amount: totalLandedCost,
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
                    <th className="py-2 px-2 text-right">Supplier Unit Cost</th>
                    <th className="py-2 px-2 text-right">Allocated Landed Costs</th>
                    <th className="py-2 px-3 text-right">Landed Cost per Unit</th>
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

      {/* Unit Serial Numbers Modal Dialog */}
      <Dialog
        open={Boolean(activeSerialItem)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveSerialItem(null);
            setSerialSearchQuery('');
          }
        }}
        size="lg"
      >
        <div className="space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-primary-light flex items-center justify-center text-primary shrink-0">
                  <Hash className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Product Serial Numbers
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Verified unit-level inbound serial numbers from physical goods receipt
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 font-mono text-primary font-bold px-2 py-0.5">
                {activeSerialItem?.serialNumbers.length || 0} Serials
              </Badge>
            </div>
          </DialogHeader>

          {activeSerialItem && (
            <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-900 text-sm">
                {activeSerialItem.item.productNameSnapshot}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans uppercase font-semibold">SKU</span>
                  <span className="font-bold text-slate-800">{activeSerialItem.item.skuSnapshot}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans uppercase font-semibold">Product Barcode</span>
                  <span className="font-bold text-slate-800">{activeSerialItem.barcode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans uppercase font-semibold">Received Quantity</span>
                  <span className="font-bold text-primary">{activeSerialItem.item.receivedQuantity} units</span>
                </div>
              </div>
            </div>
          )}

          {/* Search toolbar & Copy All button */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search serial numbers..."
                value={serialSearchQuery}
                onChange={(e) => setSerialSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs font-mono bg-white"
              />
              {serialSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSerialSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ×
                </button>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySerials}
              className="h-8 text-xs gap-1.5 shrink-0"
              title="Copy all serial numbers to clipboard"
            >
              {copiedSerials ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-600" />
                  <span>Copy All ({activeSerialItem?.serialNumbers.length || 0})</span>
                </>
              )}
            </Button>
          </div>

          {/* Serial Numbers Grid / List */}
          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
            {filteredSerials.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredSerials.map((sn, idx) => (
                  <div
                    key={sn}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono shadow-2xs hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-5">#{idx + 1}</span>
                      <span className="font-semibold text-slate-800 select-all">{sn}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-700 bg-emerald-50 border-emerald-200 font-sans">
                      Verified
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No serial numbers match "{serialSearchQuery}"
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredSerials.length} of {activeSerialItem?.serialNumbers.length || 0} serial numbers
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveSerialItem(null);
                setSerialSearchQuery('');
              }}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
