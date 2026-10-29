import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supplierReturnService } from '../../services/SupplierReturnService';
import { SupplierReturn, SupplierReturnStatus, SupplierReturnReason } from '../../types/purchasing';
import { SupplierSelector } from '../../components/selectors/SupplierSelector';
import { SupplierSummaryCard } from '../../components/selectors/SupplierSummaryCard';
import { Supplier } from '../finance/api/types';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormField } from '../../components/common/FormField';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { apService } from '../finance/services/apService';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileText,
  Boxes,
  Clock,
  ArrowRight,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

interface LocalReturnLine {
  productId: string;
  productCode: string;
  productName: string;
  returnedQuantity: number;
  unitCost: number;
  reason?: string;
}

export function SupplierReturnsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'REGISTRY' | 'CREATE'>('REGISTRY');
  const [returns, setReturns] = useState<SupplierReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierReturnStatus | 'ALL'>('ALL');

  // Form State
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedGRNId, setSelectedGRNId] = useState<string>('');
  const [selectedPoNumber, setSelectedPoNumber] = useState<string>('');
  const [reasonCategory, setReasonCategory] = useState<SupplierReturnReason>('DEFECTIVE_DAMAGED');
  const [reasonDescription, setReasonDescription] = useState<string>(
    'Defective or damaged items returned to supplier for refund debit note credit'
  );
  const [warehouseId, setWarehouseId] = useState<string>('WH-MAIN');
  const [lines, setLines] = useState<LocalReturnLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isPurchasingManager =
    currentUser.role === 'DIRECTOR' ||
    currentUser.role === 'MANAGER' ||
    currentUser.role === 'PURCHASING_OFFICER';

  const canApprove =
    currentUser.role === 'DIRECTOR' ||
    currentUser.role === 'MANAGER';

  const loadReturns = async () => {
    try {
      setLoading(true);
      const data = await supplierReturnService.getReturns();
      setReturns(data);
    } catch (err) {
      console.error('Failed to load supplier returns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  // Available GRNs for linkage (BR-08)
  const availableGRNs = useMemo(() => {
    return apService.getAvailableGRNs();
  }, []);

  const supplierGRNs = useMemo(() => {
    if (!selectedSupplier) return availableGRNs;
    return availableGRNs.filter(
      (g) =>
        g.supplierId === selectedSupplier.id ||
        g.supplierName.toLowerCase().includes(selectedSupplier.name.toLowerCase())
    );
  }, [availableGRNs, selectedSupplier]);

  const handleGRNSelect = (grnId: string) => {
    setSelectedGRNId(grnId);
    const grn = availableGRNs.find((g) => g.id === grnId);
    if (grn) {
      if (grn.poNumber) {
        setSelectedPoNumber(grn.poNumber);
      }
      // Auto-populate damaged or rejected items from GRN
      const newLines: LocalReturnLine[] = [];
      for (const item of grn.items) {
        const damagedQty = item.damagedQuantity || 0;
        const unitCost = item.unitCostSnapshot || 2800;
        if (damagedQty > 0) {
          newLines.push({
            productId: item.productId,
            productCode: item.skuSnapshot || 'DNS-SKU',
            productName: item.productNameSnapshot,
            returnedQuantity: damagedQty,
            unitCost,
            reason: 'Transit/intake damage recorded on GRN inspection',
          });
        }
      }
      if (newLines.length > 0) {
        setLines(newLines);
      } else if (grn.items.length > 0) {
        const first = grn.items[0];
        setLines([
          {
            productId: first.productId,
            productCode: first.skuSnapshot || 'DNS-SKU',
            productName: first.productNameSnapshot,
            returnedQuantity: 1,
            unitCost: first.unitCostSnapshot || 2800,
            reason: 'Damaged item return',
          },
        ]);
      }
    }
  };

  const handleAddLine = () => {
    const defaultProduct = MOCK_PRODUCTS[0];
    setLines([
      ...lines,
      {
        productId: defaultProduct.id,
        productCode: defaultProduct.sku,
        productName: defaultProduct.name,
        returnedQuantity: 1,
        unitCost: defaultProduct.pricing.costPrice,
        reason: 'Defective units return',
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleUpdateLine = (idx: number, field: keyof LocalReturnLine, val: any) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: val };
    if (field === 'productId') {
      const prod = MOCK_PRODUCTS.find((p) => p.id === val);
      if (prod) {
        next[idx].productCode = prod.sku;
        next[idx].productName = prod.name;
        next[idx].unitCost = prod.pricing.costPrice;
      }
    }
    setLines(next);
  };

  const totalReturnAmount = useMemo(() => {
    return lines.reduce((sum, it) => sum + (it.returnedQuantity || 0) * (it.unitCost || 0), 0);
  }, [lines]);

  const handleSubmitReturn = async (autoApprove: boolean) => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier from the Supplier Master.');
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one line item to return.');
      return;
    }
    for (const item of lines) {
      if (item.returnedQuantity <= 0) {
        toast.error(`Return quantity must be greater than zero for ${item.productName}`);
        return;
      }
      if (item.unitCost < 0) {
        toast.error(`Unit cost cannot be negative for ${item.productName}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const grn = availableGRNs.find((g) => g.id === selectedGRNId);

      const ret = await supplierReturnService.createReturn(
        {
          supplierId: selectedSupplier.id,
          supplierName: selectedSupplier.name,
          supplierCode: selectedSupplier.code,
          originalPoNumber: selectedPoNumber || grn?.poNumber,
          grnId: selectedGRNId || undefined,
          grnNumber: grn?.grnNumber || undefined,
          reasonCategory,
          reasonDescription: reasonDescription.trim(),
          warehouseId,
          items: lines.map((l) => ({
            productId: l.productId,
            productCode: l.productCode,
            productName: l.productName,
            returnedQuantity: l.returnedQuantity,
            unitCost: l.unitCost,
            reason: l.reason,
          })),
          autoApprove,
        },
        currentUser
      );

      if (ret.status === 'APPROVED') {
        toast.success(
          `Supplier Return ${ret.returnNumber} approved! Linked AP Debit Note ${ret.linkedDebitNoteNumber} created with GL Impact: Dr 2010 A/P, Cr 1100 Inventory.`
        );
      } else {
        toast.success(
          `Supplier Return ${ret.returnNumber} submitted for Purchasing Manager approval.`
        );
      }

      await loadReturns();
      setActiveTab('REGISTRY');
      setLines([]);
      setSelectedSupplier(null);
      setSelectedGRNId('');
      setSelectedPoNumber('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create supplier return');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReturn = async (returnId: string) => {
    try {
      const updated = await supplierReturnService.approveReturn(returnId, currentUser);
      toast.success(
        `Supplier Return ${updated.returnNumber} approved! Linked AP Debit Note ${updated.linkedDebitNoteNumber} generated in Finance.`
      );
      await loadReturns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve return');
    }
  };

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchSearch =
        searchQuery === '' ||
        r.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.linkedDebitNoteNumber && r.linkedDebitNoteNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [returns, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <PageHeader
        title="Supplier Returns & Vendor RMA"
        breadcrumbs={[
          { label: 'Purchasing', href: '/purchasing' },
          { label: 'Supplier Returns' },
        ]}
        onBack={() => navigate('/purchasing')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'REGISTRY' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('REGISTRY')}
              className="text-xs font-semibold"
            >
              Returns Registry ({returns.length})
            </Button>
            <Button
              variant={activeTab === 'CREATE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('CREATE')}
              className="text-xs font-semibold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New Supplier Return
            </Button>
          </div>
        }
      />

      {/* Integration Banner (BR-08) */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-950 uppercase tracking-wide">
              Automated AP Debit Note & GL Ledger Linkage (BR-08)
            </h3>
            <p className="text-blue-800 leading-relaxed mt-0.5">
              Approving a Supplier Return immediately creates and links an Accounts Payable Debit Note in Finance, crediting inventory and reducing the supplier AP liability balance.
            </p>
          </div>
        </div>
        <Link to="/finance/ap/debit-notes" className="shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-white text-blue-800 border-blue-300 hover:bg-blue-100 gap-1">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Finance Debit Notes</span>
          </Button>
        </Link>
      </div>

      {activeTab === 'CREATE' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Supplier Selection */}
            <FormSection
              title="Supplier Information"
              icon={Building2}
              overflowVisible
            >
              {selectedSupplier ? (
                <SupplierSummaryCard
                  supplier={selectedSupplier}
                  onChangeSupplier={() => setSelectedSupplier(null)}
                />
              ) : (
                <div className="space-y-2">
                  <SupplierSelector
                    onSelect={(sup) => setSelectedSupplier(sup)}
                    selectedSupplierId={selectedSupplier?.id}
                  />
                </div>
              )}
            </FormSection>

            {/* Document References & Reason */}
            <FormSection
              title="Return Reason & Document References"
              icon={FileText}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Link to Goods Received Note (GRN)">
                  <select
                    value={selectedGRNId}
                    onChange={(e) => handleGRNSelect(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white font-mono"
                  >
                    <option value="">-- Manual Return (No linked GRN) --</option>
                    {supplierGRNs.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.grnNumber} ({g.supplierName})
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Original Purchase Order #">
                  <Input
                    placeholder="e.g. PO-2026-101"
                    value={selectedPoNumber}
                    onChange={(e) => setSelectedPoNumber(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </FormField>

                <FormField label="Reason Category" required>
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value as SupplierReturnReason)}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
                  >
                    <option value="DEFECTIVE_DAMAGED">Defective / Damaged in Transit</option>
                    <option value="SPECIFICATION_MISMATCH">Specification Mismatch</option>
                    <option value="EXCESS_DELIVERY">Excess Delivery over PO</option>
                    <option value="QUALITY_REJECTION">Failed Quality Inspection</option>
                    <option value="INCORRECT_ITEM">Incorrect SKU Delivered</option>
                  </select>
                </FormField>

                <FormField label="Warehouse Location" required>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white font-mono"
                  >
                    <option value="WH-MAIN">WH-MAIN (Main Warehouse Quarantine)</option>
                    <option value="WH-DAMAGED">WH-DAMAGED (Quarantine Bay)</option>
                  </select>
                </FormField>

                <div className="sm:col-span-2">
                  <FormField label="Detailed Return Explanation">
                    <textarea
                      value={reasonDescription}
                      onChange={(e) => setReasonDescription(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-primary font-sans"
                      placeholder="Explain reasons for returning stock to vendor..."
                    />
                  </FormField>
                </div>
              </div>
            </FormSection>
          </div>

          {/* Returned Line Items */}
          <Card className="shadow-2xs">
            <CardHeader className="py-3 px-4 border-b border-slate-200 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Returned Line Items ({lines.length})
                </CardTitle>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddLine}
                className="text-xs gap-1.5 h-8 font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Add Product Line
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {lines.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <Boxes className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">No items added to return yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Select a GRN above or click "Add Product Line" to specify returned items.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs tabular-nums">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">#</th>
                        <th className="py-2.5 px-4 text-left min-w-[200px]">Product / SKU</th>
                        <th className="py-2.5 px-3 text-center w-[110px]">Return Qty</th>
                        <th className="py-2.5 px-3 text-right w-[140px]">Unit Cost (LKR)</th>
                        <th className="py-2.5 px-4 text-right w-[140px]">Line Total</th>
                        <th className="py-2.5 px-3 text-left min-w-[180px]">Defect Reason</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={it.productId}
                              onChange={(e) => handleUpdateLine(idx, 'productId', e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded p-1 font-medium bg-white"
                            >
                              {MOCK_PRODUCTS.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Input
                              type="number"
                              min="1"
                              value={it.returnedQuantity}
                              onChange={(e) =>
                                handleUpdateLine(idx, 'returnedQuantity', parseInt(e.target.value) || 0)
                              }
                              className="h-7 w-20 text-center font-mono text-xs mx-auto"
                            />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={it.unitCost}
                              onChange={(e) =>
                                handleUpdateLine(idx, 'unitCost', parseFloat(e.target.value) || 0)
                              }
                              className="h-7 w-28 text-right font-mono text-xs ml-auto"
                            />
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency((it.returnedQuantity || 0) * (it.unitCost || 0))}
                          </td>
                          <td className="py-3 px-3">
                            <Input
                              value={it.reason || ''}
                              onChange={(e) => handleUpdateLine(idx, 'reason', e.target.value)}
                              placeholder="Defect details..."
                              className="h-7 text-xs"
                            />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total & Accounting Impact Preview */}
              {lines.length > 0 && (
                <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="font-semibold text-slate-800">Double-Entry Impact upon Approval:</span>
                    <Badge variant="outline" className="font-mono text-[10.5px] bg-white">
                      Dr 2010 Accounts Payable | Cr 1100 Inventory
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-xs text-slate-500 font-medium">Total Refund Credit:</span>
                    <span className="text-base font-extrabold font-mono text-primary tabular-nums">
                      {formatCurrency(totalReturnAmount)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('REGISTRY')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSubmitReturn(false)}
              disabled={submitting || lines.length === 0}
              className="font-medium"
            >
              Submit for Approval
            </Button>
            {canApprove && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleSubmitReturn(true)}
                disabled={submitting || lines.length === 0}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Approve &amp; Generate AP Debit Note</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* REGISTRY TAB */
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Return #, Supplier, or Debit Note #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs h-9 px-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved (Debit Note Linked)</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Returns Table */}
          <Card className="shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading supplier returns...</div>
            ) : filteredReturns.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <RotateCcw className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">No supplier returns on record.</p>
                <p className="text-[11px] text-slate-400">
                  Click "New Supplier Return" above to record a vendor return merchandise authorization.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">Return #</th>
                      <th className="py-3 px-4 text-left font-semibold">Supplier</th>
                      <th className="py-3 px-3 text-left font-semibold">Linked PO / GRN</th>
                      <th className="py-3 px-3 text-left font-semibold">Reason Category</th>
                      <th className="py-3 px-3 text-right font-semibold">Total Credit</th>
                      <th className="py-3 px-3 text-center font-semibold">Status</th>
                      <th className="py-3 px-3 text-left font-semibold">Finance Debit Note</th>
                      <th className="py-3 px-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReturns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {ret.returnNumber}
                          <span className="block text-[10.5px] font-normal text-slate-400 font-sans">
                            {formatDate(ret.returnDate)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">{ret.supplierName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{ret.supplierCode || 'Vendor'}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {ret.originalPoNumber && (
                            <span className="block text-slate-800">PO: {ret.originalPoNumber}</span>
                          )}
                          {ret.grnNumber && (
                            <Link to={`/inventory/grn`} className="text-primary hover:underline block">
                              GRN: {ret.grnNumber}
                            </Link>
                          )}
                          {!ret.originalPoNumber && !ret.grnNumber && <span className="text-slate-400">Manual Return</span>}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {ret.reasonCategory.replace('_', ' ')}
                          </Badge>
                          <span className="block text-[10.5px] text-slate-500 truncate max-w-[180px] mt-0.5" title={ret.reasonDescription}>
                            {ret.reasonDescription}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(ret.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant={ret.status === 'APPROVED' ? 'success' : ret.status === 'REJECTED' ? 'destructive' : 'warning'}
                            className="text-[10px] px-2 py-0.5 font-bold"
                          >
                            {ret.status === 'APPROVED' ? 'APPROVED' : ret.status === 'PENDING_APPROVAL' ? 'PENDING APPROVAL' : 'REJECTED'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          {ret.linkedDebitNoteNumber ? (
                            <Link
                              to={`/finance/ap/debit-notes`}
                              className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                              <span>{ret.linkedDebitNoteNumber}</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Pending approval</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {ret.status === 'PENDING_APPROVAL' && canApprove ? (
                            <Button
                              size="sm"
                              onClick={() => handleApproveReturn(ret.id)}
                              className="h-7 px-2.5 text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg"
                            >
                              Approve
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {ret.approvedByName ? `By ${ret.approvedByName.split(' ')[0]}` : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
export default SupplierReturnsPage;
