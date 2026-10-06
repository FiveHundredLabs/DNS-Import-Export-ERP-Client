import { useState, useMemo, useEffect } from 'react';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { CurrencyInput } from '../../components/CurrencyInput';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../components/ui/dialog';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import Decimal from 'decimal.js';
import {
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export interface BankStatementTransaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  type: 'DEPOSIT' | 'PAYMENT';
  amount: number;
  debit: number; // Deposit into bank
  credit: number; // Payment out of bank
  isCleared: boolean;
}

const INITIAL_BANK_TRANSACTIONS: BankStatementTransaction[] = [
  {
    id: 'tx-1',
    date: '2026-09-02',
    reference: 'DEP-8841',
    description: 'Customer bulk payment deposit (REC-2026-0480)',
    type: 'DEPOSIT',
    amount: 885000,
    debit: 885000,
    credit: 0,
    isCleared: false,
  },
  {
    id: 'tx-2',
    date: '2026-09-05',
    reference: 'CHQ-1049',
    description: 'Supplier settlement Kelani Cables PLC (BILL-2026-003)',
    type: 'PAYMENT',
    amount: 450000,
    debit: 0,
    credit: 450000,
    isCleared: false,
  },
  {
    id: 'tx-3',
    date: '2026-09-12',
    reference: 'DEP-9012',
    description: 'Wholesale dealer direct transfer Muthurajawela',
    type: 'DEPOSIT',
    amount: 212400,
    debit: 212400,
    credit: 0,
    isCleared: false,
  },
  {
    id: 'tx-4',
    date: '2026-09-18',
    reference: 'CHQ-1052',
    description: 'Vendor payment Schneider Electric (BILL-2026-001)',
    type: 'PAYMENT',
    amount: 1318000,
    debit: 0,
    credit: 1318000,
    isCleared: false,
  },
  {
    id: 'tx-5',
    date: '2026-09-22',
    reference: 'DEP-9045',
    description: 'Southern Solar deposit (REC-2026-0493)',
    type: 'DEPOSIT',
    amount: 531000,
    debit: 531000,
    credit: 0,
    isCleared: false,
  },
];

