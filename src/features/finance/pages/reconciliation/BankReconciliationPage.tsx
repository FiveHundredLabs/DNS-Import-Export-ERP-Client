import { useState, useMemo, useEffect, useRef } from 'react';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { CurrencyInput } from '../../components/CurrencyInput';
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
import Decimal from 'decimal.js';
import {
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Upload,
  Sparkles,
  Lock,
  FileText,
  Search,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  bankReconciliationService,
  ReconciliationPeriod,
} from '../../services/bankReconciliationService';
import {
  parseBankStatement,
  SAMPLE_CSV_STATEMENT,
  SAMPLE_MT940_STATEMENT,
  ParseBankStatementResult,
} from '../../services/bankStatementParser';
import {
  autoMatchTransactions,
} from '../../services/bankReconciliationMatcher';

export interface BankStatementTransaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  type: 'DEPOSIT' | 'PAYMENT';
  amount: number;
  debit: number;  // GL: Dr Bank (Deposit) | Bank Stmt: Payment/Outflow
  credit: number; // GL: Cr Bank (Payment) | Bank Stmt: Deposit/Inflow
  isCleared: boolean;
  matchedSystemTxId?: string;
  matchedStatementLineId?: string;
  matchConfidence?: 'EXACT' | 'DATE_TOLERANCE' | 'FUZZY' | 'MANUAL';
}

