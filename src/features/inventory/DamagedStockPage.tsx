import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { inventoryService } from '../../services/InventoryService';
import { apService } from '../finance/services/apService';
import { useFinanceLedger } from '../finance/hooks/useFinanceLedger';
import { SupplierDebitNote } from '../finance/api/types';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { StockBalance, StockMovement } from '../../types/inventory';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertTriangle,
  RotateCcw,
  Trash2,
  Undo2,
  Search,
  Building2,
  Package,
  Wrench,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Boxes,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export function DamagedStockPage() {
  const { currentUser } = useAuth();
  const { suppliers } = useFinanceLedger();
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [debitNotes, setDebitNotes] = useState<SupplierDebitNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');

  // Modal States
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [scrapModalOpen, setScrapModalOpen] = useState(false);
  const [repairModalOpen, setRepairModalOpen] = useState(false);

  // Active item for modal action
  const [activeItem, setActiveItem] = useState<{
    balance: StockBalance;
    product: (typeof MOCK_PRODUCTS)[0];
  } | null>(null);

  // Modal Form Inputs
  const [actionQuantity, setActionQuantity] = useState<number>(1);
  const [actionReason, setActionReason] = useState<string>('');
  const [actionSupplierId, setActionSupplierId] = useState<string>('');
  const [actionUnitCost, setActionUnitCost] = useState<number>(0);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allBalances, allMovements] = await Promise.all([
        inventoryService.getAllStockBalances(),
        inventoryService.getStockMovements(),
      ]);
      const allDebitNotes = apService.getDebitNotes();
      setBalances(allBalances);
      setMovements(allMovements);
      setDebitNotes(allDebitNotes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter only balances that have damaged quantity
  const damagedItems = useMemo(() => {
    return balances
      .filter((b) => (b.damagedQuantity || 0) > 0)
      .map((b) => {
        const prod = MOCK_PRODUCTS.find((p) => p.id === b.productId) || {
          id: b.productId,
          name: 'Unknown Product',
          sku: b.productId,
          categoryName: 'General',
          pricing: { costPrice: 0, retailPrice: 0, wholesalePrice: 0 },
        };
        const unitCost = (prod.pricing as any)?.costPrice || 2000;
        const totalValuation = (b.damagedQuantity || 0) * unitCost;
        return {
          balance: b,
          product: prod,
          unitCost,
          totalValuation,
        };
      });
  }, [balances]);

  // Filtered damaged items
  const filteredDamagedItems = useMemo(() => {
    return damagedItems.filter((item) => {
      const matchesSearch =
        item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.balance.locationId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation =
        selectedLocation === 'ALL' || item.balance.locationId === selectedLocation;
      return matchesSearch && matchesLocation;
    });
  }, [damagedItems, searchQuery, selectedLocation]);

  // Overall KPIs
  const totalDamagedUnits = useMemo(() => {
    return damagedItems.reduce((sum, item) => sum + (item.balance.damagedQuantity || 0), 0);
  }, [damagedItems]);

  const totalDamagedValuation = useMemo(() => {
    return damagedItems.reduce((sum, item) => sum + item.totalValuation, 0);
  }, [damagedItems]);

  const pendingDebitNotes = useMemo(() => {
    return debitNotes.length > 0 ? debitNotes : apService.getDebitNotes();
  }, [debitNotes]);

  // Open Return to Supplier Modal
  const handleOpenReturnModal = (item: (typeof damagedItems)[0]) => {
    setActiveItem(item);
    setActionQuantity(1);
    setActionReason('Defective OEM components returned under warranty claim');
    setActionUnitCost(item.unitCost);
    setActionSupplierId(suppliers[0]?.id || 'sup-001');
    setReturnModalOpen(true);
  };

  // Open Scrap / Write-Off Modal
  const handleOpenScrapModal = (item: (typeof damagedItems)[0]) => {
    setActiveItem(item);
    setActionQuantity(1);
    setActionReason('Irreparable physical damage during storage handling');
    setScrapModalOpen(true);
  };

  // Open Repair & Restore Modal
  const handleOpenRepairModal = (item: (typeof damagedItems)[0]) => {
    setActiveItem(item);
    setActionQuantity(1);
    setActionReason('Internal contacts cleaned, re-aligned, and certified operational');
    setRepairModalOpen(true);
  };

  // 1. Submit Return to Supplier via Debit Note
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (actionQuantity <= 0 || actionQuantity > activeItem.balance.damagedQuantity) {
      toast.error(`Return quantity must be between 1 and ${activeItem.balance.damagedQuantity}`);
      return;
    }
    const effectiveSupplierId = actionSupplierId || suppliers[0]?.id || 'sup-001';
    const sup = suppliers.find((s) => s.id === effectiveSupplierId) || {
      id: effectiveSupplierId,
      name: 'Schneider Electric Lanka (Pvt) Ltd',
    };
    try {
      setProcessing(true);
      // 1. Create Debit Note in Accounts Payable
      const debitNote = await apService.postSupplierDebitNote({
        supplierId: effectiveSupplierId,
        supplierName: sup.name,
        date: new Date().toISOString().slice(0, 10),
        reason: actionReason.trim(),
        lineItems: [
          {
            productId: activeItem.product.id,
            productName: activeItem.product.name,
            sku: activeItem.product.sku,
            damagedQuantity: actionQuantity,
            unitCost: actionUnitCost,
            lineTotal: actionQuantity * actionUnitCost,
            reason: actionReason.trim(),
          },
        ],
      });

      // 2. Decrement damaged stock and add movement via inventoryService
      await inventoryService.executeDamageSupplierReturn(
        activeItem.product.id,
        activeItem.balance.locationId,
        actionQuantity,
        currentUser,
        debitNote.debitNoteNumber,
        sup.name,
        actionReason
      );

      toast.success(
        `Supplier Debit Note ${debitNote.debitNoteNumber} issued! ${actionQuantity} damaged unit(s) cleared and Accounts Payable reduced.`
      );
      setReturnModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to return stock to supplier');
    } finally {
      setProcessing(false);
    }
  };

  // 2. Submit Scrap / Write-Off
  const handleSubmitScrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (actionQuantity <= 0 || actionQuantity > activeItem.balance.damagedQuantity) {
      toast.error(`Scrap quantity must be between 1 and ${activeItem.balance.damagedQuantity}`);
      return;
    }
    if (!actionReason.trim()) {
      toast.error('Scrap disposal justification note is mandatory');
      return;
    }

    try {
      setProcessing(true);
      await inventoryService.executeDamageScrap(
        activeItem.product.id,
        activeItem.balance.locationId,
        actionQuantity,
        currentUser,
        actionReason
      );

      toast.success(
        `Written off ${actionQuantity} unit(s) of ${activeItem.product.name} to scrap loss.`
      );
      setScrapModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to write off damaged stock');
    } finally {
      setProcessing(false);
    }
  };

  // 3. Submit Repair & Restore to Available Stock
  const handleSubmitRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (actionQuantity <= 0 || actionQuantity > activeItem.balance.damagedQuantity) {
      toast.error(`Restore quantity must be between 1 and ${activeItem.balance.damagedQuantity}`);
      return;
    }

    try {
      setProcessing(true);
      await inventoryService.executeDamageReversal(
        activeItem.product.id,
        activeItem.balance.locationId,
        actionQuantity,
        currentUser
      );

      toast.success(
        `Repaired and restored ${actionQuantity} unit(s) of ${activeItem.product.name} back to available stock!`
      );
      setRepairModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to restore damaged stock');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Damaged Product &amp; RMA Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Quarantine control, supplier debit notes, scrap write-offs, and warehouse restoration.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-9 text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Inventory Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2 text-xs font-medium">
        <Link
          to="/inventory"
          className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          Overview
        </Link>
        <Link
          to="/inventory/stock"
          className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          Stock Balances
        </Link>
        <Link
          to="/inventory/grn"
          className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          Goods Receipt (GRN)
        </Link>
        <Link
          to="/inventory/damaged-stock"
          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-semibold border border-rose-200 shadow-2xs"
        >
          Damaged Stock &amp; RMA
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-rose-200/80 bg-rose-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Total Damaged Units
              </p>
              <p className="text-2xl font-bold font-mono text-rose-900 mt-1">
                {totalDamagedUnits}
              </p>
              <p className="text-[11px] text-rose-600 mt-0.5">Across all storage locations</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 bg-amber-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Damaged Valuation
              </p>
              <p className="text-2xl font-bold font-mono text-amber-900 mt-1">
                {formatCurrency(totalDamagedValuation)}
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">At standard inventory cost</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Boxes className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200/80 bg-indigo-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                Pending Debit Notes
              </p>
              <p className="text-2xl font-bold font-mono text-indigo-900 mt-1">
                {pendingDebitNotes.length}
              </p>
              <p className="text-[11px] text-indigo-600 mt-0.5">Issued supplier RMA claims</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Undo2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Affected Product Lines
              </p>
              <p className="text-2xl font-bold font-mono text-slate-800 mt-1">
                {damagedItems.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Requiring operational resolution</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Section: Search & Damaged Products Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span>Damaged Inventory Registry</span>
              <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                {filteredDamagedItems.length} lines
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search product, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800"
              >
                <option value="ALL">All Locations</option>
                <option value="WH-MAIN">WH-MAIN (Central Warehouse)</option>
                <option value="SR-MAIN">SR-MAIN (Main Showroom)</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left">Product / SKU</th>
                  <th className="py-2.5 px-3 text-left">Location</th>
                  <th className="py-2.5 px-3 text-right">Damaged Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right">Total Valuation</th>
                  <th className="py-2.5 px-3 text-left">Last Audit</th>
                  <th className="py-2.5 px-3 text-center">Action Flows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDamagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="text-xs font-medium text-slate-600">
                          No damaged stock found in quarantine.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          All warehouse and showroom units are fully operational and available for sale.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDamagedItems.map((item) => (
                    <tr
                      key={`${item.balance.productId}-${item.balance.locationId}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{item.product.name}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{item.product.sku}</div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="font-mono text-[10px] bg-slate-50">
                          {item.balance.locationId}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-700 text-sm">
                        {item.balance.damagedQuantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(item.unitCost)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.totalValuation)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {formatDate(item.balance.lastUpdated)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Flow 1: Return to Supplier via Debit Note */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReturnModal(item)}
                            className="h-7 px-2 text-[11px] gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-medium"
                            title="Generate Supplier Debit Note to return damaged items"
                          >
                            <Undo2 className="h-3 w-3" />
                            Return to Supplier
                          </Button>

                          {/* Flow 2: Scrap / Write-Off */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenScrapModal(item)}
                            className="h-7 px-2 text-[11px] gap-1 text-rose-700 border-rose-200 hover:bg-rose-50 font-medium"
                            title="Scrap and write off irreparable stock to loss"
                          >
                            <Trash2 className="h-3 w-3" />
                            Scrap / Write-Off
                          </Button>

                          {/* Flow 3: Repair & Restore */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRepairModal(item)}
                            className="h-7 px-2 text-[11px] gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-medium"
                            title="Repair and return unit to good available inventory"
                          >
                            <Wrench className="h-3 w-3" />
                            Repair &amp; Restore
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 1. Modal: Return to Supplier via Debit Note */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-900">
            <Undo2 className="h-4 w-4 text-indigo-600" />
            Return Damaged Stock to Supplier via Debit Note
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Issue an Accounts Payable Debit Note to reduce supplier balance and clear damaged inventory.
          </DialogDescription>
        </DialogHeader>

        {activeItem && (
          <form onSubmit={handleSubmitReturn} className="space-y-3.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800">
                {activeItem.product.name} ({activeItem.product.sku})
              </div>
              <div className="text-slate-500 text-[11px]">
                Location: {activeItem.balance.locationId} | Damaged in Quarantine:{' '}
                <span className="font-bold text-rose-700 font-mono">
                  {activeItem.balance.damagedQuantity} units
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Target Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  value={actionSupplierId}
                  onChange={(e) => setActionSupplierId(e.target.value)}
                  className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white text-slate-800"
                  required
                >
                  {suppliers.length > 0 ? (
                    suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <option value="sup-001">Schneider Electric Lanka (Pvt) Ltd</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Quantity to Return <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={activeItem.balance.damagedQuantity}
                  value={actionQuantity}
                  onChange={(e) => setActionQuantity(parseInt(e.target.value) || 1)}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Debit Note Unit Valuation (LKR)
              </label>
              <Input
                type="number"
                value={actionUnitCost}
                onChange={(e) => setActionUnitCost(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                RMA / Return Justification <span className="text-rose-500">*</span>
              </label>
              <Input
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Factory warranty return for manufacturing trip defect"
                className="h-8 text-xs"
                required
              />
            </div>

            {/* General Ledger Preview */}
            <div className="p-2.5 rounded bg-indigo-50/60 border border-indigo-200 text-[11px] font-mono text-indigo-900 space-y-0.5">
              <div className="font-bold pb-1 text-indigo-950 uppercase">Automated Accounting Impact:</div>
              <div className="flex justify-between">
                <span>Dr 2010 Accounts Payable (Liability):</span>
                <span className="font-bold">{formatCurrency(actionQuantity * actionUnitCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cr 1100 Merchandise Inventory (Asset):</span>
                <span className="font-bold">{formatCurrency(actionQuantity * actionUnitCost)}</span>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReturnModalOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={processing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {processing ? 'Posting...' : 'Post Debit Note & Deduct'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* 2. Modal: Scrap / Write-Off */}
      <Dialog open={scrapModalOpen} onOpenChange={setScrapModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-rose-900">
            <Trash2 className="h-4 w-4 text-rose-600" />
            Write-Off Damaged Stock to Scrap
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Permanently clear unrepairable defective inventory and record disposal loss.
          </DialogDescription>
        </DialogHeader>

        {activeItem && (
          <form onSubmit={handleSubmitScrap} className="space-y-3.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800">
                {activeItem.product.name} ({activeItem.product.sku})
              </div>
              <div className="text-slate-500 text-[11px]">
                Location: {activeItem.balance.locationId} | Damaged in Quarantine:{' '}
                <span className="font-bold text-rose-700 font-mono">
                  {activeItem.balance.damagedQuantity} units
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Quantity to Scrap <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min={1}
                max={activeItem.balance.damagedQuantity}
                value={actionQuantity}
                onChange={(e) => setActionQuantity(parseInt(e.target.value) || 1)}
                className="h-8 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Disposal Justification &amp; Failure Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Unrecoverable water ingress and internal coil burnout; deemed unusable scrap."
                className="w-full rounded border border-slate-300 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>

            <div className="p-2.5 rounded bg-rose-50/60 border border-rose-200 text-[11px] text-rose-900">
              ⚠️ <span className="font-semibold">{actionQuantity} units</span> will be permanently removed from damaged stock quarantine. A <span className="font-mono">DAMAGE_WRITE_OFF</span> movement log will be immutably recorded.
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScrapModalOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={processing}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {processing ? 'Processing...' : 'Confirm Scrap Write-Off'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* 3. Modal: Repair & Restore to Available Stock */}
      <Dialog open={repairModalOpen} onOpenChange={setRepairModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-900">
            <Wrench className="h-4 w-4 text-emerald-600" />
            Repair &amp; Restore Stock to Available Inventory
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Move certified repaired goods from damaged quarantine back to live saleable stock.
          </DialogDescription>
        </DialogHeader>

        {activeItem && (
          <form onSubmit={handleSubmitRepair} className="space-y-3.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800">
                {activeItem.product.name} ({activeItem.product.sku})
              </div>
              <div className="text-slate-500 text-[11px]">
                Location: {activeItem.balance.locationId} | Damaged in Quarantine:{' '}
                <span className="font-bold text-rose-700 font-mono">
                  {activeItem.balance.damagedQuantity} units
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Quantity Repaired &amp; Restoring <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min={1}
                max={activeItem.balance.damagedQuantity}
                value={actionQuantity}
                onChange={(e) => setActionQuantity(parseInt(e.target.value) || 1)}
                className="h-8 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Technician / Restoration Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Cleaned aux terminals, calibrated trip threshold to factory specs, bench tested successfully."
                className="w-full rounded border border-slate-300 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="p-2.5 rounded bg-emerald-50/60 border border-emerald-200 text-[11px] text-emerald-900">
              ✅ <span className="font-semibold">{actionQuantity} units</span> will be decremented from damaged quarantine and added back to <span className="font-semibold">{activeItem.balance.locationId}</span> available saleable inventory.
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRepairModalOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={processing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {processing ? 'Restoring...' : 'Restore to Available Stock'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </div>
  );
}
