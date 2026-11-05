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
import { DoubleEntryHoverBadge } from '../../components/DoubleEntryHoverBadge';
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
  CheckSquare,
  Square,
  LayoutList,
  Columns2,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
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
  const [workspaceViewMode, setWorkspaceViewMode] = useState<'MANUAL' | 'SPLIT'>('MANUAL');
  const [manualTypeFilter, setManualTypeFilter] = useState<'ALL' | 'DEPOSITS' | 'PAYMENTS'>('ALL');

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
      const fallbackId = isFee ? 'acc-6030' : 'acc-4010';
      const resolvedAdjAccountId = adjAccount?.id || fallbackId;

      const lines = isFee
        ? [
            {
              accountId: resolvedAdjAccountId,
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
              accountId: resolvedAdjAccountId,
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

  // Full-width manual verification filtered list (includes transaction type tabs: deposits vs payments)
  const filteredManualSystemList = useMemo(() => {
    return systemTransactions.filter((tx) => {
      if (systemFilter === 'CLEARED' && !tx.isCleared) return false;
      if (systemFilter === 'UNCLEARED' && tx.isCleared) return false;
      if (manualTypeFilter === 'DEPOSITS' && tx.debit <= 0) return false;
      if (manualTypeFilter === 'PAYMENTS' && tx.credit <= 0) return false;
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
  }, [systemTransactions, systemFilter, manualTypeFilter, systemSearch]);

  const handleMarkAllVisibleCleared = () => {
    const visibleIds = new Set(filteredManualSystemList.map((t) => t.id));
    setSystemTransactions((prev) =>
      prev.map((t) => (visibleIds.has(t.id) ? { ...t, isCleared: true } : t))
    );
    toast.success(`Marked ${visibleIds.size} transaction(s) as Cleared.`);
  };

  const handleUnmarkAllVisible = () => {
    const visibleIds = new Set(filteredManualSystemList.map((t) => t.id));
    setSystemTransactions((prev) =>
      prev.map((t) => (visibleIds.has(t.id) ? { ...t, isCleared: false } : t))
    );
    toast.info(`Unmarked ${visibleIds.size} transaction(s).`);
  };

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
          <p className="text-xs text-muted-foreground mt-0.5">
            Electronic statement parsing, heuristic auto-matching, and balance reconciliation.
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

      {/* 3-Step Reconciliation Workflow Progress Guide */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1: Setup */}
          <div
            onClick={() => {
              if (isWorkspaceActive) setIsWorkspaceActive(false);
            }}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
              !isWorkspaceActive
                ? 'bg-primary-light border-2 border-primary text-primary-text shadow-2xs'
                : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100/70'
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                !isWorkspaceActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {!isWorkspaceActive ? '1' : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">Step 1: Setup & Statement</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {selectedBankAccount ? `${selectedBankAccount.code} • Statement Opening` : 'Account & Opening Balances'}
              </div>
            </div>
          </div>

          {/* Step 2: Match & Clear */}
          <div
            onClick={() => {
              if (!isWorkspaceActive) handleStartReconciliation();
            }}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
              isWorkspaceActive && !isReconciled
                ? 'bg-primary-light border-2 border-primary text-primary-text shadow-2xs'
                : isWorkspaceActive && isReconciled
                ? 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100/70'
                : 'bg-slate-50/50 border border-slate-200/60 text-slate-400'
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isWorkspaceActive && isReconciled
                  ? 'bg-emerald-600 text-white'
                  : isWorkspaceActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {isWorkspaceActive && isReconciled ? <CheckCircle2 className="h-4 w-4" /> : '2'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">Step 2: Match & Clear</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {isWorkspaceActive
                  ? `${systemTransactions.filter((t) => t.isCleared).length} cleared • Variance Matching`
                  : 'Auto-Match & Pair Transactions'}
              </div>
            </div>
          </div>

          {/* Step 3: Finalize & Adjust */}
          <div
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              isWorkspaceActive && isReconciled
                ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 shadow-2xs'
                : 'bg-slate-50/50 border border-slate-200/60 text-slate-400'
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isWorkspaceActive && isReconciled
                  ? 'bg-emerald-600 text-white shadow-xs animate-pulse'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              3
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">Step 3: Finalize & Adjust</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {isWorkspaceActive && isReconciled
                  ? 'Balanced 0.00 • Lock Period'
                  : 'Bank Fees / Interest & Close'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6.1 Reconciliation Setup Modal / Form */}
      {!isWorkspaceActive ? (
        <Card className="w-full p-6 sm:p-8 border-slate-200 shadow-sm bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
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

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs py-1 px-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Manual Verification Ready</span>
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (7 cols): Parameters & Quick Method Info */}
            <div className="lg:col-span-7 space-y-5">
              {/* Bank Account dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Account <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="h-10 text-xs"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name} (Live Ledger Balance: {formatCurrency(b.currentBalance)})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Statement Ending Date & Target Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Statement Ending Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={statementEndingDate}
                    onChange={(e) => setStatementEndingDate(e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                  <span className="text-[10.5px] text-slate-400 mt-1 block">
                    Cut-off date printed on your bank statement.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Statement Balance (From Physical / Electronic Statement) <span className="text-rose-500">*</span>
                  </label>
                  <CurrencyInput
                    value={targetStatementBalance}
                    onChange={(val) => setTargetStatementBalance(val)}
                    placeholder="0.00"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-1 block">
                    Final closing balance from bank statement document.
                  </span>
                </div>
              </div>

              {/* Method Explainer Card */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary-light/30 space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Streamlined Manual Reconciliation (No File Upload Needed)</span>
                </div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  You can reconcile directly against your physical paper statement or online banking portal. Simply tick the system ledger transactions that have cleared on your statement. The system continuously calculates cleared deposits, payments, and variance in real-time until difference equals exactly 0.00.
                </p>
              </div>
            </div>

            {/* Right Column (5 cols): Locked Prior Balance Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
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
                  <div className="pt-1 pb-1">
                    <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 block tracking-tight">
                      {formatCurrency(beginningBalance)}
                    </span>
                    {priorReconciledPeriod && (
                      <span className="text-[11px] text-slate-500 block mt-1.5">
                        As of period ended {formatDate(priorReconciledPeriod.statementEndingDate)} (Reconciled by {priorReconciledPeriod.reconciledBy})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-2.5 border-t border-slate-200/80 pt-2.5">
                    Notice: In accordance with statutory audit controls, the beginning balance dynamically locks to the ending balance of the previously reconciled period and does not fluctuate with live ledger balance.
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/60">
                  <span>Selected Bank Account:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedBankAccount?.code} ({selectedBankAccount?.name})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="text-xs gap-1.5 border-slate-300 w-full sm:w-auto"
            >
              <Upload className="h-3.5 w-3.5 text-primary" />
              <span>Upload Statement First (CSV / MT940)</span>
            </Button>

            <Button
              onClick={handleStartReconciliation}
              className="bg-primary hover:bg-primary-hover text-white shadow-xs font-semibold gap-1.5 w-full sm:w-auto px-6 h-10 text-xs"
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

          {/* De-cluttered Matching Control Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            {/* Left Cluster: View Switcher, Matching Tools & Statement Import */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Workspace View Mode Selector */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setWorkspaceViewMode('MANUAL')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                    workspaceViewMode === 'MANUAL'
                      ? 'bg-white text-primary shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span>Manual Verification (Full Width)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceViewMode('SPLIT')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                    workspaceViewMode === 'SPLIT'
                      ? 'bg-white text-primary shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns2 className="h-3.5 w-3.5" />
                  <span>Split-Pane Feed Match</span>
                </button>
              </div>

              <div className="flex items-center bg-slate-50 p-1 rounded-md border border-slate-200 gap-1.5">
                <Button
                  size="sm"
                  onClick={handleRunAutoMatch}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold h-7 px-2.5 shadow-2xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Auto-Match (Heuristic)</span>
                </Button>

                <div className="flex items-center gap-1 text-xs text-slate-600 px-1.5">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Window:</span>
                  <Select
                    value={dateToleranceDays.toString()}
                    onChange={(e) => setDateToleranceDays(parseInt(e.target.value, 10))}
                    className="h-6 text-xs border-0 bg-transparent py-0 px-1 font-semibold text-slate-700 focus:ring-0"
                  >
                    <option value="0">±0d Exact</option>
                    <option value="1">±1d</option>
                    <option value="3">±3d Standard</option>
                    <option value="7">±7d Relaxed</option>
                  </Select>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetMatches}
                  className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-800"
                >
                  Reset
                </Button>
              </div>

              {/* Upload Statement Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                className="gap-1.5 text-xs text-slate-700 border-slate-300 h-8"
              >
                <Upload className="h-3.5 w-3.5 text-primary" />
                <span>Upload Statement</span>
              </Button>
            </div>

            {/* Right Cluster: Adjustments & Completion */}
            <div className="flex flex-wrap items-center gap-2">
              {/* 6.3 Inline Adjustment Tool Button with DoubleEntryHoverBadge */}
              <div className="flex items-center gap-1.5">
                <DoubleEntryHoverBadge
                  lines={[
                    {
                      accountCode: '6030',
                      accountName: 'Bank Service Charges & Fees',
                      type: 'DEBIT',
                      amount: 500,
                    },
                    {
                      accountCode: selectedBankAccount?.code || '1010',
                      accountName: selectedBankAccount?.name || 'Bank Account',
                      type: 'CREDIT',
                      amount: 500,
                    },
                  ]}
                  title="Fee Adjustment Preview: Dr 6030 / Cr 1010"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAdjustmentModalOpen(true)}
                  className="gap-1.5 text-xs text-primary border-primary-border hover:bg-primary-light h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Adjustment (Fee/Interest)</span>
                </Button>
              </div>

              {/* Completion Action Button: Strictly disabled unless Difference === 0.00 */}
              <div className="flex items-center gap-1.5">
                <DoubleEntryHoverBadge
                  lines={[
                    {
                      accountCode: selectedBankAccount?.code || '1010',
                      accountName: `${selectedBankAccount?.name || 'Bank Account'} (Closing Target)`,
                      type: 'DEBIT',
                      amount: targetStatementBalance,
                    },
                    {
                      accountCode: '1010',
                      accountName: 'Reconciled Ledger Balance',
                      type: 'CREDIT',
                      amount: clearedBalance,
                    },
                  ]}
                  title="Reconciliation Audit Period Lock"
                />
                <Button
                  size="sm"
                  onClick={handleFinishReconciliation}
                  disabled={!isReconciled}
                  className="gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs disabled:opacity-50 h-8"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Reconcile Account</span>
                </Button>
              </div>
            </div>
          </div>

          {/* FULL-WIDTH MANUAL RECONCILIATION TABLE */}
          {workspaceViewMode === 'MANUAL' && (
            <Card className="border-slate-200 shadow-2xs overflow-hidden w-full bg-white">
              {/* Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      System Records (GL {selectedBankAccount?.code}) — Manual Statement Verification
                    </span>
                    <Badge variant="outline" className="text-xs bg-white text-slate-700 font-semibold">
                      {systemTransactions.length} lines total
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tick each transaction that appears on your paper or online statement. Difference recalculates live to 0.00.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Transaction Inflow/Outflow Type Tabs */}
                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setManualTypeFilter('ALL')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        manualTypeFilter === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({systemTransactions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualTypeFilter('DEPOSITS')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        manualTypeFilter === 'DEPOSITS'
                          ? 'bg-primary text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Deposits (Dr) ({systemTransactions.filter((t) => t.debit > 0).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualTypeFilter('PAYMENTS')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        manualTypeFilter === 'PAYMENTS'
                          ? 'bg-emerald-700 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Payments (Cr) ({systemTransactions.filter((t) => t.credit > 0).length})
                    </button>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setSystemFilter('ALL')}
                      className={`px-2.5 py-1 rounded font-medium ${
                        systemFilter === 'ALL' ? 'bg-primary text-white' : 'text-slate-600'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSystemFilter('UNCLEARED')}
                      className={`px-2.5 py-1 rounded font-medium ${
                        systemFilter === 'UNCLEARED' ? 'bg-amber-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Open ({systemTransactions.filter((t) => !t.isCleared).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSystemFilter('CLEARED')}
                      className={`px-2.5 py-1 rounded font-medium ${
                        systemFilter === 'CLEARED' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Cleared ({systemTransactions.filter((t) => t.isCleared).length})
                    </button>
                  </div>

                  {/* Batch Tools */}
                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllVisibleCleared}
                      className="text-xs h-7 px-2.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                      <CheckSquare className="h-3.5 w-3.5 mr-1" />
                      <span>Clear All Visible</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleUnmarkAllVisible}
                      className="text-xs h-7 px-2 text-slate-500 hover:text-slate-800"
                    >
                      <Square className="h-3.5 w-3.5 mr-1" />
                      <span>Unmark</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="p-2.5 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search reference (DEP/CHQ), memo description, or amount..."
                    value={systemSearch}
                    onChange={(e) => setSystemSearch(e.target.value)}
                    className="h-9 pl-9 text-xs border-slate-200 w-full"
                  />
                </div>
              </div>

              {/* Full Width Transactions Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3 w-16 text-center">Verify</th>
                      <th className="px-4 py-3 whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 whitespace-nowrap">Reference / Cheque</th>
                      <th className="px-4 py-3">Description / Payee</th>
                      <th className="px-4 py-3 text-center">Type</th>
                      <th className="px-4 py-3 text-right">Inflow / Deposit (Dr)</th>
                      <th className="px-4 py-3 text-right">Outflow / Payment (Cr)</th>
                      <th className="px-4 py-3 text-center">Audit Status</th>
                      <th className="px-4 py-3 text-center">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredManualSystemList.map((tx) => {
                      return (
                        <tr
                          key={tx.id}
                          className={`transition-colors ${
                            tx.isCleared
                              ? 'bg-emerald-50/50 hover:bg-emerald-50/70'
                              : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={tx.isCleared}
                              onChange={() => handleToggleSystemCleared(tx.id)}
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-xs">
                            {formatDate(tx.date)}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{tx.reference}</span>
                              {tx.reference.startsWith('ADJ-') && (
                                <DoubleEntryHoverBadge
                                  lines={
                                    tx.type === 'PAYMENT'
                                      ? [
                                          {
                                            accountCode: '6030',
                                            accountName: 'Bank Fee Expense',
                                            type: 'DEBIT',
                                            amount: tx.amount,
                                          },
                                          {
                                            accountCode: selectedBankAccount?.code || '1010',
                                            accountName: selectedBankAccount?.name || 'Bank Account',
                                            type: 'CREDIT',
                                            amount: tx.amount,
                                          },
                                        ]
                                      : [
                                          {
                                            accountCode: selectedBankAccount?.code || '1010',
                                            accountName: selectedBankAccount?.name || 'Bank Account',
                                            type: 'DEBIT',
                                            amount: tx.amount,
                                          },
                                          {
                                            accountCode: '4010',
                                            accountName: 'Interest Income',
                                            type: 'CREDIT',
                                            amount: tx.amount,
                                          },
                                        ]
                                  }
                                  title="Bank Adjustment GL Posting"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-medium">
                            {tx.description}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {tx.debit > 0 ? (
                              <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-[10px] gap-1 font-semibold">
                                <ArrowDownLeft className="h-3 w-3 text-primary" />
                                <span>Deposit</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] gap-1 font-semibold">
                                <ArrowUpRight className="h-3 w-3 text-slate-500" />
                                <span>Payment</span>
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-primary text-sm whitespace-nowrap">
                            {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 text-sm whitespace-nowrap">
                            {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {tx.isCleared ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px] font-semibold gap-1">
                                <Check className="h-3 w-3" />
                                <span>Cleared</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[11px] font-semibold">
                                <span>Uncleared</span>
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <Button
                              variant={tx.isCleared ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleToggleSystemCleared(tx.id)}
                              className={`h-7 px-3 text-xs font-semibold ${
                                tx.isCleared
                                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                              }`}
                            >
                              {tx.isCleared ? 'Unverify' : 'Verify & Clear'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredManualSystemList.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-xs text-slate-400">
                          No transactions found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Summary Footer */}
              <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-mono">
                <div className="flex items-center gap-4">
                  <span>Showing {filteredManualSystemList.length} of {systemTransactions.length} entries</span>
                  <span className="text-emerald-700 font-bold">
                    {systemTransactions.filter((t) => t.isCleared).length} Cleared
                  </span>
                  <span className="text-amber-700">
                    {systemTransactions.filter((t) => !t.isCleared).length} Outstanding
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Total Deposits: <strong className="text-primary">{formatCurrency(clearedDeposits)}</strong></span>
                  <span>Total Payments: <strong className="text-emerald-700">{formatCurrency(clearedPayments)}</strong></span>
                </div>
              </div>
            </Card>
          )}

          {/* Split-Pane Grid: Left = System Records, Right = Bank Statement */}
          <div className={workspaceViewMode === 'SPLIT' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'hidden'}>
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
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto w-full">
                  <table className="w-full min-w-[650px] text-left text-xs">
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
                              <div className="flex items-center gap-1">
                                <span>{tx.reference}</span>
                                {tx.reference.startsWith('ADJ-') && (
                                  <DoubleEntryHoverBadge
                                    lines={
                                      tx.type === 'PAYMENT'
                                        ? [
                                            {
                                              accountCode: '6030',
                                              accountName: 'Bank Fee Expense',
                                              type: 'DEBIT',
                                              amount: tx.amount,
                                            },
                                            {
                                              accountCode: selectedBankAccount?.code || '1010',
                                              accountName: selectedBankAccount?.name || 'Bank Account',
                                              type: 'CREDIT',
                                              amount: tx.amount,
                                            },
                                          ]
                                        : [
                                            {
                                              accountCode: selectedBankAccount?.code || '1010',
                                              accountName: selectedBankAccount?.name || 'Bank Account',
                                              type: 'DEBIT',
                                              amount: tx.amount,
                                            },
                                            {
                                              accountCode: '4010',
                                              accountName: 'Interest Income',
                                              type: 'CREDIT',
                                              amount: tx.amount,
                                            },
                                          ]
                                    }
                                    title="Bank Adjustment GL Posting"
                                  />
                                )}
                              </div>
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
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto w-full">
                  <table className="w-full min-w-[650px] text-left text-xs">
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

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdjustmentModalOpen(false)}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <DoubleEntryHoverBadge
              lines={
                adjustmentType === 'FEE'
                  ? [
                      {
                        accountCode: accounts.find((a) => a.id === offsetAccountId)?.code || '6030',
                        accountName: accounts.find((a) => a.id === offsetAccountId)?.name || 'Bank Service Charge Expense',
                        type: 'DEBIT',
                        amount: adjustmentAmount || 0,
                      },
                      {
                        accountCode: selectedBankAccount?.code || '1010',
                        accountName: selectedBankAccount?.name || 'Bank Account',
                        type: 'CREDIT',
                        amount: adjustmentAmount || 0,
                      },
                    ]
                  : [
                      {
                        accountCode: selectedBankAccount?.code || '1010',
                        accountName: selectedBankAccount?.name || 'Bank Account',
                        type: 'DEBIT',
                        amount: adjustmentAmount || 0,
                      },
                      {
                        accountCode: accounts.find((a) => a.id === offsetAccountId)?.code || '4010',
                        accountName: accounts.find((a) => a.id === offsetAccountId)?.name || 'Interest Income',
                        type: 'CREDIT',
                        amount: adjustmentAmount || 0,
                      },
                    ]
              }
              title="Adjustment Double-Entry GL Impact"
            />
            <Button
              size="sm"
              onClick={handleSaveAdjustment}
              disabled={adjustmentAmount <= 0 || submittingAdjustment}
              className="bg-primary hover:bg-primary-hover text-white font-semibold"
            >
              {submittingAdjustment ? 'Posting...' : 'Save & Cleared to Reconciliation'}
            </Button>
          </div>
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
            <div className="overflow-x-auto rounded-md border border-slate-200 w-full">
              <table className="w-full min-w-[600px] text-left text-xs">
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
