import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apService, VendorBill } from '../../services/apService';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { CurrencyInput } from '../../components/CurrencyInput';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
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
import { SupplierAdvance } from '../../api/types';
import {
  Landmark,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Plus,
  Link as LinkIcon,
  Search,
  Wallet,
  Clock,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export function SupplierAdvancePaymentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { suppliers, accounts } = useFinanceLedger();

  // Active view: 'LIST' or 'CREATE'
  const [activeTab, setActiveTab] = useState<'REGISTRY' | 'CREATE'>('REGISTRY');

  // Filter bank accounts (1010 / 1015 / Cash)
  const bankAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.accountClass === 'ASSET' &&
        (a.code.startsWith('1010') ||
          a.code.startsWith('1015') ||
          a.name.toLowerCase().includes('bank'))
    );
  }, [accounts]);

  // Form State for Recording New Advance
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    searchParams.get('supplierId') || ''
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceNotes, setAdvanceNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Advances registry list
  const [advances, setAdvances] = useState<SupplierAdvance[]>(() =>
    apService.getSupplierAdvances()
  );
  const [filterSupplier, setFilterSupplier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map to GRN / Bill Modal State
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [advanceToMap, setAdvanceToMap] = useState<SupplierAdvance | null>(null);
  const [mappingTargetType, setMappingTargetType] = useState<'GRN' | 'BILL'>('GRN');
  const [targetGrnId, setTargetGrnId] = useState<string>('');
  const [targetBillId, setTargetBillId] = useState<string>('');
  const [mapAmount, setMapAmount] = useState<number>(0);

  // Available GRNs and Open Bills for selected advance's supplier
  const availableGRNs = useMemo(() => {
    if (!advanceToMap) return [];
    const all = apService.getAvailableGRNs();
    return all.filter(
      (g) =>
        g.supplierId === advanceToMap.supplierId ||
        g.supplierName.toLowerCase().includes(advanceToMap.supplierName.toLowerCase())
    );
  }, [advanceToMap]);

  const openBills = useMemo(() => {
    if (!advanceToMap) return [];
    return apService.getOpenBillsForSupplier(advanceToMap.supplierId || advanceToMap.supplierName);
  }, [advanceToMap]);

  // Refresh advances
  const refreshAdvances = () => {
    setAdvances(apService.getSupplierAdvances());
  };

  // Auto-select first bank account
  useEffect(() => {
    if (bankAccounts.length > 0 && !bankAccountId) {
      setBankAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, bankAccountId]);

  // Auto-select first supplier if none selected
  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  // Handle Recording Advance Payment
  const handleRecordAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (!bankAccountId) {
      toast.error('Please select a disbursement bank account');
      return;
    }
    if (!paymentReference.trim()) {
      toast.error('Payment reference is required (e.g., Wire Ref / Cheque #)');
      return;
    }
    if (advanceAmount <= 0) {
      toast.error('Advance amount must be greater than zero');
      return;
    }

    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    const bank = accounts.find((a) => a.id === bankAccountId);

    try {
      setSubmitting(true);
      const adv = await apService.postSupplierAdvance({
        supplierId: selectedSupplierId,
        supplierName: sup?.name || 'Selected Supplier',
        paymentDate,
        bankAccountId,
        bankAccountCode: bank?.code || '1010',
        reference: paymentReference.trim(),
        amount: advanceAmount,
        notes: advanceNotes.trim() || undefined,
      });

      toast.success(
        `Supplier Advance ${adv.advanceNumber} recorded successfully! Debited 1050 Advance to Suppliers, Credited Bank ${bank?.code || '1010'}.`
      );
      refreshAdvances();
      setActiveTab('REGISTRY');
      setAdvanceAmount(0);
      setPaymentReference('');
      setAdvanceNotes('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record advance payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Open mapping modal for an advance
  const handleOpenMappingModal = (adv: SupplierAdvance) => {
    setAdvanceToMap(adv);
    setMapAmount(adv.unappliedBalance);
    const grns = apService
      .getAvailableGRNs()
      .filter(
        (g) =>
          g.supplierId === adv.supplierId ||
          g.supplierName.toLowerCase().includes(adv.supplierName.toLowerCase())
      );
    if (grns.length > 0) {
      setTargetGrnId(grns[0].id);
      setMappingTargetType('GRN');
    } else {
      const bills = apService.getOpenBillsForSupplier(adv.supplierId || adv.supplierName);
      if (bills.length > 0) {
        setTargetBillId(bills[0].id);
        setMappingTargetType('BILL');
      }
    }
    setMappingModalOpen(true);
  };

  // Submit mapping advance to GRN / Bill
  const handleApplyMapping = async () => {
    if (!advanceToMap) return;
    if (mapAmount <= 0) {
      toast.error('Amount to apply must be greater than zero');
      return;
    }
    if (mapAmount > advanceToMap.unappliedBalance) {
      toast.error('Amount to apply exceeds available unapplied advance balance');
      return;
    }

    try {
      setSubmitting(true);
      const selectedGrn = availableGRNs.find((g) => g.id === targetGrnId);
      const selectedBill = openBills.find((b) => b.id === targetBillId);

      await apService.applyAdvanceToGRNOrBill({
        advanceId: advanceToMap.id,
        grnId: mappingTargetType === 'GRN' ? targetGrnId : selectedBill?.grnId,
        grnNumber: mappingTargetType === 'GRN' ? selectedGrn?.grnNumber : selectedBill?.grnNumber,
        billId: mappingTargetType === 'BILL' ? targetBillId : undefined,
        amountToApply: mapAmount,
      });

      toast.success(
        `Successfully mapped ${formatCurrency(mapAmount)} from Advance ${advanceToMap.advanceNumber}! GL Entry: Dr 2010 A/P, Cr 1050 Advance to Suppliers.`
      );
      setMappingModalOpen(false);
      setAdvanceToMap(null);
      refreshAdvances();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply advance mapping');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered advances
  const filteredAdvances = useMemo(() => {
    return advances.filter((a) => {
      if (filterSupplier !== 'ALL' && a.supplierId !== filterSupplier) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.advanceNumber.toLowerCase().includes(q) ||
        a.supplierName.toLowerCase().includes(q) ||
        a.reference.toLowerCase().includes(q)
      );
    });
  }, [advances, filterSupplier, searchQuery]);

  const totalUnappliedBalance = useMemo(() => {
    return advances.reduce((acc, a) => acc + (a.status !== 'VOIDED' ? a.unappliedBalance : 0), 0);
  }, [advances]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Supplier Advance Payments (Prepayments)
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs">
              Accounts Payable
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Disburse advance deposits to suppliers prior to billing (Dr 1050 Advance to Suppliers, Cr Bank) and map them to finalized inbound GRNs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'REGISTRY' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('REGISTRY')}
            className="text-xs"
          >
            Advances Registry
          </Button>
          <Button
            variant={activeTab === 'CREATE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('CREATE')}
            className="text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Record Advance</span>
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

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Prepayments Issued
            </span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            {formatCurrency(advances.reduce((acc, a) => acc + a.amount, 0))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cumulative supplier advances</p>
        </Card>

        <Card className="p-4 border-emerald-200 bg-emerald-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
              Unapplied Advance Balance
            </span>
            <Landmark className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-900 mt-2 font-mono">
            {formatCurrency(totalUnappliedBalance)}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Available to offset against finalized GRNs</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Control GL Account
            </span>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-sm font-bold text-slate-800 mt-2">
            1050 Advance to Suppliers
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Current Asset (Prepayments & Deposits)</p>
        </Card>
      </div>

      {/* View 1: RECORD ADVANCE PAYMENT FORM */}
      {activeTab === 'CREATE' && (
        <Card className="p-6 border-slate-200 max-w-2xl mx-auto bg-white shadow-xs">
          <form onSubmit={handleRecordAdvance} className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Record Advance to Supplier</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Execute bank disbursement for vendor pre-orders prior to physical GRN arrival or invoice receipt.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Disbursing Bank Account <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name} ({formatCurrency(b.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Payment Reference # <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="e.g. WIRE-BOC-88214 / CHQ-10492"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Advance Amount (LKR) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput
                value={advanceAmount}
                onChange={(val) => setAdvanceAmount(val)}
                placeholder="0.00"
                className="h-10 text-sm font-bold font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Procurement Notes / Intended Order Ref
              </label>
              <Input
                placeholder="e.g. 50% deposit for Schneider MCB container shipment (PO-2026-041)"
                value={advanceNotes}
                onChange={(e) => setAdvanceNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* General Ledger Preview Box */}
            <div className="rounded-lg border border-primary-border/60 bg-primary-light/30 p-3.5 space-y-1 text-xs">
              <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                Automated GL Double-Entry Voucher:
              </span>
              <div className="flex justify-between font-mono text-slate-700 pt-1">
                <span>Dr 1050 Advance to Suppliers (Asset)</span>
                <span className="font-bold">{formatCurrency(advanceAmount || 0)}</span>
              </div>
              <div className="flex justify-between font-mono text-slate-700">
                <span>Cr {accounts.find((a) => a.id === bankAccountId)?.code || '1010'} Bank Account (Asset)</span>
                <span className="font-bold">{formatCurrency(advanceAmount || 0)}</span>
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
              <Button
                type="submit"
                size="sm"
                disabled={submitting || advanceAmount <= 0}
                className="bg-primary hover:bg-primary-hover text-white gap-2 font-semibold"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{submitting ? 'Recording...' : 'Post Advance Payment'}</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* View 2: ADVANCES & GRN MAPPING REGISTRY */}
      {activeTab === 'REGISTRY' && (
        <Card className="p-5 border-slate-200 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Search advance #, supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="flex h-9 w-52 rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
              Showing {filteredAdvances.length} advance payment records
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left">Advance #</th>
                  <th className="py-2.5 px-3 text-left">Date</th>
                  <th className="py-2.5 px-3 text-left">Supplier</th>
                  <th className="py-2.5 px-3 text-left">Reference</th>
                  <th className="py-2.5 px-3 text-right">Original Amount</th>
                  <th className="py-2.5 px-3 text-right">Unapplied Balance</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdvances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No supplier advances found matching the criteria. Click &ldquo;Record Advance&rdquo; to disburse a prepayment.
                    </td>
                  </tr>
                ) : (
                  filteredAdvances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {adv.advanceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{formatDate(adv.paymentDate)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{adv.supplierName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{adv.reference}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(adv.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(adv.unappliedBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            adv.status === 'UNAPPLIED'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : adv.status === 'PARTIALLY_APPLIED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {adv.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {adv.unappliedBalance > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenMappingModal(adv)}
                            className="h-7 text-xs gap-1 text-primary border-primary/40 hover:bg-primary/5 font-semibold"
                          >
                            <LinkIcon className="h-3 w-3" />
                            <span>Map to GRN / Bill</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Fully Applied</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Map Advance to GRN / Vendor Bill Modal */}
      <Dialog open={mappingModalOpen} onOpenChange={setMappingModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <LinkIcon className="h-5 w-5 text-primary" />
              <span>Map Advance to Finalized GRN / Bill</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Draw down prepayment deposit against inbound physical stock receipts or posted vendor bills.
            </DialogDescription>
          </DialogHeader>

          {advanceToMap && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Advance Number:</span>
                  <span className="font-mono font-bold text-slate-800">{advanceToMap.advanceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier:</span>
                  <span className="font-bold text-slate-800">{advanceToMap.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Available Unapplied Balance:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatCurrency(advanceToMap.unappliedBalance)}
                  </span>
                </div>
              </div>

              {/* Target Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">Map Destination:</label>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={mappingTargetType === 'GRN'}
                        onChange={() => setMappingTargetType('GRN')}
                        className="text-primary"
                      />
                      <span>Finalized Inbound GRN</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={mappingTargetType === 'BILL'}
                        onChange={() => setMappingTargetType('BILL')}
                        className="text-primary"
                      />
                      <span>Open Vendor Bill</span>
                    </label>
                  </div>
                </div>

                {mappingTargetType === 'GRN' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Approved GRN
                    </label>
                    {availableGRNs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No available approved GRNs found for this supplier.
                      </p>
                    ) : (
                      <select
                        value={targetGrnId}
                        onChange={(e) => setTargetGrnId(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        {availableGRNs.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.grnNumber} - {g.warehouseId} ({g.status})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Open Vendor Bill
                    </label>
                    {openBills.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No open vendor bills found for this supplier.
                      </p>
                    ) : (
                      <select
                        value={targetBillId}
                        onChange={(e) => {
                          setTargetBillId(e.target.value);
                          const b = openBills.find((bill) => bill.id === e.target.value);
                          if (b) {
                            setMapAmount(Math.min(b.balanceDue, advanceToMap.unappliedBalance));
                          }
                        }}
                        className="flex h-9 w-full rounded-md border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        {openBills.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.billNumber} (Inv #{b.vendorInvoiceNumber}) - Due: {formatCurrency(b.balanceDue)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount to Apply (LKR)
                  </label>
                  <CurrencyInput
                    value={mapAmount}
                    onChange={(val) => setMapAmount(Math.min(val, advanceToMap.unappliedBalance))}
                    max={advanceToMap.unappliedBalance}
                    placeholder="0.00"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Will trigger GL entry: Dr 2010 Accounts Payable, Cr 1050 Advance to Suppliers.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMappingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApplyMapping}
              disabled={submitting || mapAmount <= 0}
              className="bg-primary hover:bg-primary-hover text-white gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span>{submitting ? 'Mapping...' : 'Confirm Allocation'}</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
