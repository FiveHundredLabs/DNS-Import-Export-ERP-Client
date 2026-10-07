import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { pdcVaultService } from '../../services/pdcVaultService';
import { PostDatedCheque } from '../../api/types';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../components/ui/dialog';
import { Textarea } from '../../../../components/ui/textarea';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import {
  Clock,
  Landmark,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Receipt,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Coins,
} from 'lucide-react';
import { toast } from 'sonner';

export function PDCVaultPage() {
  const navigate = useNavigate();
  const { accounts } = useFinanceLedger();
  const [cheques, setCheques] = useState<PostDatedCheque[]>(() => pdcVaultService.getPDCs());
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'IN_HAND' | 'MATURED' | 'FUTURE' | 'CLEARED'>('IN_HAND');

  // Clearing Modal State
  const [clearingCheque, setClearingCheque] = useState<PostDatedCheque | null>(null);
  const [clearingDate, setClearingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [targetBankAccountId, setTargetBankAccountId] = useState<string>('acc-1010');
  const [clearingNotes, setClearingNotes] = useState<string>('');
  const [clearingProcessing, setClearingProcessing] = useState(false);

  // Bouncing Modal State
  const [bouncingCheque, setBouncingCheque] = useState<PostDatedCheque | null>(null);
  const [bounceReason, setBounceReason] = useState<string>('');
  const [bounceProcessing, setBounceProcessing] = useState(false);

  // Selected for Details Sheet
  const [selectedCheque, setSelectedCheque] = useState<PostDatedCheque | null>(null);

  const refreshCheques = () => {
    setCheques(pdcVaultService.getPDCs());
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredCheques = useMemo(() => {
    return cheques.filter((c) => {
      if (filterTab === 'IN_HAND' && c.status !== 'IN_HAND') return false;
      if (filterTab === 'CLEARED' && c.status !== 'CLEARED') return false;
      if (filterTab === 'MATURED' && (c.status !== 'IN_HAND' || c.chequeDate > todayStr)) return false;
      if (filterTab === 'FUTURE' && (c.status !== 'IN_HAND' || c.chequeDate <= todayStr)) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.chequeNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.drawerBank.toLowerCase().includes(q) ||
        (c.receiptNumber && c.receiptNumber.toLowerCase().includes(q))
      );
    });
  }, [cheques, filterTab, search, todayStr]);

  const metrics = useMemo(() => {
    return pdcVaultService.getMetrics();
  }, [cheques]);

  const handleOpenClear = (cheque: PostDatedCheque) => {
    setClearingCheque(cheque);
    setClearingDate(cheque.chequeDate <= todayStr ? todayStr : cheque.chequeDate);
    setTargetBankAccountId(bankAccounts[0]?.id || 'acc-1010');
    setClearingNotes(`Realization of Cheque #${cheque.chequeNumber} for ${cheque.customerName}`);
  };

  const handleConfirmClear = async () => {
    if (!clearingCheque) return;
    try {
      setClearingProcessing(true);
      await pdcVaultService.clearCheque(clearingCheque.id, {
        clearingDate,
        bankAccountId: targetBankAccountId,
        notes: clearingNotes,
      });
      toast.success(
        `Cheque ${clearingCheque.chequeNumber} successfully cleared! Transferred LKR ${clearingCheque.amount.toLocaleString()} from 1018 Cheques in Hand to 1010 Bank Account.`
      );
      refreshCheques();
      if (selectedCheque?.id === clearingCheque.id) {
        setSelectedCheque(pdcVaultService.getPDCById(clearingCheque.id));
      }
      setClearingCheque(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Clearance failed');
    } finally {
      setClearingProcessing(false);
    }
  };

  const handleOpenBounce = (cheque: PostDatedCheque) => {
    setBouncingCheque(cheque);
    setBounceReason('Insufficient funds / payment stopped by drawer');
  };

  const handleConfirmBounce = async () => {
    if (!bouncingCheque) return;
    if (!bounceReason.trim()) {
      toast.error('Dishonor reason is required');
      return;
    }
    try {
      setBounceProcessing(true);
      await pdcVaultService.bounceCheque(bouncingCheque.id, bounceReason);
      toast.warning(
        `Cheque ${bouncingCheque.chequeNumber} marked as dishonored/bounced. Accounts Receivable reinstated (Dr 1020 A/R, Cr 1018).`
      );
      refreshCheques();
      if (selectedCheque?.id === bouncingCheque.id) {
        setSelectedCheque(pdcVaultService.getPDCById(bouncingCheque.id));
      }
      setBouncingCheque(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBounceProcessing(false);
    }
  };

  const bankAccounts = useMemo(() => {
    return accounts.filter((a) => a.code === '1010' || a.name.toLowerCase().includes('bank'));
  }, [accounts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Post-Dated Cheque (PDC) Vault
            </h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-mono text-xs">
              GL Asset Account 1018
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Safe custody tracking and bank realization for un-cleared customer cheques. Prevents premature recognition as 1010 Bank operating cash.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/ar/approvals')}
            className="text-xs gap-1.5"
          >
            <Receipt className="h-3.5 w-3.5 text-primary" />
            <span>Receipt Approval Queue</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/ar/credit-notes')}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5 text-primary" />
            <span>Customer Credit Notes</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-amber-200 bg-amber-50/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-amber-800">1018 Cheques in Hand</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-950 mt-1.5 tabular-nums">
            {formatCurrency(metrics.totalInHandAmount)}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 flex items-center justify-between">
            <span>{metrics.totalInHandCount} un-cleared cheques in vault</span>
            <span className="font-semibold">In Hand</span>
          </div>
        </Card>

        <Card className="p-4 border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-800">Matured / Due for Clearing</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-950 mt-1.5 tabular-nums">
            {formatCurrency(metrics.maturedAmount)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center justify-between">
            <span>{metrics.maturedCount} cheques ready for bank deposit</span>
            <span className="font-semibold text-emerald-800">Ready to Clear</span>
          </div>
        </Card>

        <Card className="p-4 border-blue-200 bg-blue-50/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-blue-800">Future Post-Dated</span>
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-950 mt-1.5 tabular-nums">
            {formatCurrency(metrics.futureAmount)}
          </div>
          <div className="text-[11px] text-blue-700 mt-1 flex items-center justify-between">
            <span>{metrics.futureCount} cheques pending future maturity</span>
            <span className="font-semibold">Future Dated</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-600">Realized to Bank (1010)</span>
            <Landmark className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1.5 tabular-nums">
            {formatCurrency(metrics.clearedAmount)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{metrics.clearedCount} realized into bank float</span>
            <span className="font-semibold text-emerald-700">Cleared</span>
          </div>
        </Card>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200/80 w-full sm:w-auto">
          <button
            onClick={() => setFilterTab('IN_HAND')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filterTab === 'IN_HAND'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>In Vault (Un-cleared)</span>
            <span className="rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-bold">
              {metrics.totalInHandCount}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('MATURED')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filterTab === 'MATURED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Due for Clearing</span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
              {metrics.maturedCount}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('FUTURE')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filterTab === 'FUTURE'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Future Dated</span>
            <span className="rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.2 text-[10px] font-bold">
              {metrics.futureCount}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('CLEARED')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filterTab === 'CLEARED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Cleared to Bank</span>
            <span className="rounded-full bg-slate-200 text-slate-800 px-1.5 py-0.2 text-[10px] font-bold">
              {metrics.clearedCount}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              filterTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Cheques
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cheque #, customer, bank..."
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Cheques Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Cheque Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Drawer Bank</th>
                <th className="px-4 py-3">Realization Date</th>
                <th className="px-4 py-3 text-right">Amount (LKR)</th>
                <th className="px-4 py-3 text-center">GL Holding Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                    No cheques found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredCheques.map((cheque) => {
                  const isMatured = cheque.chequeDate <= todayStr;
                  const isInHand = cheque.status === 'IN_HAND';

                  return (
                    <tr
                      key={cheque.id}
                      onClick={() => setSelectedCheque(cheque)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-primary">
                        {cheque.chequeNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{cheque.customerName}</div>
                        {cheque.customerCode && (
                          <span className="font-mono text-[11px] text-slate-400">{cheque.customerCode}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span>{cheque.drawerBank}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="font-mono font-medium text-slate-800">{formatDate(cheque.chequeDate)}</div>
                          {isInHand ? (
                            isMatured ? (
                              <Badge variant="success" className="text-[10px] py-0 px-1.5">
                                Matured / Due Now
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-200 text-blue-700 bg-blue-50/50">
                                Post-Dated
                              </Badge>
                            )
                          ) : cheque.status === 'CLEARED' ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-300 text-emerald-800 bg-emerald-50">
                              Cleared
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                              Bounced
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(cheque.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cheque.status === 'IN_HAND' ? (
                          <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-900 font-mono">
                            1018 Cheques in Hand
                          </Badge>
                        ) : cheque.status === 'CLEARED' ? (
                          <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-50 text-emerald-900 font-mono">
                            1010 Bank Account
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            Dishonored
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1 justify-end">
                          {isInHand && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenBounce(cheque)}
                                className="h-7 px-2 text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
                              >
                                Dishonor
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleOpenClear(cheque)}
                                className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Clear to Bank</span>
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedCheque(cheque)}
                            className="h-7 text-xs text-slate-500 hover:text-slate-800"
                          >
                            Details <ChevronRight className="h-3 w-3 ml-0.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear Cheque Modal */}
      <Dialog
        open={Boolean(clearingCheque)}
        onOpenChange={(open) => !open && setClearingCheque(null)}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-emerald-600" />
            <span>Manually Clear Cheque to Bank Operating Account</span>
          </DialogTitle>
          <DialogDescription>
            On realization date, execute double-entry transfer from Asset 1018 Cheques in Hand into Asset 1010 Bank cash.
          </DialogDescription>
        </DialogHeader>

        {clearingCheque && (
          <div className="space-y-4 py-2 text-xs">
            {/* Cheque Summary */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-primary text-sm">{clearingCheque.chequeNumber}</span>
                  <div className="font-semibold text-slate-800">{clearingCheque.customerName}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Realization Amount</span>
                  <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                    {formatCurrency(clearingCheque.amount)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                <span>Drawer Bank: <strong>{clearingCheque.drawerBank}</strong></span>
                <span>Cheque Date: <strong className="font-mono">{formatDate(clearingCheque.chequeDate)}</strong></span>
              </div>
            </div>

            {/* Inputs: Realization Date and Bank Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Realization Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={clearingDate}
                  onChange={(e) => setClearingDate(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receiving Bank Account <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetBankAccountId}
                  onChange={(e) => setTargetBankAccountId(e.target.value)}
                  className="w-full h-8 text-xs rounded-md border border-slate-300 px-2 bg-white text-slate-800"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                  {bankAccounts.length === 0 && (
                    <option value="acc-1010">1010 - Bank Account (Operating Checking)</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clearance Reference / Bank Statement Notes
              </label>
              <Input
                value={clearingNotes}
                onChange={(e) => setClearingNotes(e.target.value)}
                placeholder="e.g. Deposit slip seal verified, cleared via SLIPS / Cheque Clearing"
                className="h-8 text-xs bg-white"
              />
            </div>

            {/* Accounting Voucher Preview */}
            <div className="p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] space-y-1.5 font-mono">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" />
                Transfer Journal Entry (PDC Realization)
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>
                  Dr {bankAccounts.find((a) => a.id === targetBankAccountId)?.code || '1010'} {bankAccounts.find((a) => a.id === targetBankAccountId)?.name || 'Bank Account'}
                </span>
                <span>+{formatCurrency(clearingCheque.amount)}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Cr 1018 Cheques in Hand (Relieve Vault)</span>
                <span>-{formatCurrency(clearingCheque.amount)}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClearingCheque(null)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmClear}
            disabled={clearingProcessing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Confirm Bank Clearance</span>
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Dishonor / Bounce Modal */}
      <Dialog
        open={Boolean(bouncingCheque)}
        onOpenChange={(open) => !open && setBouncingCheque(null)}
      >
        <DialogHeader>
          <DialogTitle className="text-rose-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Mark Cheque as Dishonored / Bounced</span>
          </DialogTitle>
          <DialogDescription>
            Reinstates Accounts Receivable against {bouncingCheque?.customerName} and relieves 1018 Cheques in Hand vault.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank Return Reason <span className="text-rose-500">*</span>
            </label>
            <Textarea
              value={bounceReason}
              onChange={(e) => setBounceReason(e.target.value)}
              placeholder="e.g. Return memo: Refer to drawer / payment stopped"
              rows={3}
            />
          </div>

          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[11px] font-mono space-y-1">
            <span className="font-bold block font-sans">GL Reversal Impact:</span>
            <div className="flex justify-between">
              <span>Dr 1020 Accounts Receivable ({bouncingCheque?.customerName})</span>
              <span>{formatCurrency(bouncingCheque?.amount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cr 1018 Cheques in Hand</span>
              <span>{formatCurrency(bouncingCheque?.amount || 0)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setBouncingCheque(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmBounce}
            disabled={bounceProcessing}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            Confirm Cheque Dishonor
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