export function BankReconciliationPage() {
  const { accounts, postJournalEntry } = useFinanceLedger();

  // Filter bank accounts (1010/1015)
  const bankAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.accountClass === 'ASSET' &&
        (a.code.startsWith('1010') ||
          a.code.startsWith('1015') ||
          a.name.toLowerCase().includes('bank'))
    );
  }, [accounts]);

  // Setup Form State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('1');
  const [statementEndingDate, setStatementEndingDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [targetStatementBalance, setTargetStatementBalance] = useState<number>(2500000);
  const [isWorkspaceActive, setIsWorkspaceActive] = useState<boolean>(false);

  // Workspace Transactions
  const [transactions, setTransactions] = useState<BankStatementTransaction[]>(
    INITIAL_BANK_TRANSACTIONS
  );
  const [beginningBalance, setBeginningBalance] = useState<number>(2500000.0);

  // Inline Adjustment Modal
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'FEE' | 'INTEREST'>('FEE');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [offsetAccountId, setOffsetAccountId] = useState('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // Auto-select first bank account
  useEffect(() => {
    if (bankAccounts.length > 0) {
      if (!selectedAccountId || !bankAccounts.some((b) => b.id === selectedAccountId)) {
        setSelectedAccountId(bankAccounts[0].id);
      }
      const acc = bankAccounts.find((b) => b.id === selectedAccountId) || bankAccounts[0];
      if (acc) {
        setBeginningBalance(acc.currentBalance || 2500000);
        setTargetStatementBalance(acc.currentBalance || 2500000);
      }
    }
  }, [bankAccounts, selectedAccountId]);

  const selectedBankAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || bankAccounts[0] || null;
  }, [accounts, selectedAccountId, bankAccounts]);

  const handleStartReconciliation = () => {
    const accId = selectedAccountId || bankAccounts[0]?.id || '1';
    if (!accId) {
      toast.error('Please select a bank account.');
      return;
    }
    if (!statementEndingDate) {
      toast.error('Please enter a statement ending date.');
      return;
    }
    if (!selectedAccountId) {
      setSelectedAccountId(accId);
    }
    setIsWorkspaceActive(true);
    toast.success('Bank reconciliation workspace initialized.');
  };

  const handleToggleCleared = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCleared: !t.isCleared } : t))
    );
  };

  // Header Status Bar Calculations with decimal.js
  const { clearedDeposits, clearedPayments, clearedBalance, difference, differenceAbs } =
    useMemo(() => {
      let dep = new Decimal(0);
      let pay = new Decimal(0);

      for (const t of transactions) {
        if (t.isCleared) {
          if (t.debit > 0) dep = dep.plus(new Decimal(t.debit));
          if (t.credit > 0) pay = pay.plus(new Decimal(t.credit));
        }
      }

      const beg = new Decimal(beginningBalance || 0);
      const clearedBal = beg.plus(dep).minus(pay);
      const targetBal = new Decimal(targetStatementBalance || 0);
      const diff = targetBal.minus(clearedBal);

      return {
        clearedDeposits: dep.toNumber(),
        clearedPayments: pay.toNumber(),
        clearedBalance: clearedBal.toNumber(),
        difference: diff.toNumber(),
        differenceAbs: diff.abs().toNumber(),
      };
    }, [transactions, beginningBalance, targetStatementBalance]);

  // Reconcile Button is STRICTLY disabled unless Difference equals exactly 0.00
  const isReconciled = useMemo(() => {
    return Math.abs(difference) <= 0.001;
  }, [difference]);

  const handleFinishReconciliation = () => {
    if (!isReconciled) {
      toast.error('Reconciliation error: Difference must equal exactly 0.00 before closing.');
      return;
    }
    toast.success(
      `Bank Account ${selectedBankAccount?.code} successfully reconciled as of ${statementEndingDate}!`
    );
    setIsWorkspaceActive(false);
  };

  // Inline Adjustment Tool: Save adjustment, post to GL, and appear in Left Pane ALREADY CHECKED as Cleared
  const handleSaveAdjustment = async () => {
    if (adjustmentAmount <= 0) {
      toast.error('Adjustment amount must be greater than zero.');
      return;
    }
    if (!selectedBankAccount) {
      toast.error('Bank account not selected.');
      return;
    }

    try {
      setSubmittingAdjustment(true);

      // Find expense/income account
      let adjAccount = accounts.find((a) => a.id === offsetAccountId);
      if (!adjAccount) {
        if (adjustmentType === 'FEE') {
          adjAccount = accounts.find((a) => a.code === '6030' || a.accountClass === 'EXPENSE');
        } else {
          adjAccount = accounts.find((a) => a.code === '4010' || a.accountClass === 'INCOME');
        }
      }

      if (!adjAccount) {
        throw new Error('Could not identify offsetting General Ledger account.');
      }

      // Bank Fee: Dr Expense, Cr Bank
      // Interest Earned: Dr Bank, Cr Income
      const isFee = adjustmentType === 'FEE';
      const lines = isFee
        ? [
            {
              accountId: adjAccount.id,
              debit: adjustmentAmount,
              credit: 0,
              description: adjustmentDescription || 'Bank Service Charge & Processing Fee',
            },
            {
              accountId: selectedBankAccount.id,
              debit: 0,
              credit: adjustmentAmount,
              description: 'Bank account fee deduction',
            },
          ]
        : [
            {
              accountId: selectedBankAccount.id,
              debit: adjustmentAmount,
              credit: 0,
              description: 'Credit interest earned',
            },
            {
              accountId: adjAccount.id,
              debit: 0,
              credit: adjustmentAmount,
              description: adjustmentDescription || 'Bank Interest Income Earned',
            },
          ];

      await postJournalEntry({
        date: statementEndingDate,
        description: `Bank Reconciliation Adjustment: ${isFee ? 'Bank Fee' : 'Interest Income'}`,
        reference: `ADJ-REC-${Date.now().toString().slice(-4)}`,
        source: 'MANUAL',
        lines,
      });

      // Append transaction to transactions list ALREADY CHECKED as Cleared
      const newTx: BankStatementTransaction = {
        id: `tx-adj-${Date.now()}`,
        date: statementEndingDate,
        reference: `ADJ-${isFee ? 'FEE' : 'INT'}`,
        description: adjustmentDescription || (isFee ? 'Bank Fee & Charges' : 'Interest Income'),
        type: isFee ? 'PAYMENT' : 'DEPOSIT',
        amount: adjustmentAmount,
        debit: isFee ? 0 : adjustmentAmount,
        credit: isFee ? adjustmentAmount : 0,
        isCleared: true, // Already checked as Cleared!
      };

      setTransactions((prev) => [newTx, ...prev]);
      setIsAdjustmentModalOpen(false);
      setAdjustmentAmount(0);
      setAdjustmentDescription('');
      toast.success(
        `Adjustment of ${formatCurrency(adjustmentAmount)} posted to GL and added as Cleared.`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post adjustment');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Bank Reconciliation Workspace
            </h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Treasury & Audit Control
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Match physical bank statement line items against General Ledger ledger records to achieve 0.00 audit variance.
          </p>
        </div>

        {isWorkspaceActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWorkspaceActive(false)}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Setup</span>
          </Button>
        )}
      </div>

      {/* 6.1 Reconciliation Setup Modal / Form */}
      {!isWorkspaceActive ? (
        <Card className="max-w-2xl mx-auto p-6 border-slate-200 shadow-sm bg-white space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-lg bg-primary text-white">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Reconciliation Setup & Statement Opening
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Specify the bank account, cut-off ending date, and closing balance from your physical statement.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Bank Account dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Account <span className="text-rose-500">*</span>
              </label>
              <Select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="h-9 text-xs"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name} ({formatCurrency(b.currentBalance)})
                  </option>
                ))}
              </Select>
            </div>

            {/* Statement Ending Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Statement Ending Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={statementEndingDate}
                onChange={(e) => setStatementEndingDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Target Statement Balance */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Statement Balance (From Physical Statement) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput
                value={targetStatementBalance}
                onChange={(val) => setTargetStatementBalance(val)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleStartReconciliation}
              className="bg-primary hover:bg-primary-hover text-white shadow-xs font-semibold gap-1.5"
            >
              <span>Start Reconciliation</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ) : (
        /* 6.2 Split-Pane Matching Dashboard */
        <div className="space-y-6">
          {/* Header Status Bar */}
          <Card className="p-4 border-slate-200 bg-slate-50 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
              {/* Beginning Balance */}
              <div>
                <span className="text-slate-400 block text-[10.5px] font-semibold uppercase">
                  Beginning Balance
                </span>
                <span className="text-sm font-bold font-mono text-slate-800 tabular-nums">
                  {formatCurrency(beginningBalance)}
                </span>
              </div>

              {/* Cleared Deposits */}
              <div>
                <span className="text-slate-400 block text-[10.5px] font-semibold uppercase">
                  Cleared Deposits (+)
                </span>
                <span className="text-sm font-bold font-mono text-primary tabular-nums">
                  +{formatCurrency(clearedDeposits)}
                </span>
              </div>

              {/* Cleared Payments */}
              <div>
                <span className="text-slate-400 block text-[10.5px] font-semibold uppercase">
                  Cleared Payments (-)
                </span>
                <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums">
                  -{formatCurrency(clearedPayments)}
                </span>
              </div>

              {/* Cleared Balance */}
              <div>
                <span className="text-slate-400 block text-[10.5px] font-semibold uppercase">
                  Cleared Balance
                </span>
                <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                  {formatCurrency(clearedBalance)}
                </span>
              </div>

              {/* Highly Visible Difference (Target Statement Balance minus Cleared Balance) */}
              <div className="border-l border-slate-200 pl-4">
                <span className="text-slate-400 block text-[10.5px] font-semibold uppercase">
                  Statement Difference
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isReconciled ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-sm">
                      <CheckCircle2 className="h-4 w-4" /> 0.00 (Balanced)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600 font-bold font-mono text-sm tabular-nums">
                      <AlertTriangle className="h-4 w-4" /> {formatCurrency(differenceAbs)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Left Pane (System Transactions) & Action Tool */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  System Transactions for {selectedBankAccount?.name} ({selectedBankAccount?.code})
                </h3>
                <p className="text-xs text-slate-500">
                  Check transactions that match your bank statement lines.
                </p>
              </div>

              {/* 6.3 Inline Adjustment Tool Button */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAdjustmentModalOpen(true)}
                  className="gap-1.5 text-xs text-primary border-primary-border hover:bg-primary-light"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Adjustment (Bank Fee/Interest)</span>
                </Button>

                {/* Completion Action Button: Strictly disabled unless Difference === 0.00 */}
                <Button
                  size="sm"
                  onClick={handleFinishReconciliation}
                  disabled={!isReconciled}
                  className="gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Reconcile Account</span>
                </Button>
              </div>
            </div>

            {/* Transactions Data Grid */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">Cleared</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Reference #</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Deposit (Dr LKR)</th>
                      <th className="px-4 py-3 text-right">Payment (Cr LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className={`transition-colors ${
                          tx.isCleared ? 'bg-emerald-50/40 hover:bg-emerald-50/60' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={tx.isCleared}
                            onChange={() => handleToggleCleared(tx.id)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                          {tx.reference}
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-medium">
                          {tx.description}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-primary">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-emerald-700">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6.3 Inline Adjustment Tool Modal */}
      <Dialog
        open={isAdjustmentModalOpen}
        onOpenChange={(open) => !open && setIsAdjustmentModalOpen(false)}
      >
        <DialogHeader>
          <DialogTitle>Add Bank Reconciliation Adjustment</DialogTitle>
          <DialogDescription>
            Post an immediate GL entry for bank charges, merchant fees, or interest income. The offset will lock to {selectedBankAccount?.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Locked Offset Bank Account */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">
              Locked Bank Account Offset
            </span>
            <span className="font-mono font-bold text-slate-900">
              {selectedBankAccount?.code} - {selectedBankAccount?.name}
            </span>
          </div>

          {/* Adjustment Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adjustment Type
              </label>
              <Select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as any)}
                className="h-9 text-xs"
              >
                <option value="FEE">Bank Fee / Charge (Expense)</option>
                <option value="INTEREST">Interest Earned (Income)</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adjustment Amount (LKR) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput
                value={adjustmentAmount}
                onChange={(val) => setAdjustmentAmount(val)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Offsetting GL Account Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {adjustmentType === 'FEE' ? 'Expense Account' : 'Income Account'}
            </label>
            <Select
              value={offsetAccountId}
              onChange={(e) => setOffsetAccountId(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="">Default ({adjustmentType === 'FEE' ? '6030 Operating Overheads' : '4010 Sales / Income'})</option>
              {accounts
                .filter((a) =>
                  adjustmentType === 'FEE'
                    ? a.accountClass === 'EXPENSE'
                    : a.accountClass === 'INCOME'
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Memo
            </label>
            <Input
              value={adjustmentDescription}
              onChange={(e) => setAdjustmentDescription(e.target.value)}
              placeholder="e.g. Monthly corporate account maintenance fee"
              className="h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdjustmentModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAdjustment}
            disabled={adjustmentAmount <= 0 || submittingAdjustment}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            {submittingAdjustment ? 'Posting...' : 'Save & Cleared to Reconciliation'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
