import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { financeRepository } from '../../api';
import { JournalEntry } from '../../api/types';
import { CurrencyInput } from '../../components/CurrencyInput';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { formatCurrency } from '../../../../utils/formatters';
import Decimal from 'decimal.js';
import {
  Plus,
  Trash2,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ManualJournalLine {
  id: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

interface JournalTemplate {
  id: string;
  name: string;
  description: string;
  memo: string;
  lines: {
    accountCode: string;
    accountName: string;
    description: string;
    isDebit: boolean;
  }[];
}

const TEMPLATES: JournalTemplate[] = [
  {
    id: 'depreciation',
    name: 'Monthly Depreciation',
    description: 'Fixed asset straight-line depreciation allocation',
    memo: 'Monthly straight-line depreciation on plant and vehicles',
    lines: [
      {
        accountCode: '6010', // Or general expense
        accountName: 'Depreciation Expense',
        description: 'Monthly depreciation expense on capital assets',
        isDebit: true,
      },
      {
        accountCode: '1510',
        accountName: 'Accumulated Depreciation / Fixed Assets',
        description: 'Accumulated depreciation contra-asset reserve',
        isDebit: false,
      },
    ],
  },
  {
    id: 'utilities',
    name: 'Office Utilities Accrual',
    description: 'Showroom electricity, water and telecoms accrual',
    memo: 'Monthly utilities and telecoms accrual',
    lines: [
      {
        accountCode: '6010',
        accountName: 'Operating Expense (Utilities)',
        description: 'Office electricity & internet bill',
        isDebit: true,
      },
      {
        accountCode: '2010',
        accountName: 'Accounts Payable',
        description: 'Accrued trade payable to CEB / SLT',
        isDebit: false,
      },
    ],
  },
  {
    id: 'payroll',
    name: 'Payroll & Statutory Accrual',
    description: 'Staff salaries, EPF 12% and ETF 3% accruals',
    memo: 'Monthly staff salaries and statutory contributions accrual',
    lines: [
      {
        accountCode: '6010',
        accountName: 'Operating Expense (Salaries & EPF/ETF)',
        description: 'Staff monthly gross compensation',
        isDebit: true,
      },
      {
        accountCode: '2010',
        accountName: 'Accrued Payroll Liabilities',
        description: 'Net salaries and EPF payable',
        isDebit: false,
      },
    ],
  },
  {
    id: 'amortization',
    name: 'Prepaid Expense Amortization',
    description: 'Annual corporate insurance policy monthly amortization',
    memo: 'Monthly amortization of prepaid insurance',
    lines: [
      {
        accountCode: '6010',
        accountName: 'Operating Expense (Insurance)',
        description: 'Insurance expense portion for current month',
        isDebit: true,
      },
      {
        accountCode: '1010',
        accountName: 'Prepaid Insurance & Assets',
        description: 'Reduction of prepaid insurance asset',
        isDebit: false,
      },
    ],
  },
];

const DEFAULT_LINES: ManualJournalLine[] = [
  { id: 'line-1', accountId: '', description: '', debit: 0, credit: 0 },
  { id: 'line-2', accountId: '', description: '', debit: 0, credit: 0 },
];

export function ManualJournalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { accounts, postJournalEntry, voidJournalEntry } = useFinanceLedger();

  const journalIdParam = searchParams.get('id');
  const [loadedJournal, setLoadedJournal] = useState<JournalEntry | null>(null);

  // Header Inputs: Journal Date, Reference Number, Memo/Description
  const [journalDate, setJournalDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [memo, setMemo] = useState('');

  // Line items
  const [lines, setLines] = useState<ManualJournalLine[]>(DEFAULT_LINES);

  // Sidebar Templates Collapsed state
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load existing journal if ID is passed
  useEffect(() => {
    if (journalIdParam) {
      financeRepository.getJournalEntryById(journalIdParam).then((je) => {
        if (je) {
          setLoadedJournal(je);
          setJournalDate(je.date);
          setReferenceNumber(je.reference || '');
          setMemo(je.description);
          setLines(
            je.lines.map((l) => ({
              id: l.id,
              accountId: l.accountId,
              description: l.description || '',
              debit: l.debit,
              credit: l.credit,
            }))
          );
        }
      });
    }
  }, [journalIdParam]);

  const isAuditLocked = Boolean(
    loadedJournal && (loadedJournal.status === 'POSTED' || loadedJournal.status === 'CLEARED')
  );
  const isAuthorizedForVoid = !currentUser || ['FINANCE_MANAGER', 'MANAGER', 'DIRECTOR'].includes(currentUser.role);

  // Active accounts
  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => a.isActive !== false);
  }, [accounts]);

  const handleAddLine = () => {
    if (isAuditLocked) return;
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random()}`,
        accountId: '',
        description: '',
        debit: 0,
        credit: 0,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (isAuditLocked) return;
    if (lines.length <= 2) {
      toast.error('A journal entry must contain at least 2 lines.');
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateLine = (id: string, field: keyof ManualJournalLine, val: any) => {
    if (isAuditLocked) return;
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;

        // Rule: A single row cannot have values in both Debit and Credit columns simultaneously.
        if (field === 'debit') {
          return {
            ...l,
            debit: val,
            credit: val > 0 ? 0 : l.credit,
          };
        }
        if (field === 'credit') {
          return {
            ...l,
            credit: val,
            debit: val > 0 ? 0 : l.debit,
          };
        }

        return { ...l, [field]: val };
      })
    );
  };

  const handleVoidJournal = async () => {
    if (!loadedJournal) return;
    try {
      setSubmitting(true);
      await voidJournalEntry(loadedJournal.id);
      navigate('/finance/desk');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to void journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Clicking a template instantly overwrites the Line Items Grid
  const handleApplyTemplate = (tmpl: JournalTemplate) => {
    if (isAuditLocked) return;
    setMemo(tmpl.memo);
    const newLines: ManualJournalLine[] = tmpl.lines.map((tl, idx) => {
      // Find matching account by code or partial name
      const matched =
        accounts.find((a) => a.code === tl.accountCode) ||
        accounts.find((a) => a.name.toLowerCase().includes(tl.accountName.toLowerCase())) ||
        accounts[idx] ||
        accounts[0];

      return {
        id: `line-tmpl-${idx}-${Date.now()}`,
        accountId: matched ? matched.id : '',
        description: tl.description,
        debit: 0,
        credit: 0,
      };
    });

    setLines(newLines);
    toast.success(`Applied template: "${tmpl.name}". Enter line amounts to balance.`);
  };

  // Compute Total Debits and Total Credits with decimal.js
  const { totalDebit, totalCredit, difference, differenceAbs } = useMemo(() => {
    let deb = new Decimal(0);
    let cred = new Decimal(0);

    for (const l of lines) {
      if (l.debit) deb = deb.plus(new Decimal(l.debit));
      if (l.credit) cred = cred.plus(new Decimal(l.credit));
    }

    const diff = deb.minus(cred);
    return {
      totalDebit: deb.toNumber(),
      totalCredit: cred.toNumber(),
      difference: diff.toNumber(),
      differenceAbs: diff.abs().toNumber(),
    };
  }, [lines]);

  const isBalanced = useMemo(() => {
    if (totalDebit <= 0 && totalCredit <= 0) return false;
    return Math.abs(difference) <= 0.001;
  }, [totalDebit, totalCredit, difference]);

  // Form validity: required fields, non-empty accounts, debits = credits
  const isFormValid = useMemo(() => {
    if (!journalDate || !memo.trim()) return false;
    if (lines.length < 2) return false;
    const allAccountsSelected = lines.every((l) => Boolean(l.accountId));
    if (!allAccountsSelected) return false;
    return isBalanced;
  }, [journalDate, memo, lines, isBalanced]);

  const handlePostJournal = async () => {
    if (!isFormValid) {
      toast.error('Validation Error: Debits must equal Credits and required fields must be populated.');
      return;
    }

    try {
      setSubmitting(true);
      await postJournalEntry({
        date: journalDate,
        reference: referenceNumber.trim() || undefined,
        description: memo.trim(),
        source: 'MANUAL',
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description.trim() || undefined,
        })),
      });

      toast.success('Manual Journal Entry successfully committed to the General Ledger!');
      navigate('/finance/desk');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post journal entry');
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
              Manual Journal Entry
            </h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Universal Ledger
            </Badge>
            {isAuditLocked && (
              <Badge variant={loadedJournal?.status === 'VOIDED' ? 'destructive' : 'secondary'} className="text-xs font-mono">
                {loadedJournal?.status === 'VOIDED' ? 'VOIDED' : 'AUDIT LOCKED (POSTED)'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Universal double-entry voucher screen for manual journal adjustments, accruals, and ledger corrections.
          </p>
        </div>

        {!isAuditLocked && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
              className="text-xs gap-1.5"
            >
              <Bookmark className="h-3.5 w-3.5 text-primary" />
              <span>{isTemplatesOpen ? 'Hide Templates' : 'Templates Library'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Audit Lock Warning Banner */}
      {isAuditLocked && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-xs uppercase tracking-wider block">
                Audit Lock Active — Read Only ({loadedJournal?.status})
              </span>
              <span className="text-xs text-amber-700">
                Rule 1.4: Posted and cleared financial transactions are permanently locked against direct editing to safeguard the general ledger audit trail.
                {loadedJournal?.status === 'POSTED' && ' Authorized personnel may void/reverse this entry.'}
              </span>
            </div>
          </div>
          {loadedJournal?.status === 'POSTED' && isAuthorizedForVoid && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleVoidJournal}
              disabled={submitting}
              className="gap-1.5 text-xs shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Void / Reverse</span>
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Journal Form */}
        <div className="flex-1 w-full space-y-6">
          {/* Header Inputs: Journal Date, Reference Number, Memo/Description */}
          <Card className="p-5 border-slate-200 shadow-xs bg-white space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Journal Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={journalDate}
                  onChange={(e) => setJournalDate(e.target.value)}
                  disabled={isAuditLocked}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference Number
                </label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  disabled={isAuditLocked}
                  placeholder="e.g. ADJ-2026-009"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Memo / Description <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  disabled={isAuditLocked}
                  placeholder="e.g. Monthly depreciation accrual..."
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>
          </Card>

          {/* Out of Balance Red Warning Banner */}
          {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-800 flex items-center justify-between animate-in fade-in-50">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider block">
                    Out of Balance by {formatCurrency(differenceAbs)}
                  </span>
                  <span className="text-xs text-rose-700">
                    Total Debits ({formatCurrency(totalDebit)}) do not equal Total Credits ({formatCurrency(totalCredit)}). Journal cannot be posted.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Line Items Grid: Dynamic array where users can + Add Line */}
          <Card className="p-5 border-slate-200 shadow-xs bg-white space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Ledger Line Items (Debit / Credit)
              </span>

              {!isAuditLocked && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleAddLine}
                  className="gap-1.5 text-xs text-primary hover:bg-primary-light"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Line</span>
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 w-72">Account</th>
                    <th className="px-3 py-2.5">Line Description</th>
                    <th className="px-3 py-2.5 text-right w-44">Debit (Dr LKR)</th>
                    <th className="px-3 py-2.5 text-right w-44">Credit (Cr LKR)</th>
                    <th className="px-3 py-2.5 text-right w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line) => (
                    <tr key={line.id} className="hover:bg-slate-50/50">
                      {/* Searchable Account combobox/select */}
                      <td className="px-3 py-2">
                        <Select
                          value={line.accountId}
                          onChange={(e) =>
                            handleUpdateLine(line.id, 'accountId', e.target.value)
                          }
                          disabled={isAuditLocked}
                          className="h-9 text-xs"
                        >
                          <option value="">Select GL Account...</option>
                          {activeAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {a.name} ({a.accountClass})
                            </option>
                          ))}
                        </Select>
                      </td>

                      {/* Line Description */}
                      <td className="px-3 py-2">
                        <Input
                          value={line.description}
                          onChange={(e) =>
                            handleUpdateLine(line.id, 'description', e.target.value)
                          }
                          disabled={isAuditLocked}
                          placeholder="Line memo..."
                          className="h-9 text-xs"
                        />
                      </td>

                      {/* Debit (Currency Input) */}
                      <td className="px-3 py-2 text-right">
                        <CurrencyInput
                          value={line.debit || ''}
                          onChange={(val) => handleUpdateLine(line.id, 'debit', val)}
                          placeholder="0.00"
                          disabled={submitting || isAuditLocked}
                        />
                      </td>

                      {/* Credit (Currency Input) */}
                      <td className="px-3 py-2 text-right">
                        <CurrencyInput
                          value={line.credit || ''}
                          onChange={(val) => handleUpdateLine(line.id, 'credit', val)}
                          placeholder="0.00"
                          disabled={submitting || isAuditLocked}
                        />
                      </td>

                      {/* Delete Line */}
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                          disabled={lines.length <= 2 || isAuditLocked}
                          title="Remove line"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Total Debits and Total Credits Labels */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Total Debits
                  </span>
                  <span className="text-base font-bold font-mono text-primary tabular-nums">
                    {formatCurrency(totalDebit)}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Total Credits
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                    {formatCurrency(totalCredit)}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Balance Status
                  </span>
                  {isBalanced ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 className="h-4 w-4" /> Balanced (0.00)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600 font-bold font-mono tabular-nums">
                      <AlertTriangle className="h-4 w-4" /> Out by {formatCurrency(differenceAbs)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button: Post Journal OR Void / Reverse Journal */}
              {isAuditLocked ? (
                loadedJournal?.status === 'POSTED' && isAuthorizedForVoid ? (
                  <Button
                    variant="destructive"
                    onClick={handleVoidJournal}
                    disabled={submitting}
                    className="font-semibold gap-1.5 shadow-xs"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>{submitting ? 'Voiding...' : 'Void / Reverse Journal'}</span>
                  </Button>
                ) : (
                  <Badge variant="outline" className="px-3 py-1.5 text-xs text-slate-500 border-slate-300">
                    <Lock className="h-3.5 w-3.5 mr-1" />
                    {loadedJournal?.status === 'VOIDED' ? 'Transaction Voided' : 'Audit Locked'}
                  </Badge>
                )
              ) : (
                <Button
                  onClick={handlePostJournal}
                  disabled={!isFormValid || submitting}
                  className="bg-primary hover:bg-primary-hover text-white shadow-xs font-semibold gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  <span>{submitting ? 'Posting...' : 'Post Journal'}</span>
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Collapsible Sidebar: Templates Library */}
        {isTemplatesOpen && (
          <div className="w-full lg:w-80 space-y-3 shrink-0">
            <Card className="p-4 border-slate-200 bg-slate-50/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Bookmark className="h-4 w-4 text-primary" />
                  <span>Templates</span>
                </div>
                <span className="text-[11px] text-slate-400">1-Click Apply</span>
              </div>

              <div className="space-y-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 bg-white hover:border-primary-border hover:bg-primary-light/40 transition-all space-y-1 shadow-2xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-primary">
                        {tmpl.name}
                      </span>
                      <Sparkles className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {tmpl.description}
                    </p>
                    <div className="pt-1.5 text-[10px] text-slate-400 font-mono">
                      {tmpl.lines.map((l) => `${l.isDebit ? 'Dr' : 'Cr'} ${l.accountName}`).join(' • ')}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
