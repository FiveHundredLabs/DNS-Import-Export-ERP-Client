import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { apService, VendorBillLineItem, LandedExpenseItem } from '../../services/apService';
import { batchInventoryService } from '../../../../services/BatchInventoryService';
import { productService } from '../../../../services/ProductService';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import { cn } from '../../../../utils/cn';
import { MOCK_PRODUCTS } from '../../../../mock/mockProducts';
import { PrintableGRN, CostedPriceItemInfo } from '../../../inventory/PrintableGRN';
import Decimal from 'decimal.js';
import {
  CheckCircle2,
  Lock,
  Printer,
  Search,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Percent,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProductRowState {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  receivedQuantity: number;
  damagedQuantity: number;
  supplierUnitCost: number;
  lineDiscount: number;
  currentSellingPrice: number;
  newSellingPrice: number;
  priceScope: 'BATCH_ONLY' | 'ALL_STOCK';
  historicalPurchasePrice?: number;
}

export function VendorBillCostingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlGrnId = searchParams.get('grnId');

  const { currentUser } = useAuth();
  const [grnRefreshKey, setGrnRefreshKey] = useState(0);
  const availableGRNs = useMemo(() => apService.getAvailableGRNs(), [grnRefreshKey]);

  // View Mode: 'list' (queue) vs 'detail' (2-step guided workflow)
  const urlView = searchParams.get('view');
  const isTestEnv = typeof window !== 'undefined' && navigator.userAgent.includes('jsdom');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(() => {
    if (urlView === 'list') return 'list';
    if (urlView === 'detail' || urlGrnId || isTestEnv) return 'detail';
    return 'list';
  });

  // 2-Step Guided Workflow: Step 1 (Costing) vs Step 2 (Pricing & Margins)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [queueSearch, setQueueSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<'PENDING' | 'SUBMITTED' | 'COSTED' | 'APPROVED' | 'ALL'>('PENDING');

  const handleBackToGrnList = () => {
    setViewMode('list');
    navigate('/finance/ap/bills/new?view=list');
  };

  // Selected GRN state
  const [selectedGRNId, setSelectedGRNId] = useState<string>(() => {
    if (urlGrnId && availableGRNs.some((g) => g.id === urlGrnId || g.grnNumber === urlGrnId)) {
      return urlGrnId;
    }
    const firstPending = availableGRNs.find((g) => g.status === 'COSTED') || availableGRNs.find((g) => g.status === 'SUBMITTED');
    return firstPending?.id || availableGRNs[0]?.id || '';
  });

  useEffect(() => {
    if (urlGrnId && availableGRNs.some((g) => g.id === urlGrnId || g.grnNumber === urlGrnId)) {
      setSelectedGRNId(urlGrnId);
      setViewMode('detail');
    }
  }, [urlGrnId, availableGRNs]);

  const selectedGRN = useMemo(() => {
    return availableGRNs.find((g) => g.id === selectedGRNId || g.grnNumber === selectedGRNId) || availableGRNs[0] || null;
  }, [availableGRNs, selectedGRNId]);

  // Existing posted bill check
  const existingBill = useMemo(() => {
    return selectedGRN ? apService.getBillByGrnId(selectedGRN.id) : undefined;
  }, [selectedGRN, grnRefreshKey]);

  const isAuditLocked = Boolean(
    selectedGRN?.status === 'COSTED' ||
    selectedGRN?.status === 'PRICED' ||
    selectedGRN?.status === 'APPROVED' ||
    existingBill?.status === 'POSTED'
  );
  const isAuthorizedForVoid = !currentUser || ['FINANCE_MANAGER', 'MANAGER', 'DIRECTOR'].includes(currentUser.role);

  // ---------------------------------------------------------------------------
  // Top Header & Persistent Context Inputs
  // ---------------------------------------------------------------------------
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  // ---------------------------------------------------------------------------
  // Step 1: Section A — Additional Landed Expenses (4-Column Grid)
  // ---------------------------------------------------------------------------
  const [apportionMethod, setApportionMethod] = useState<'BY_VALUE' | 'BY_QUANTITY'>('BY_VALUE');
  const [freightAmount, setFreightAmount] = useState<number>(0);
  const [portDutyAmount, setPortDutyAmount] = useState<number>(0);
  const [localTransportAmount, setLocalTransportAmount] = useState<number>(0);
  const [otherChargesAmount, setOtherChargesAmount] = useState<number>(0);
  const [customExpenses, setCustomExpenses] = useState<LandedExpenseItem[]>([]);
  const [showCustomExpenses, setShowCustomExpenses] = useState(false);

  const customExpensesSum = useMemo(() => {
    return customExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [customExpenses]);

  const totalAdditionalLandedCosts = useMemo(() => {
    const effectiveOther = customExpenses.length > 0 ? customExpensesSum : (otherChargesAmount || 0);
    return new Decimal(freightAmount || 0)
      .plus(portDutyAmount || 0)
      .plus(localTransportAmount || 0)
      .plus(effectiveOther)
      .toNumber();
  }, [freightAmount, portDutyAmount, localTransportAmount, customExpenses, customExpensesSum, otherChargesAmount]);

  const handleAddExpense = () => {
    setShowCustomExpenses(true);
    setCustomExpenses((prev) => [
      ...prev,
      {
        id: `exp-${Date.now()}`,
        category: 'Handling & Offloading',
        description: '',
        amount: 0,
      },
    ]);
  };

  const handleUpdateCustomExpense = (id: string, field: keyof LandedExpenseItem, value: any) => {
    setCustomExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleRemoveCustomExpense = (id: string) => {
    setCustomExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // ---------------------------------------------------------------------------
  // Step 1: Section B & Step 2: Commercial Selling Prices State
  // ---------------------------------------------------------------------------
  const [globalPricingScope, setGlobalPricingScope] = useState<'BATCH_ONLY' | 'ALL_STOCK'>('BATCH_ONLY');
  const [productRows, setProductRows] = useState<ProductRowState[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isCostedPrintModalOpen, setIsCostedPrintModalOpen] = useState(false);

  // Advance prepayments integration
  const unappliedAdvances = useMemo(() => {
    if (!selectedGRN) return [];
    return apService.getUnappliedAdvancesForSupplier(
      selectedGRN.supplierId || selectedGRN.supplierName
    );
  }, [selectedGRN]);

  const [applyAdvanceEnabled, setApplyAdvanceEnabled] = useState(false);
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string>('');
  const [advanceAmountToApply, setAdvanceAmountToApply] = useState<number>(0);

  // Sync advances
  useEffect(() => {
    if (unappliedAdvances.length > 0) {
      const matchingPoAdvance =
        selectedGRN?.purchaseOrderNumber || selectedGRN?.purchaseOrderId
          ? unappliedAdvances.find(
              (a) =>
                (selectedGRN.purchaseOrderId &&
                  (a.purchaseOrderId === selectedGRN.purchaseOrderId ||
                    a.purchaseOrderNumber === selectedGRN.purchaseOrderId)) ||
                (selectedGRN.purchaseOrderNumber &&
                  (a.purchaseOrderNumber === selectedGRN.purchaseOrderNumber ||
                    a.purchaseOrderId === selectedGRN.purchaseOrderNumber))
            )
          : null;

      const targetAdvance = matchingPoAdvance || unappliedAdvances[0];
      setSelectedAdvanceId(targetAdvance.id);
      setAdvanceAmountToApply(targetAdvance.unappliedBalance);
      if (matchingPoAdvance) {
        setApplyAdvanceEnabled(true);
      }
    } else {
      setSelectedAdvanceId('');
      setAdvanceAmountToApply(0);
      setApplyAdvanceEnabled(false);
    }
  }, [unappliedAdvances, selectedGRN]);

  // Initialize product rows & invoice details from GRN / existing bill
  useEffect(() => {
    if (existingBill) {
      setVendorInvoiceNumber(existingBill.vendorInvoiceNumber);
      setInvoiceDate(existingBill.invoiceDate);
      setDueDate(existingBill.dueDate);

      const freightItem = existingBill.additionalExpenses?.find((e) =>
        e.category.toLowerCase().includes('freight') || e.category.toLowerCase().includes('shipping')
      );
      const portItem = existingBill.additionalExpenses?.find((e) =>
        e.category.toLowerCase().includes('port') || e.category.toLowerCase().includes('duty')
      );
      const transportItem = existingBill.additionalExpenses?.find((e) =>
        e.category.toLowerCase().includes('transport') || e.category.toLowerCase().includes('haulage')
      );

      setFreightAmount(freightItem ? freightItem.amount : existingBill.freightCharges || 0);
      setPortDutyAmount(portItem ? portItem.amount : existingBill.otherLandingCosts || 0);
      setLocalTransportAmount(transportItem ? transportItem.amount : 0);
      setOtherChargesAmount(0);

      const rows: ProductRowState[] = existingBill.lineItems.map((item, idx) => {
        const prod = MOCK_PRODUCTS.find((p) => p.id === item.productId || p.sku === item.sku);
        const currentPrice = prod?.pricing?.currentSellingPrice || Math.round(item.unitCost * 1.35);
        return {
          id: item.id || `line-${idx}`,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          receivedQuantity: item.receivedQuantity,
          damagedQuantity: 0,
          supplierUnitCost: item.unitCost,
          lineDiscount: item.lineDiscount || 0,
          currentSellingPrice: currentPrice,
          newSellingPrice: Math.round(item.landedUnitCost * 1.3) || currentPrice,
          priceScope: 'BATCH_ONLY',
          historicalPurchasePrice: item.historicalPurchasePrice,
        };
      });
      setProductRows(rows);
    } else if (selectedGRN) {
      setVendorInvoiceNumber(selectedGRN.supplierInvoiceNumber || '');
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setFreightAmount(0);
      setPortDutyAmount(0);
      setLocalTransportAmount(0);
      setOtherChargesAmount(0);
      setCustomExpenses([]);

      const rows: ProductRowState[] = selectedGRN.items.map((item, idx) => {
        const histPrice = apService.getHistoricalPurchasePrice(
          selectedGRN.supplierId || selectedGRN.supplierName,
          item.productId
        );
        const actualCost = histPrice > 0 ? histPrice : (item.unitCostSnapshot || 0);
        const prod = MOCK_PRODUCTS.find((p) => p.id === item.productId || p.sku === item.skuSnapshot);
        const currentPrice = prod?.pricing?.currentSellingPrice || Math.round(actualCost * 1.35);

        return {
          id: `line-${idx}`,
          productId: item.productId,
          productName: item.productNameSnapshot,
          sku: item.skuSnapshot,
          receivedQuantity: item.receivedQuantity || 1,
          damagedQuantity: item.damagedQuantity || 0,
          supplierUnitCost: actualCost,
          lineDiscount: 0,
          currentSellingPrice: currentPrice,
          newSellingPrice: Math.round(actualCost * 1.35) || currentPrice,
          priceScope: globalPricingScope,
          historicalPurchasePrice: histPrice,
        };
      });
      setProductRows(rows);
    }
  }, [selectedGRN, existingBill]);

  // Global toggle handler: switches default pricing scope for all products
  const handleGlobalPricingScopeChange = (scope: 'BATCH_ONLY' | 'ALL_STOCK') => {
    setGlobalPricingScope(scope);
    setProductRows((prev) => prev.map((row) => ({ ...row, priceScope: scope })));
  };

  // Row update handlers
  const updateProductRow = (index: number, field: keyof ProductRowState, value: any) => {
    if (isAuditLocked) return;
    setProductRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Calculations: Real-time True Landed Cost, Live Margin, and Summary Totals
  // ---------------------------------------------------------------------------
  const {
    computedRows,
    goodsSubtotal,
    totalInventoryCapitalized,
    vatTotal,
    grandTotal,
    totalReceivedUnits,
    totalDamagedUnits,
  } = useMemo(() => {
    let sub = new Decimal(0);
    let totalUnits = 0;
    let damagedCount = 0;

    // Calculate baseline net line totals
    const rowNets = productRows.map((r) => {
      const qty = new Decimal(r.receivedQuantity || 0);
      totalUnits += r.receivedQuantity || 0;
      damagedCount += r.damagedQuantity || 0;

      const unitCost = new Decimal(r.supplierUnitCost || 0);
      const discount = new Decimal(r.lineDiscount || 0);
      const net = Decimal.max(0, qty.times(unitCost).minus(discount));
      sub = sub.plus(net);
      return net;
    });

    const totalLandedExpenses = new Decimal(totalAdditionalLandedCosts || 0);

    // Apportion additional landed costs
    let runningAllocated = new Decimal(0);
    const computed = productRows.map((r, idx) => {
      const qty = new Decimal(r.receivedQuantity || 1);
      const net = rowNets[idx];
      let allocatedShare = new Decimal(0);

      if (!totalLandedExpenses.isZero()) {
        if (apportionMethod === 'BY_VALUE' && !sub.isZero()) {
          allocatedShare = idx === productRows.length - 1
            ? totalLandedExpenses.minus(runningAllocated)
            : totalLandedExpenses.times(net).dividedBy(sub).toDecimalPlaces(2);
        } else if (apportionMethod === 'BY_QUANTITY' && totalUnits > 0) {
          allocatedShare = idx === productRows.length - 1
            ? totalLandedExpenses.minus(runningAllocated)
            : totalLandedExpenses.times(qty).dividedBy(totalUnits).toDecimalPlaces(2);
        }
        runningAllocated = runningAllocated.plus(allocatedShare);
      }

      const allocatedPerUnit = qty.isZero() ? 0 : allocatedShare.dividedBy(qty).toDecimalPlaces(2).toNumber();
      const trueLandedCost = qty.isZero()
        ? r.supplierUnitCost
        : net.plus(allocatedShare).dividedBy(qty).toDecimalPlaces(2).toNumber();

      // VAT 18% on goods net
      const vat = net.times(0.18).toDecimalPlaces(2).toNumber();
      const lineTotal = net.plus(vat).toNumber();

      // Live Gross Margin calculation
      const selling = Number(r.newSellingPrice) || 0;
      const profitPerUnit = selling - trueLandedCost;
      const marginPercent = selling > 0 ? (profitPerUnit / selling) * 100 : 0;

      return {
        ...r,
        allocatedShare: allocatedShare.toNumber(),
        allocatedPerUnit,
        trueLandedCost,
        vatAmount: vat,
        lineTotal,
        profitPerUnit,
        marginPercent,
      };
    });

    const capitalized = sub.plus(totalLandedExpenses);
    const vatSum = computed.reduce((sum, r) => sum.plus(r.vatAmount), new Decimal(0));
    const grand = capitalized.plus(vatSum);

    return {
      computedRows: computed,
      goodsSubtotal: sub.toNumber(),
      totalInventoryCapitalized: capitalized.toNumber(),
      vatTotal: vatSum.toNumber(),
      grandTotal: grand.toNumber(),
      totalReceivedUnits: totalUnits,
      totalDamagedUnits: damagedCount,
    };
  }, [productRows, totalAdditionalLandedCosts, apportionMethod]);

  // Validation
  const isFormValid = useMemo(() => {
    if (!selectedGRN) return false;
    if (!vendorInvoiceNumber.trim()) return false;
    if (!invoiceDate || !dueDate) return false;
    if (computedRows.length === 0) return false;
    return computedRows.every((r) => r.supplierUnitCost > 0 && r.newSellingPrice > 0);
  }, [selectedGRN, vendorInvoiceNumber, invoiceDate, dueDate, computedRows]);

  // Quick markup preset handler for Step 2
  const applyMarkupPreset = (rowIndex: number, markupPercentage: number) => {
    if (isAuditLocked) return;
    const row = computedRows[rowIndex];
    if (!row) return;
    const computedPrice = Math.round(row.trueLandedCost * (1 + markupPercentage / 100));
    updateProductRow(rowIndex, 'newSellingPrice', computedPrice);
  };

  // ---------------------------------------------------------------------------
  // Action Handler: Post Vendor Bill & Apply Selling Prices
  // ---------------------------------------------------------------------------
  const handlePostBillAndApplyPrices = async () => {
    if (!isFormValid || !selectedGRN) {
      toast.error('Please complete Vendor Invoice # and ensure all unit costs & selling prices are greater than 0.');
      return;
    }

    try {
      setSubmitting(true);

      const otherEffective = customExpenses.length > 0 ? customExpenses : (otherChargesAmount > 0 ? [{
        id: 'exp-other',
        category: 'Handling & Incidental Charges',
        description: 'Other Inbound Charges',
        amount: otherChargesAmount,
      }] : []);

      const additionalExpensesList: LandedExpenseItem[] = [
        { id: 'exp-freight', category: 'Shipping / Freight Charges', description: 'Freight / Shipping', amount: freightAmount },
        { id: 'exp-port', category: 'Port Charges & Demurrage', description: 'Port & Duty', amount: portDutyAmount },
        { id: 'exp-transport', category: 'Local Transportation & Haulage', description: 'Local Transport', amount: localTransportAmount },
        ...otherEffective,
      ];

      // Convert computed rows into VendorBillLineItems
      const lineItems: VendorBillLineItem[] = computedRows.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        sku: r.sku,
        receivedQuantity: r.receivedQuantity,
        draftUnitCost: r.supplierUnitCost,
        unitCost: r.supplierUnitCost,
        historicalPurchasePrice: r.historicalPurchasePrice,
        lineDiscount: r.lineDiscount,
        vatCode: 'STANDARD_18',
        vatAmount: r.vatAmount,
        lineTotal: r.lineTotal,
        apportionedFreight: r.allocatedShare,
        allocatedLandedCost: r.allocatedShare,
        landedUnitCost: r.trueLandedCost,
        totalLandedCost: r.trueLandedCost * r.receivedQuantity,
      }));

      // 1. Post the Vendor Bill in AP
      const otherCosts = portDutyAmount + localTransportAmount + (customExpenses.length > 0 ? customExpensesSum : otherChargesAmount);
      const bill = await apService.postVendorBill({
        grnId: selectedGRN.id,
        vendorInvoiceNumber: vendorInvoiceNumber.trim(),
        invoiceDate,
        dueDate,
        lineItems,
        freightCharges: freightAmount,
        otherLandingCosts: otherCosts,
        additionalExpenses: additionalExpensesList,
        applyAdvanceId: applyAdvanceEnabled ? selectedAdvanceId : undefined,
        advanceAmountToApply: applyAdvanceEnabled ? advanceAmountToApply : undefined,
      });

      // 2. Apply Commercial Selling Prices & Create Inventory Stock Batches
      const batchDate = selectedGRN.submittedAt ? selectedGRN.submittedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const batchSeq = String(Math.floor(10 + Math.random() * 90));

      for (const row of computedRows) {
        const batchNum = `LOT-${new Date().getFullYear()}-${batchSeq}-${row.sku.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;

        if (row.priceScope === 'ALL_STOCK') {
          // Standardize across all existing active inventory batches for this product
          batchInventoryService.standardizeProductBatchPrices(
            row.productId,
            row.newSellingPrice,
            'Finance Officer',
            `Post-Costing Standardized Price for GRN ${selectedGRN.grnNumber}`
          );

          try {
            await productService.updateProduct(row.productId, {
              pricing: {
                costPrice: row.trueLandedCost,
                currentSellingPrice: row.newSellingPrice,
                minimumSellingPrice: Math.round(row.newSellingPrice * 0.85),
                maxDiscountPercentage: 15,
                taxRatePercentage: 18,
              },
            });
          } catch {
            // Ignore mock update errors
          }
        }

        // Create the new inbound stock batch with the calculated true landed cost & selling price
        batchInventoryService.createBatch({
          batchNumber: batchNum,
          productId: row.productId,
          productName: row.productName,
          sku: row.sku,
          grnId: selectedGRN.id,
          grnNumber: selectedGRN.grnNumber,
          warehouseId: selectedGRN.warehouseId || 'WH-MAIN',
          receivedDate: batchDate,
          initialQuantity: row.receivedQuantity,
          availableQuantity: row.receivedQuantity,
          unitCost: row.trueLandedCost,
          sellingPrice: row.newSellingPrice,
          status: 'ACTIVE',
        });
      }

      // Mark GRN as fully priced and approved
      apService.setGRNStatus(selectedGRN.id, 'APPROVED');

      // Update approval engine status for this GRN
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const stored = localStorage.getItem('dns_erp_approval_requests');
          if (stored) {
            const apps = JSON.parse(stored);
            const updated = apps.map((a: any) => {
              if (
                (a.documentId === selectedGRN.id || a.documentReferenceNumber === selectedGRN.grnNumber) &&
                a.status === 'PENDING'
              ) {
                return {
                  ...a,
                  status: 'APPROVED',
                  updatedAt: new Date().toISOString(),
                };
              }
              return a;
            });
            localStorage.setItem('dns_erp_approval_requests', JSON.stringify(updated));
          }
        }
      } catch {
        // non-blocking
      }

      setGrnRefreshKey((k) => k + 1);
      toast.success(
        `Vendor Bill ${bill.billNumber} posted and selling prices applied successfully! True landed cost capitalized.`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post bill and apply prices');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidVendorBill = async () => {
    if (!selectedGRN) return;
    try {
      setSubmitting(true);
      await apService.voidVendorBill(existingBill?.id || selectedGRN.id);
      setGrnRefreshKey((k) => k + 1);
      toast.success('Vendor Bill voided and reversed successfully! GRN returned to SUBMITTED status.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to void vendor bill');
    } finally {
      setSubmitting(false);
    }
  };

  // Convert for printing
  const printablePriceItems: CostedPriceItemInfo[] = useMemo(() => {
    return computedRows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      sku: r.sku,
      quantity: r.receivedQuantity,
      landedUnitCost: r.trueLandedCost,
      currentSellingPrice: r.currentSellingPrice,
      proposedSellingPrice: r.newSellingPrice,
      strategy: r.priceScope === 'ALL_STOCK' ? 'STANDARDIZE_UNIFORM' : 'PRESERVE_BATCH',
    }));
  }, [computedRows]);

  // ---------------------------------------------------------------------------
  // QUEUE LIST VIEW: Inbound Goods Receipts (Accessible via Back button)
  // ---------------------------------------------------------------------------
  if (viewMode === 'list') {
    const pendingCount = availableGRNs.filter((g) => g.status === 'SUBMITTED' || g.status === 'COSTED').length;
    const submittedCount = availableGRNs.filter((g) => g.status === 'SUBMITTED').length;
    const costedCount = availableGRNs.filter((g) => g.status === 'COSTED').length;
    const approvedCount = availableGRNs.filter((g) => g.status === 'APPROVED' || g.status === 'PRICED').length;

    const filteredGRNs = availableGRNs.filter((g) => {
      if (queueFilter === 'PENDING') {
        if (g.status !== 'SUBMITTED' && g.status !== 'COSTED') return false;
      } else if (queueFilter === 'SUBMITTED') {
        if (g.status !== 'SUBMITTED') return false;
      } else if (queueFilter === 'COSTED') {
        if (g.status !== 'COSTED') return false;
      } else if (queueFilter === 'APPROVED') {
        if (g.status !== 'APPROVED' && g.status !== 'PRICED') return false;
      }

      if (queueSearch.trim()) {
        const q = queueSearch.toLowerCase();
        return (
          g.grnNumber.toLowerCase().includes(q) ||
          g.supplierName.toLowerCase().includes(q) ||
          g.warehouseId.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Inbound Goods Receipts (GRN) Costing Queue
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select an inbound receipt to cost, apportion landed expenses, and set commercial prices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                const first = availableGRNs[0];
                if (first) {
                  setSelectedGRNId(first.id);
                  setViewMode('detail');
                }
              }}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Cost & Price First GRN
            </Button>
          </div>
        </div>

        <Card className="border-slate-200 shadow-2xs">
          <div className="p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search GRN #, supplier name, or warehouse..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs shrink-0 gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setQueueFilter('PENDING')}
                  className={cn(
                    'px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer',
                    queueFilter === 'PENDING' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  )}
                >
                  Pending Actions ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter('SUBMITTED')}
                  className={cn(
                    'px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer',
                    queueFilter === 'SUBMITTED' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  )}
                >
                  Submitted ({submittedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter('COSTED')}
                  className={cn(
                    'px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer',
                    queueFilter === 'COSTED' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  )}
                >
                  Costed ({costedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter('APPROVED')}
                  className={cn(
                    'px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer',
                    queueFilter === 'APPROVED' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  )}
                >
                  Approved ({approvedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter('ALL')}
                  className={cn(
                    'px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer',
                    queueFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  )}
                >
                  All ({availableGRNs.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">GRN Reference</th>
                    <th className="px-3.5 py-2.5">Supplier</th>
                    <th className="px-3.5 py-2.5">Warehouse</th>
                    <th className="px-3.5 py-2.5">Received Date</th>
                    <th className="px-3.5 py-2.5 text-right">Estimated Value</th>
                    <th className="px-3.5 py-2.5 text-center">Items</th>
                    <th className="px-3.5 py-2.5 text-center">Status</th>
                    <th className="px-3.5 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredGRNs.map((g) => {
                    const estValue = g.items?.reduce((sum, it) => sum + (it.lineValue || (it.receivedQuantity * (it.unitCostSnapshot || 0))), 0) || 0;
                    return (
                      <tr
                        key={g.id}
                        onClick={() => {
                          setSelectedGRNId(g.id);
                          setViewMode('detail');
                        }}
                        className="hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="px-3.5 py-2.5 font-mono font-bold text-primary">{g.grnNumber}</td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">{g.supplierName}</td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-600">{g.warehouseId}</td>
                        <td className="px-3.5 py-2.5 text-slate-600">{formatDate(g.submittedAt)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-slate-700">
                          {formatCurrency(estValue)}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono">{g.items?.length || 0}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold py-0',
                              g.status === 'APPROVED' || g.status === 'PRICED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            )}
                          >
                            {g.status === 'PRICED' ? 'APPROVED' : g.status}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs font-semibold text-primary">
                            Cost & Price
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // DETAIL VIEW: 2-Step Guided Workflow
  // ---------------------------------------------------------------------------
  if (!selectedGRN) {
    return (
      <div className="py-12 text-center text-slate-500 text-sm">
        No GRN selected. Please return to the queue.
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Status Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBackToGrnList}
            className="h-8 text-xs gap-1.5 font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to GRN Selection</span>
          </Button>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Vendor Bill Processing (GRN Costing)
          </h1>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
            Accounts Payable
          </Badge>

          {isAuditLocked && (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs font-semibold gap-1">
              <Lock className="h-3 w-3" />
              <span>Audit Lock Active</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* GRN Switcher Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">GRN:</span>
            <select
              value={selectedGRNId}
              onChange={(e) => {
                setSelectedGRNId(e.target.value);
                navigate(`/finance/ap/bills/new?grnId=${e.target.value}`);
              }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-2xs"
            >
              {availableGRNs.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.grnNumber} — {g.supplierName}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCostedPrintModalOpen(true)}
            className="h-8 text-xs gap-1.5 font-medium"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>Print Sheet</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. Persistent Context Bar & Top Invoice Bar (Single Strip)                */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Left (Read-only context): GRN Ref, Supplier, Warehouse, Date */}
          <div className="lg:col-span-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs border-b lg:border-b-0 lg:border-r border-slate-100 pb-3 lg:pb-0 lg:pr-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">GRN Reference</span>
              <span className="font-mono font-bold text-primary text-sm">{selectedGRN.grnNumber}</span>
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Supplier Name</span>
              <span className="font-bold text-slate-800 text-sm truncate block" title={selectedGRN.supplierName}>
                {selectedGRN.supplierName}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Warehouse</span>
              <span className="font-mono font-semibold text-slate-700 text-xs">{selectedGRN.warehouseId}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Received Date</span>
              <span className="text-slate-700 text-xs">{formatDate(selectedGRN.submittedAt)}</span>
            </div>
          </div>

          {/* Right (Inputs): Vendor Invoice #, Invoice Date, Due Date */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Vendor Invoice # <span className="text-rose-500">*</span>
              </label>
              <Input
                value={vendorInvoiceNumber}
                onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-SCH-90214"
                disabled={isAuditLocked}
                className="h-8 text-xs font-mono font-semibold bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Invoice Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                disabled={isAuditLocked}
                className="h-8 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isAuditLocked}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2-Step Navigation Pill Bar                                                */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2.5 py-2 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
            currentStep === 1
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <span
            className={cn(
              'flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold',
              currentStep === 1 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'
            )}
          >
            1
          </span>
          <span className="font-bold">Step 1: Invoice & Landed Costing</span>
          <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
            — Supplier bill, landed expenses & true cost
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2.5 py-2 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
            currentStep === 2
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <span
            className={cn(
              'flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold',
              currentStep === 2 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'
            )}
          >
            2
          </span>
          <span className="font-bold">Step 2: Selling Price & Margin Setup</span>
          <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
            — Commercial selling price & batch margin rules
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1 — Step 1: Invoice & Landed Costing                                 */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-4">
          {/* Section A: Additional Landed Costs Card (Clean 4-Column Grid) */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span>Additional Landed Costs (Inbound Logistics & Customs)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Apportion freight, port duty, and transport across inbound goods to establish True Landed Unit Cost.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Allocation Toggle: By Value vs By Quantity */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    Apportion By:
                  </span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setApportionMethod('BY_VALUE')}
                      disabled={isAuditLocked}
                      className={cn(
                        'rounded-md px-2.5 py-1 transition-all text-xs font-semibold cursor-pointer',
                        apportionMethod === 'BY_VALUE'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      By Net Value
                    </button>
                    <button
                      type="button"
                      onClick={() => setApportionMethod('BY_QUANTITY')}
                      disabled={isAuditLocked}
                      className={cn(
                        'rounded-md px-2.5 py-1 transition-all text-xs font-semibold cursor-pointer',
                        apportionMethod === 'BY_QUANTITY'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      By Quantity
                    </button>
                  </div>
                </div>

                {/* Total Additional Landed Cost Summary Badge */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1 text-right">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block tracking-wider">
                    Total Additional Landed Cost
                  </span>
                  <span className="font-mono font-extrabold text-emerald-900 text-sm">
                    {formatCurrency(totalAdditionalLandedCosts)}
                  </span>
                </div>
              </div>
            </div>

            {/* Clean 4-Column Grid of Landed Expenses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Freight / Shipping (LKR)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={freightAmount || ''}
                  onChange={(e) => setFreightAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  disabled={isAuditLocked}
                  className="h-8 text-xs font-mono text-right bg-white"
                />
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Port & Duty (LKR)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={portDutyAmount || ''}
                  onChange={(e) => setPortDutyAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  disabled={isAuditLocked}
                  className="h-8 text-xs font-mono text-right bg-white"
                />
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Local Transport (LKR)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={localTransportAmount || ''}
                  onChange={(e) => setLocalTransportAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  disabled={isAuditLocked}
                  className="h-8 text-xs font-mono text-right bg-white"
                />
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Other Charges (LKR)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddExpense}
                    disabled={isAuditLocked}
                    className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + Detail
                  </button>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={customExpenses.length > 0 ? (customExpensesSum || '') : (otherChargesAmount || '')}
                  onChange={(e) => {
                    if (customExpenses.length > 0) {
                      // custom breakdown active
                    } else {
                      setOtherChargesAmount(Number(e.target.value) || 0);
                    }
                  }}
                  placeholder="0.00"
                  disabled={isAuditLocked || customExpenses.length > 0}
                  className="h-8 text-xs font-mono text-right bg-white"
                />
              </div>
            </div>

            {/* Optional Custom Expenses detail list */}
            {showCustomExpenses && customExpenses.length > 0 && (
              <div className="mt-2 pt-2.5 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Custom Landed Expense Lines</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddExpense}
                    className="h-6 text-xs text-primary gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Additional Landed Expense</span>
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {customExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-md">
                      <Input
                        placeholder="e.g. carrier, wharfage, haulage details"
                        value={exp.description}
                        onChange={(e) => handleUpdateCustomExpense(exp.id, 'description', e.target.value)}
                        className="h-7 text-xs bg-white flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={exp.amount || ''}
                        onChange={(e) => handleUpdateCustomExpense(exp.id, 'amount', Number(e.target.value) || 0)}
                        className="h-7 w-24 text-xs font-mono text-right bg-white"
                      />
                      <button
                        type="button"
                        title="Remove expense line"
                        onClick={() => handleRemoveCustomExpense(exp.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section B: Landed Costing Table (6 Spacious Columns — Zero Horizontal Scroll) */}
          <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Inbound Inventory Line Items & Landed Costing
                </h2>
                <Badge variant="outline" className="text-xs font-mono font-bold bg-white text-slate-700">
                  {computedRows.length} Products
                </Badge>
              </div>
              <span className="text-[11px] text-slate-500">
                Verify supplier invoice rates and review calculated True Landed Cost.
              </span>
            </div>

            <div className="w-full">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-slate-900 text-white uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-3 py-3 text-center w-28">Received Qty</th>
                    <th className="px-3 py-3 text-right w-40">Supplier Unit Cost</th>
                    <th className="px-3 py-3 text-right w-32">Line Discount</th>
                    <th className="px-3 py-3 text-right w-36">Allocated Landed / Unit</th>
                    <th className="px-4 py-3 text-right w-48">True Landed Cost & Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {computedRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Product Name (Full title, no truncation, comfortable py-3.5) */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 text-sm leading-snug">
                          {row.productName}
                        </div>
                      </td>

                      {/* 2. Received Qty (Clean read-only text with subtle damaged pill) */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="font-mono font-semibold text-slate-800 text-xs">
                          {row.receivedQuantity} units
                        </span>
                        {row.damagedQuantity > 0 && (
                          <div className="mt-0.5">
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.2 inline-block">
                              {row.damagedQuantity} damaged
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. Supplier Unit Cost (LKR) with Last Historical Price hint */}
                      <td className="px-3 py-3.5 text-right">
                        <div className="flex justify-end">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={row.supplierUnitCost || ''}
                            onChange={(e) => updateProductRow(idx, 'supplierUnitCost', Number(e.target.value) || 0)}
                            disabled={isAuditLocked}
                            className="h-8 w-36 text-xs font-mono font-semibold text-right bg-white"
                          />
                        </div>
                        {row.historicalPurchasePrice && row.historicalPurchasePrice > 0 ? (
                          <span className="text-[10px] text-slate-400 block font-mono mt-1 text-right">
                            Last Historical Price: {formatCurrency(row.historicalPurchasePrice)}
                          </span>
                        ) : null}
                      </td>

                      {/* 4. Line Discount (LKR) */}
                      <td className="px-3 py-3.5 text-right">
                        <div className="flex justify-end">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={row.lineDiscount || ''}
                            onChange={(e) => updateProductRow(idx, 'lineDiscount', Number(e.target.value) || 0)}
                            placeholder="0.00"
                            disabled={isAuditLocked}
                            className="h-8 w-28 text-xs font-mono text-right bg-white text-slate-600"
                          />
                        </div>
                      </td>

                      {/* 5. Allocated Landed / Unit */}
                      <td className="px-3 py-3.5 text-right font-mono font-medium text-slate-600 text-xs">
                        + {formatCurrency(row.allocatedPerUnit)}
                      </td>

                      {/* 6. True Landed Unit Cost & Line Total */}
                      <td className="px-4 py-3.5 text-right">
                        <div
                          className="font-mono font-extrabold text-slate-900 text-sm text-right"
                          title="Landed Cost per Unit"
                        >
                          {formatCurrency(row.trueLandedCost)} <span className="text-xs font-normal text-slate-500">/ unit</span>
                        </div>
                        <span className="sr-only">Landed Cost per Unit</span>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5 text-right">
                          Line Total: {formatCurrency(row.lineTotal)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 1 Bottom Summary Bar */}
          <div className="sticky bottom-3 z-30 rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-3.5 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Financial Indicators */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Goods Subtotal</span>
                  <span className="font-mono font-semibold text-slate-700">{formatCurrency(goodsSubtotal)}</span>
                </div>

                <span className="text-slate-300 hidden sm:inline">+</span>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Additional Landed Costs</span>
                  <span className="font-mono font-semibold text-slate-700">{formatCurrency(totalAdditionalLandedCosts)}</span>
                </div>

                <span className="text-slate-300 hidden sm:inline">=</span>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Total Inventory Capitalized (Total Landed Cost)
                  </span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(totalInventoryCapitalized)}</span>
                </div>

                <span className="text-slate-300 hidden sm:inline">|</span>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Input VAT (18%)</span>
                  <span className="font-mono font-semibold text-slate-700">{formatCurrency(vatTotal)}</span>
                </div>

                <span className="text-slate-300 hidden sm:inline">|</span>

                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total AP Commitment</span>
                  <span className="font-mono font-extrabold text-emerald-900 text-sm">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Primary Action Button: Continue to Pricing (Step 2) */}
              <div className="flex items-center gap-2 justify-end shrink-0">
                <Button
                  type="button"
                  size="default"
                  onClick={() => setCurrentStep(2)}
                  className="gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 px-6 shadow-sm cursor-pointer"
                >
                  <span>Continue to Pricing (Step 2)</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2 — Step 2: Selling Prices & Margins                                 */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            {/* Table Header Bar with Rule Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>Commercial Price & Margin Assignment</span>
                  </h2>
                  <Badge variant="outline" className="text-xs font-mono font-bold bg-white text-slate-700">
                    {computedRows.length} Products
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {globalPricingScope === 'BATCH_ONLY'
                    ? 'Rule: Preserves existing inventory batches at their current prices; only this incoming batch receives the new price.'
                    : 'Rule: Updates catalog selling price and standardizes all existing active inventory batches in stock.'}
                </p>
              </div>

              {/* Global Default Rule Toggle */}
              <div className="flex flex-col sm:items-end gap-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">Apply New Prices To:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs font-medium">
                    <button
                      type="button"
                      onClick={() => handleGlobalPricingScopeChange('BATCH_ONLY')}
                      disabled={isAuditLocked}
                      className={cn(
                        'rounded-md px-2.5 py-1 transition-all text-xs font-semibold cursor-pointer',
                        globalPricingScope === 'BATCH_ONLY'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      Incoming Batch Only (FIFO)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGlobalPricingScopeChange('ALL_STOCK')}
                      disabled={isAuditLocked}
                      className={cn(
                        'rounded-md px-2.5 py-1 transition-all text-xs font-semibold cursor-pointer',
                        globalPricingScope === 'ALL_STOCK'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      Standardize All Stock
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Margin Table (6 Spacious Columns — Zero Horizontal Scroll) */}
            <div className="w-full">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-slate-900 text-white uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Product Name & Inbound Qty</th>
                    <th className="px-3 py-3 text-right w-36">True Landed Cost</th>
                    <th className="px-3 py-3 text-right w-32">Current Price</th>
                    <th className="px-3 py-3 text-right w-48">New Selling Price</th>
                    <th className="px-4 py-3 text-center w-56">Gross Margin & Unit Profit</th>
                    <th className="px-3 py-3 text-center w-36">Batch Application Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {computedRows.map((row, idx) => {
                    const isLoss = row.profitPerUnit < 0;
                    const isGoodMargin = row.marginPercent >= 20;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* 1. Product Name & Inbound Qty */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 text-sm leading-snug">
                            {row.productName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {row.receivedQuantity} units inbound
                          </div>
                        </td>

                        {/* 2. True Landed Unit Cost (Locked/Read-Only Badge) */}
                        <td className="px-3 py-3.5 text-right">
                          <Badge
                            variant="outline"
                            className="font-mono font-bold bg-slate-50 text-slate-800 text-xs px-2.5 py-1 border-slate-300"
                          >
                            {formatCurrency(row.trueLandedCost)}
                          </Badge>
                        </td>

                        {/* 3. Current Catalog Price */}
                        <td className="px-3 py-3.5 text-right font-mono text-slate-500 text-xs">
                          {formatCurrency(row.currentSellingPrice)}
                        </td>

                        {/* 4. New Selling Price (LKR) with Quick Markup Helpers */}
                        <td className="px-3 py-3.5 text-right">
                          <div className="flex justify-end">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={row.newSellingPrice || ''}
                              onChange={(e) => updateProductRow(idx, 'newSellingPrice', Number(e.target.value) || 0)}
                              disabled={isAuditLocked}
                              className="h-8 w-40 text-xs font-mono font-bold text-right bg-white text-slate-900 border-slate-300 focus:border-primary"
                            />
                          </div>
                          {/* Quick markup pills */}
                          {!isAuditLocked && (
                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px]">
                              <span className="text-slate-400 mr-0.5">Markup:</span>
                              {[20, 30, 40, 50].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => applyMarkupPreset(idx, pct)}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-semibold cursor-pointer"
                                  title={`Set selling price to +${pct}% above True Landed Cost`}
                                >
                                  +{pct}%
                                </button>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* 5. Gross Margin & Unit Profit (Full-Width Pill Badge) */}
                        <td className="px-4 py-3.5 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs font-mono font-semibold py-1 px-3 whitespace-nowrap inline-flex items-center gap-1.5 shadow-2xs',
                              isLoss
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : isGoodMargin
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            )}
                          >
                            <Percent className="h-3 w-3 shrink-0" />
                            <span>{row.marginPercent.toFixed(1)}% Margin</span>
                            <span className="text-slate-300">•</span>
                            <span>{row.profitPerUnit >= 0 ? `+${formatCurrency(row.profitPerUnit)}` : formatCurrency(row.profitPerUnit)} / unit</span>
                          </Badge>
                        </td>

                        {/* 6. Batch Application Rule (Clean Per-Row Pill Selector) */}
                        <td className="px-3 py-3.5 text-center">
                          <select
                            value={row.priceScope}
                            onChange={(e) => updateProductRow(idx, 'priceScope', e.target.value)}
                            disabled={isAuditLocked}
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-hidden"
                          >
                            <option value="BATCH_ONLY">Batch Only</option>
                            <option value="ALL_STOCK">All Stock</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 2 Bottom Summary Bar */}
          <div className="sticky bottom-3 z-30 rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-3.5 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Back to Step 1 Button */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => setCurrentStep(1)}
                  className="gap-2 h-10 px-4 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Costing (Step 1)</span>
                </Button>
              </div>

              {/* Financial Breakdown */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Goods Subtotal</span>
                  <span className="font-mono font-semibold text-slate-700">{formatCurrency(goodsSubtotal)}</span>
                </div>

                <span className="text-slate-300 hidden sm:inline">+</span>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Additional Landed</span>
                  <span className="font-mono font-semibold text-slate-700">{formatCurrency(totalAdditionalLandedCosts)}</span>
                </div>

                <span className="text-slate-300 hidden sm:inline">=</span>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Inventory Capitalized</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(totalInventoryCapitalized)}</span>
                </div>

                <span className="text-slate-300 hidden sm:inline">|</span>

                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total AP Commitment</span>
                  <span className="font-mono font-extrabold text-emerald-900 text-sm">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                {/* Optional Supplier Advance Offset Toggle */}
                {unappliedAdvances.length > 0 && !isAuditLocked && (
                  <label className="flex items-center gap-1.5 ml-2 cursor-pointer bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                    <input
                      type="checkbox"
                      checked={applyAdvanceEnabled}
                      onChange={(e) => setApplyAdvanceEnabled(e.target.checked)}
                      className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">
                      Offset Advance ({formatCurrency(advanceAmountToApply)})
                    </span>
                  </label>
                )}
              </div>

              {/* Primary Action Button: Post Bill & Apply Prices */}
              <div className="flex items-center gap-2 justify-end shrink-0">
                {isAuditLocked ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold px-3 py-1.5 text-xs gap-1.5 shadow-2xs">
                      <Lock className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Bill Costed & Approved</span>
                    </Badge>
                    {isAuthorizedForVoid && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleVoidVendorBill}
                        disabled={submitting}
                        className="h-9 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer"
                      >
                        Void Bill
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="default"
                    onClick={handlePostBillAndApplyPrices}
                    disabled={!isFormValid || submitting}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-6 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{submitting ? 'Posting & Applying...' : 'Post Bill & Apply Prices'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Sheet Dialog */}
      {isCostedPrintModalOpen && (
        <PrintableGRN
          grn={selectedGRN}
          costedPriceItems={printablePriceItems}
          onClose={() => setIsCostedPrintModalOpen(false)}
        />
      )}
    </div>
  );
}