const INITIAL_SYSTEM_TRANSACTIONS: BankStatementTransaction[] = [
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

const INITIAL_STATEMENT_ROWS: BankStatementTransaction[] = [
  {
    id: 'stmt-1',
    date: '2026-09-02',
    reference: 'DEP-8841',
    description: 'Customer bulk payment deposit REC-2026-0480',
    type: 'DEPOSIT',
    amount: 885000,
    debit: 0,
    credit: 885000,
    isCleared: false,
  },
  {
    id: 'stmt-2',
    date: '2026-09-05',
    reference: 'CHQ-1049',
    description: 'Supplier settlement Kelani Cables PLC BILL-2026-003',
    type: 'PAYMENT',
    amount: 450000,
    debit: 450000,
    credit: 0,
    isCleared: false,
  },
  {
    id: 'stmt-3',
    date: '2026-09-12',
    reference: 'DEP-9012',
    description: 'Wholesale dealer direct transfer Muthurajawela',
    type: 'DEPOSIT',
    amount: 212400,
    debit: 0,
    credit: 212400,
    isCleared: false,
  },
  {
    id: 'stmt-4',
    date: '2026-09-18',
    reference: 'CHQ-1052',
    description: 'Vendor payment Schneider Electric BILL-2026-001',
    type: 'PAYMENT',
    amount: 1318000,
    debit: 1318000,
    credit: 0,
    isCleared: false,
  },
  {
    id: 'stmt-5',
    date: '2026-09-22',
    reference: 'DEP-9045',
    description: 'Southern Solar deposit REC-2026-0493',
    type: 'DEPOSIT',
    amount: 531000,
    debit: 0,
    credit: 531000,
    isCleared: false,
  },
];

export function BankReconciliationPage() {
  const { accounts, postJournalEntry } = useFinanceLedger();

  // Filter bank accounts (1010/1015/Bank)
  const bankAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.accountClass === 'ASSET' &&
        (a.code.startsWith('1010') ||
          a.code.startsWith('1015') ||
          a.code.startsWith('1018') ||
          a.name.toLowerCase().includes('bank'))
    );
  }, [accounts]);

  // Setup Form State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('acc-1010');
  const [statementEndingDate, setStatementEndingDate] = useState<string>('2026-09-30');
  const [targetStatementBalance, setTargetStatementBalance] = useState<number>(2360400);
  const [isWorkspaceActive, setIsWorkspaceActive] = useState<boolean>(false);

  // Locked Prior Balance State
  const [beginningBalance, setBeginningBalance] = useState<number>(() => {
    return bankReconciliationService.getBeginningBalance('acc-1010', 0).balance;
  });
  const [isLockedFromPrior, setIsLockedFromPrior] = useState<boolean>(() => {
    return bankReconciliationService.getBeginningBalance('acc-1010', 0).isLockedFromPrior;
  });
  const [priorReconciledPeriod, setPriorReconciledPeriod] = useState<ReconciliationPeriod | null>(() => {
    return bankReconciliationService.getBeginningBalance('acc-1010', 0).priorPeriod;
  });

  // Split-Pane Transactions
  const [systemTransactions, setSystemTransactions] = useState<BankStatementTransaction[]>(
    INITIAL_SYSTEM_TRANSACTIONS
  );
  const [statementTransactions, setStatementTransactions] = useState<BankStatementTransaction[]>(
    INITIAL_STATEMENT_ROWS
  );

  // Interactive Pane Search & Filters
  const [systemSearch, setSystemSearch] = useState('');
  const [systemFilter, setSystemFilter] = useState<'ALL' | 'CLEARED' | 'UNCLEARED'>('ALL');
  const [statementSearch, setStatementSearch] = useState('');
  const [statementFilter, setStatementFilter] = useState<'ALL' | 'CLEARED' | 'UNCLEARED'>('ALL');
  const [activeHoverId, setActiveHoverId] = useState<string | null>(null);
  const [dateToleranceDays, setDateToleranceDays] = useState<number>(3);

  // Statement Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [statementRawText, setStatementRawText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParseBankStatementResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline Adjustment Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'FEE' | 'INTEREST'>('FEE');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [offsetAccountId, setOffsetAccountId] = useState('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // Prior Audit History Drawer / Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [reconciliationHistory, setReconciliationHistory] = useState<ReconciliationPeriod[]>([]);

  // Update Beginning Balance dynamically from prior reconciled period whenever account changes
  useEffect(() => {
    const acc = bankAccounts.find((b) => b.id === selectedAccountId || b.code === selectedAccountId) || bankAccounts[0];
    const accId = acc ? acc.id : selectedAccountId || 'acc-1010';

    const begBalInfo = bankReconciliationService.getBeginningBalance(accId, 0);
    setBeginningBalance(begBalInfo.balance);
    setIsLockedFromPrior(begBalInfo.isLockedFromPrior);
    setPriorReconciledPeriod(begBalInfo.priorPeriod);

    // Refresh history
    setReconciliationHistory(bankReconciliationService.getReconciliationHistory(accId));
  }, [bankAccounts, selectedAccountId]);

  // Sync selected bank account with fallback to prevent null during initial async load
  const selectedBankAccount = useMemo(() => {
    const found =
      accounts.find((a) => a.id === selectedAccountId || a.code === selectedAccountId) ||
      bankAccounts[0];
    if (found) return found;
    return {
      id: 'acc-1010',
      code: '1010',
      name: 'Bank Account',
      accountClass: 'ASSET' as const,
      accountSubClass: 'CURRENT_ASSET' as const,
      currentBalance: beginningBalance,
    };
  }, [accounts, selectedAccountId, bankAccounts, beginningBalance]);

  const handleStartReconciliation = () => {
    const accId = selectedAccountId || bankAccounts[0]?.id || 'acc-1010';
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

  // Toggle single system transaction cleared
  const handleToggleSystemCleared = (id: string) => {
    setSystemTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextCleared = !t.isCleared;
          // If unchecking, clear pairing link
          return {
            ...t,
            isCleared: nextCleared,
            matchedStatementLineId: nextCleared ? t.matchedStatementLineId : undefined,
          };
        }
        return t;
      })
    );
  };

  // Toggle single statement line cleared
  const handleToggleStatementCleared = (id: string) => {
    setStatementTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextCleared = !t.isCleared;
          return {
            ...t,
            isCleared: nextCleared,
            matchedSystemTxId: nextCleared ? t.matchedSystemTxId : undefined,
          };
        }
        return t;
      })
    );
  };

  // Header Status Bar Calculations with decimal.js
  const { clearedDeposits, clearedPayments, clearedBalance, difference, differenceAbs } =
    useMemo(() => {
      let dep = new Decimal(0);
      let pay = new Decimal(0);

      for (const t of systemTransactions) {
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
    }, [systemTransactions, beginningBalance, targetStatementBalance]);

  // Reconcile Button is STRICTLY disabled unless Difference equals exactly 0.00
  const isReconciled = useMemo(() => {
    return Math.abs(difference) <= 0.001;
  }, [difference]);

  // Phase 4: Complete Reconciliation and lock ending balance for subsequent period
  const handleFinishReconciliation = () => {
    if (!isReconciled) {
      toast.error('Reconciliation error: Difference must equal exactly 0.00 before closing.');
      return;
    }
    if (!selectedBankAccount) {
      toast.error('Bank account not selected.');
      return;
    }

    try {
      const clearedCount = systemTransactions.filter((t) => t.isCleared).length;

      const savedPeriod = bankReconciliationService.completeReconciliation({
        accountId: selectedBankAccount.id,
        accountCode: selectedBankAccount.code,
        accountName: selectedBankAccount.name,
        statementEndingDate,
        beginningBalance,
        endingBalance: targetStatementBalance,
        clearedDeposits,
        clearedPayments,
        clearedBalance,
        difference: 0,
        clearedCount,
        reconciledBy: 'Finance Controller / Treasury',
        notes: `Month-end reconciliation closed with zero audit variance. Target ending balance: ${formatCurrency(
          targetStatementBalance
        )}`,
      });

      // Update state for next period: beginning balance dynamically locks to this ending balance!
      setBeginningBalance(savedPeriod.endingBalance);
      setIsLockedFromPrior(true);
      setPriorReconciledPeriod(savedPeriod);
      setReconciliationHistory(
        bankReconciliationService.getReconciliationHistory(selectedBankAccount.id)
      );

      toast.success(
        `Bank Account ${selectedBankAccount.code} successfully reconciled as of ${statementEndingDate}! Beginning balance for next period locked to ${formatCurrency(
          savedPeriod.endingBalance
        )}.`
      );
      setIsWorkspaceActive(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to finalize reconciliation');
    }
  };

  // Heuristic Auto-Match Engine Execution
  const handleRunAutoMatch = () => {
    const result = autoMatchTransactions(systemTransactions, statementTransactions, {
      dateToleranceDays,
    });

    setSystemTransactions(result.systemTransactions);
    setStatementTransactions(result.statementTransactions);

    toast.success(
      `Heuristic Auto-Match complete: ${result.matchedCount} transaction(s) auto-cleared (${result.matchRatePercentage}% match rate).`
    );
  };

  // Reset/Unmatch all transactions
  const handleResetMatches = () => {
    setSystemTransactions((prev) =>
      prev.map((t) => ({
        ...t,
        isCleared: false,
        matchedStatementLineId: undefined,
        matchConfidence: undefined,
      }))
    );
    setStatementTransactions((prev) =>
      prev.map((t) => ({
        ...t,
        isCleared: false,
        matchedSystemTxId: undefined,
        matchConfidence: undefined,
      }))
    );
    toast.info('All transaction matches and cleared flags have been reset.');
  };

  // Statement Parsing & Upload
  const handleParseInput = (rawText: string, filename?: string) => {
    setStatementRawText(rawText);
    const parsed = parseBankStatement(rawText, filename);
    setParsedPreview(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseInput(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseInput(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCSV = () => {
    setUploadedFileName('sample_statement.csv');
    handleParseInput(SAMPLE_CSV_STATEMENT, 'sample_statement.csv');
  };

  const handleLoadSampleMT940 = () => {
    setUploadedFileName('swift_statement.940');
    handleParseInput(SAMPLE_MT940_STATEMENT, 'swift_statement.940');
  };

  const handleApplyStatementToWorkspace = () => {
    if (!parsedPreview || !parsedPreview.success || parsedPreview.transactions.length === 0) {
      toast.error('No valid transactions parsed to import.');
      return;
    }

    // Auto-update ending balance if available in statement metadata
    if (parsedPreview.metadata.closingBalance !== undefined) {
      setTargetStatementBalance(parsedPreview.metadata.closingBalance);
    }
    if (parsedPreview.metadata.closingDate) {
      setStatementEndingDate(parsedPreview.metadata.closingDate);
    }

    setStatementTransactions(parsedPreview.transactions);
    setIsUploadModalOpen(false);
    toast.success(
      `Imported ${parsedPreview.transactions.length} statement rows (${parsedPreview.metadata.format} format).`
    );
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
          adjAccount = accounts.find((a) => a.code === '6030' || a.accountClass === 'EXPENSE') || {
            id: 'acc-6030',
            code: '6030',
            name: 'Office Rent & Utilities',
            accountClass: 'EXPENSE' as const,
          } as any;
        } else {
          adjAccount = accounts.find((a) => a.code === '4010' || a.accountClass === 'INCOME') || {
            id: 'acc-4010',
            code: '4010',
            name: 'Sales Revenue',
            accountClass: 'INCOME' as const,
          } as any;
        }
      }

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

      const uniqueId = Date.now();
      const sysId = `tx-adj-${uniqueId}`;
      const stmtId = `stmt-adj-${uniqueId}`;

      // Append transaction to system transactions ALREADY CHECKED as Cleared
      const newSysTx: BankStatementTransaction = {
        id: sysId,
        date: statementEndingDate,
        reference: `ADJ-${isFee ? 'FEE' : 'INT'}`,
        description: adjustmentDescription || (isFee ? 'Bank Fee & Charges' : 'Interest Income'),
        type: isFee ? 'PAYMENT' : 'DEPOSIT',
        amount: adjustmentAmount,
        debit: isFee ? 0 : adjustmentAmount,
        credit: isFee ? adjustmentAmount : 0,
        isCleared: true,
        matchedStatementLineId: stmtId,
        matchConfidence: 'EXACT',
      };

      // Append paired line to statement pane
      const newStmtRow: BankStatementTransaction = {
        id: stmtId,
        date: statementEndingDate,
        reference: `ADJ-${isFee ? 'FEE' : 'INT'}`,
        description: adjustmentDescription || (isFee ? 'Bank Fee & Charges' : 'Interest Income'),
        type: isFee ? 'PAYMENT' : 'DEPOSIT',
        amount: adjustmentAmount,
        debit: isFee ? adjustmentAmount : 0,
        credit: isFee ? 0 : adjustmentAmount,
        isCleared: true,
        matchedSystemTxId: sysId,
        matchConfidence: 'EXACT',
      };

      setSystemTransactions((prev) => [newSysTx, ...prev]);
      setStatementTransactions((prev) => [newStmtRow, ...prev]);

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

  // Filtered lists for System & Statement panes
  const filteredSystemList = useMemo(() => {
    return systemTransactions.filter((tx) => {
      if (systemFilter === 'CLEARED' && !tx.isCleared) return false;
      if (systemFilter === 'UNCLEARED' && tx.isCleared) return false;
      if (systemSearch.trim()) {
        const query = systemSearch.toLowerCase();
        return (
          tx.reference.toLowerCase().includes(query) ||
          tx.description.toLowerCase().includes(query) ||
          tx.amount.toString().includes(query)
        );
      }
      return true;
    });
  }, [systemTransactions, systemFilter, systemSearch]);

  const filteredStatementList = useMemo(() => {
    return statementTransactions.filter((stmt) => {
      if (statementFilter === 'CLEARED' && !stmt.isCleared) return false;
      if (statementFilter === 'UNCLEARED' && stmt.isCleared) return false;
      if (statementSearch.trim()) {
        const query = statementSearch.toLowerCase();
        return (
          stmt.reference.toLowerCase().includes(query) ||
          stmt.description.toLowerCase().includes(query) ||
          stmt.amount.toString().includes(query)
        );
      }
      return true;
    });
  }, [statementTransactions, statementFilter, statementSearch]);

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
              Phase 4 Treasury & Audit Control
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Split-pane electronic bank statement reconciliation with dynamic prior-balance locking and heuristic auto-matching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <History className="h-3.5 w-3.5 text-slate-500" />
            <span>Audit History</span>
          </Button>

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
      </div>

      {/* 6.1 Reconciliation Setup Modal / Form */}
      {!isWorkspaceActive ? (
        <Card className="max-w-2xl mx-auto p-6 border-slate-200 shadow-sm bg-white space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-lg bg-primary text-white shadow-xs">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Reconciliation Setup & Statement Opening
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Specify the bank account, cut-off ending date, and closing balance from your physical or electronic statement.
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
                    {b.code} - {b.name} (Live Ledger Balance: {formatCurrency(b.currentBalance)})
                  </option>
                ))}
              </Select>
            </div>

            {/* Locked Prior Balance Display */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                  Locked Prior Balance (Beginning Balance)
                </span>
                {isLockedFromPrior ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-medium">
                    Locked to Prior Reconciled Period
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                    Opening Balance Baseline
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="font-mono text-base font-bold text-slate-900">
                  {formatCurrency(beginningBalance)}
                </span>
                {priorReconciledPeriod && (
                  <span className="text-[11px] text-slate-500">
                    As of period ended {formatDate(priorReconciledPeriod.statementEndingDate)} (Reconciled by {priorReconciledPeriod.reconciledBy})
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                Notice: In accordance with statutory audit controls, the beginning balance dynamically locks to the ending balance of the previously reconciled period and does not fluctuate with live ledger balance.
              </p>
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
                Target Statement Balance (From Physical / Electronic Statement) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput
                value={targetStatementBalance}
                onChange={(val) => setTargetStatementBalance(val)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="text-xs gap-1.5 border-slate-300"
            >
              <Upload className="h-3.5 w-3.5 text-primary" />
              <span>Upload Statement First (CSV / MT940)</span>
            </Button>

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
                <span className="text-slate-400 block text-[10.5px] font-semibold uppercase flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-600" />
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

              {/* Highly Visible Difference */}
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

          {/* Matching Control Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Heuristic Auto-Match Button */}
              <Button
                size="sm"
                onClick={handleRunAutoMatch}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Auto-Match (Heuristic)</span>
              </Button>

              {/* Tolerance Selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500">Date Window:</span>
                <Select
                  value={dateToleranceDays.toString()}
                  onChange={(e) => setDateToleranceDays(parseInt(e.target.value, 10))}
                  className="h-6 text-xs border-0 bg-transparent py-0 px-1 font-semibold text-slate-700 focus:ring-0"
                >
                  <option value="0">Exact Date (±0d)</option>
                  <option value="1">±1 Day</option>
                  <option value="3">±3 Days (Standard)</option>
                  <option value="7">±7 Days (Relaxed)</option>
                </Select>
              </div>

              {/* Upload Statement Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                className="gap-1.5 text-xs text-slate-700 border-slate-300"
              >
                <Upload className="h-3.5 w-3.5 text-primary" />
                <span>Upload Statement (CSV / MT940)</span>
              </Button>

              {/* Unmatch / Reset Matches */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetMatches}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Reset Matches
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* 6.3 Inline Adjustment Tool Button */}
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
                className="gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Reconcile Account</span>
              </Button>
            </div>
          </div>

          {/* Split-Pane Grid: Left = System Records, Right = Bank Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT PANE: System General Ledger Transactions */}
            <div className="space-y-3">
              <Card className="border-slate-200 shadow-2xs overflow-hidden">
                {/* Pane Header */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        System Records (GL {selectedBankAccount?.code})
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-white text-slate-600">
                        {systemTransactions.length} lines
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      General ledger book entries for customer receipts, supplier bills & journals
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-slate-200 text-[11px]">
                    <button
                      onClick={() => setSystemFilter('ALL')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        systemFilter === 'ALL' ? 'bg-primary text-white' : 'text-slate-600'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSystemFilter('UNCLEARED')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        systemFilter === 'UNCLEARED' ? 'bg-amber-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Open ({systemTransactions.filter((t) => !t.isCleared).length})
                    </button>
                    <button
                      onClick={() => setSystemFilter('CLEARED')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        systemFilter === 'CLEARED' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Cleared ({systemTransactions.filter((t) => t.isCleared).length})
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="p-2 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Search system reference, memo, or amount..."
                      value={systemSearch}
                      onChange={(e) => setSystemSearch(e.target.value)}
                      className="h-8 pl-8 text-xs border-slate-200"
                    />
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 z-10">
                      <tr>
                        <th className="px-3 py-2 w-10 text-center">Cleared</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Reference</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Dr (Deposit)</th>
                        <th className="px-3 py-2 text-right">Cr (Payment)</th>
                        <th className="px-3 py-2 text-center">Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSystemList.map((tx) => {
                        const isHovered = activeHoverId === tx.id || activeHoverId === tx.matchedStatementLineId;
                        return (
                          <tr
                            key={tx.id}
                            onMouseEnter={() => setActiveHoverId(tx.id)}
                            onMouseLeave={() => setActiveHoverId(null)}
                            className={`transition-colors ${
                              isHovered
                                ? 'bg-primary-light/50 ring-1 ring-primary/30'
                                : tx.isCleared
                                ? 'bg-emerald-50/40 hover:bg-emerald-50/60'
                                : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={tx.isCleared}
                                onChange={() => handleToggleSystemCleared(tx.id)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                              {formatDate(tx.date)}
                            </td>
                            <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                              {tx.reference}
                            </td>
                            <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate" title={tx.description}>
                              {tx.description}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold tabular-nums text-primary whitespace-nowrap">
                              {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold tabular-nums text-emerald-700 whitespace-nowrap">
                              {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {tx.matchedStatementLineId ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 font-medium">
                                  {tx.matchConfidence === 'EXACT' ? 'Exact' : 'Matched'}
                                </Badge>
                              ) : tx.isCleared ? (
                                <Badge variant="outline" className="bg-slate-100 text-slate-600 text-[10px] px-1 py-0">
                                  Manual
                                </Badge>
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSystemList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                            No system transactions matching filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* RIGHT PANE: Bank Statement Lines */}
            <div className="space-y-3">
              <Card className="border-slate-200 shadow-2xs overflow-hidden">
                {/* Pane Header */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        Bank Statement Lines (Feed)
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-white text-slate-600">
                        {statementTransactions.length} lines
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Electronic bank statement rows imported via CSV or SWIFT MT940
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-slate-200 text-[11px]">
                    <button
                      onClick={() => setStatementFilter('ALL')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        statementFilter === 'ALL' ? 'bg-primary text-white' : 'text-slate-600'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatementFilter('UNCLEARED')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        statementFilter === 'UNCLEARED' ? 'bg-amber-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Open ({statementTransactions.filter((t) => !t.isCleared).length})
                    </button>
                    <button
                      onClick={() => setStatementFilter('CLEARED')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        statementFilter === 'CLEARED' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Cleared ({statementTransactions.filter((t) => t.isCleared).length})
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="p-2 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Search bank statement reference, memo, or amount..."
                      value={statementSearch}
                      onChange={(e) => setStatementSearch(e.target.value)}
                      className="h-8 pl-8 text-xs border-slate-200"
                    />
                  </div>
                </div>

                {/* Statement Table */}
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 z-10">
                      <tr>
                        <th className="px-3 py-2 w-10 text-center">Cleared</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Reference</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Inflow (Cr)</th>
                        <th className="px-3 py-2 text-right">Outflow (Dr)</th>
                        <th className="px-3 py-2 text-center">Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStatementList.map((stmt) => {
                        const isHovered = activeHoverId === stmt.id || activeHoverId === stmt.matchedSystemTxId;
                        return (
                          <tr
                            key={stmt.id}
                            onMouseEnter={() => setActiveHoverId(stmt.id)}
                            onMouseLeave={() => setActiveHoverId(null)}
                            className={`transition-colors ${
                              isHovered
                                ? 'bg-primary-light/50 ring-1 ring-primary/30'
                                : stmt.isCleared
                                ? 'bg-emerald-50/40 hover:bg-emerald-50/60'
                                : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={stmt.isCleared}
                                onChange={() => handleToggleStatementCleared(stmt.id)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                              {formatDate(stmt.date)}
                            </td>
                            <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                              {stmt.reference}
                            </td>
                            <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate" title={stmt.description}>
                              {stmt.description}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold tabular-nums text-primary whitespace-nowrap">
                              {stmt.credit > 0 ? formatCurrency(stmt.credit) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold tabular-nums text-emerald-700 whitespace-nowrap">
                              {stmt.debit > 0 ? formatCurrency(stmt.debit) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {stmt.matchedSystemTxId ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 font-medium">
                                  {stmt.matchConfidence === 'EXACT' ? 'Exact' : 'Matched'}
                                </Badge>
                              ) : stmt.isCleared ? (
                                <Badge variant="outline" className="bg-slate-100 text-slate-600 text-[10px] px-1 py-0">
                                  Manual
                                </Badge>
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredStatementList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                            No bank statement lines matching filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
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

      {/* Statement Upload Modal (CSV / MT940) */}
      <Dialog
        open={isUploadModalOpen}
        onOpenChange={(open) => !open && setIsUploadModalOpen(false)}
      >
        <DialogHeader>
          <DialogTitle>Upload Electronic Bank Statement</DialogTitle>
          <DialogDescription>
            Import electronic bank statements in standard CSV format or SWIFT MT940 format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Quick Presets Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-semibold text-slate-700">Quick Test Templates:</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSampleCSV}
                className="text-[11px] h-7 gap-1"
              >
                <FileText className="h-3 w-3 text-emerald-600" />
                <span>Load Sample CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSampleMT940}
                className="text-[11px] h-7 gap-1"
              >
                <FileText className="h-3 w-3 text-indigo-600" />
                <span>Load Sample MT940</span>
              </Button>
            </div>
          </div>

          {/* File Picker with Drag & Drop */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="p-3 border-2 border-dashed border-slate-200 rounded-lg hover:border-primary/50 transition-colors bg-slate-50/50"
          >
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Choose or Drag & Drop Statement File (.csv, .940, .sta, .txt)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.940,.sta,.txt"
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer border border-slate-200 rounded-md p-1 bg-white"
            />
            {uploadedFileName && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                Selected: <span className="font-mono text-slate-700 font-semibold">{uploadedFileName}</span>
              </span>
            )}
          </div>

          {/* Direct Raw Text Paste */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Or Paste Statement Text (CSV / MT940 Raw Content)
            </label>
            <textarea
              rows={5}
              value={statementRawText}
              onChange={(e) => handleParseInput(e.target.value)}
              placeholder="Paste raw CSV lines or MT940 tags (:20:, :61:, etc.) here..."
              className="w-full p-2.5 text-xs font-mono rounded-md border border-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-hidden"
            />
          </div>

          {/* Parse Result Summary */}
          {parsedPreview && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                parsedPreview.success
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {parsedPreview.success ? (
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Successfully parsed {parsedPreview.transactions.length} transactions ({parsedPreview.metadata.format} format)</span>
                  </div>
                  {parsedPreview.metadata.openingBalance !== undefined && (
                    <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-700">
                      <span>Statement Opening Balance:</span>
                      <span className="font-mono font-bold">{formatCurrency(parsedPreview.metadata.openingBalance)}</span>
                      {Math.abs(parsedPreview.metadata.openingBalance - beginningBalance) > 0.01 ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] ml-1">
                          Differs from locked prior balance ({formatCurrency(beginningBalance)})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] ml-1">
                          Matches locked prior balance
                        </Badge>
                      )}
                    </div>
                  )}
                  {parsedPreview.metadata.closingBalance !== undefined && (
                    <p className="text-[11px] text-emerald-800">
                      Statement Ending Balance detected: <span className="font-mono font-bold">{formatCurrency(parsedPreview.metadata.closingBalance)}</span>
                      {parsedPreview.metadata.closingDate && ` as of ${parsedPreview.metadata.closingDate}`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>Parsing error in statement</span>
                  </div>
                  <p className="text-[11px] text-rose-700">{parsedPreview.errors.join('; ')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApplyStatementToWorkspace}
            disabled={!parsedPreview || !parsedPreview.success || parsedPreview.transactions.length === 0}
            className="bg-primary hover:bg-primary-hover text-white font-semibold"
          >
            Import to Workspace
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Prior Reconciliations Audit History Modal */}
      <Dialog
        open={isHistoryModalOpen}
        onOpenChange={(open) => !open && setIsHistoryModalOpen(false)}
      >
        <DialogHeader>
          <DialogTitle>Reconciliation Audit History</DialogTitle>
          <DialogDescription>
            Historical record of reconciled periods for {selectedBankAccount?.name} ({selectedBankAccount?.code}).
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3 text-xs max-h-[450px] overflow-y-auto">
          {reconciliationHistory.length === 0 ? (
            <p className="text-slate-500 py-6 text-center">No prior reconciliations found for this account.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Period Cut-off</th>
                    <th className="px-3 py-2 text-right">Beginning Bal</th>
                    <th className="px-3 py-2 text-right">Ending Bal</th>
                    <th className="px-3 py-2 text-center">Cleared</th>
                    <th className="px-3 py-2">Reconciled By</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconciliationHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                        {formatDate(h.statementEndingDate)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                        {formatCurrency(h.beginningBalance)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(h.endingBalance)}
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-slate-600">
                        {h.clearedCount}
                      </td>
                      <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]" title={h.reconciledBy}>
                        {h.reconciledBy}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          {h.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryModalOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
