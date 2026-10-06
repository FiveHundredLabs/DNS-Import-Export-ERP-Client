import { useState } from 'react';
import { useFinanceLedger } from '../hooks/useFinanceLedger';
import { useJournalValidation } from '../hooks/useJournalValidation';
import { DebitCreditRow, JournalLineItemState } from '../components/DebitCreditRow';
import { BalancingBar } from '../components/BalancingBar';
import { AccountModal } from '../components/AccountModal';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  Plus,
  Zap,
  Sparkles,
  History,
  Building2,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Info,
  Eye,
  Lock,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { toast } from 'sonner';

const DEFAULT_EMPTY_LINES: JournalLineItemState[] = [
  {
    id: 'row-1',
    accountId: '',
    accountCode: '',
    accountName: '',
    debit: 0,
    credit: 0,
    description: '',
  },
  {
    id: 'row-2',
    accountId: '',
    accountCode: '',
    accountName: '',
    debit: 0,
    credit: 0,
    description: '',
  },
];

export function FinanceDeskPage() {
  const { accounts, journals, postJournalEntry, createAccount, fetchAccounts } = useFinanceLedger();

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<JournalLineItemState[]>(DEFAULT_EMPTY_LINES);
  const [isPosting, setIsPosting] = useState(false);

  // Modal State for Inline Account Creation
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Validation Hook
  const { totalDebit, totalCredit, difference, isBalanced, isValid } = useJournalValidation(lines);

  // Line Handlers
  const handleLineChange = (index: number, updated: Partial<JournalLineItemState>) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updated };
      return next;
    });
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        accountId: '',
        accountCode: '',
        accountName: '',
        debit: 0,
        credit: 0,
        description: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      toast.error('A double-entry journal voucher must have at least 2 lines');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetForm = () => {
    setDescription('');
    setReference('');
    setDate(new Date().toISOString().slice(0, 10));
    setLines(DEFAULT_EMPTY_LINES);
  };

  // Smart Auto-Balance Handler
  const handleAutoBalance = () => {
    const diff = totalDebit - totalCredit;
    if (Math.abs(diff) < 0.01) return;

    // Find first line that has 0 debit and 0 credit
    const emptyRowIndex = lines.findIndex((l) => l.debit === 0 && l.credit === 0);

    if (diff > 0) {
      // More debits than credits -> balance with credit = diff
      if (emptyRowIndex !== -1) {
        handleLineChange(emptyRowIndex, { credit: diff, debit: 0 });
      } else {
        setLines((prev) => [
          ...prev,
          {
            id: `row-${Date.now()}`,
            accountId: '',
            accountCode: '',
            accountName: '',
            debit: 0,
            credit: diff,
            description: '',
          },
        ]);
      }
      toast.info(`Auto-balanced with Credit of ${formatCurrency(diff)}`);
    } else {
      // More credits than debits -> balance with debit = |diff|
      const absDiff = Math.abs(diff);
      if (emptyRowIndex !== -1) {
        handleLineChange(emptyRowIndex, { debit: absDiff, credit: 0 });
      } else {
        setLines((prev) => [
          ...prev,
          {
            id: `row-${Date.now()}`,
            accountId: '',
            accountCode: '',
            accountName: '',
            debit: absDiff,
            credit: 0,
            description: '',
          },
        ]);
      }
      toast.info(`Auto-balanced with Debit of ${formatCurrency(absDiff)}`);
    }
  };

  // One-Click Presets
  const applyPreset = async (type: 'SUPPLIER_PAYMENT' | 'ASSET_PURCHASE' | 'OFFICE_OVERHEAD') => {
    let currentAccounts = accounts;
    if (currentAccounts.length === 0) {
      currentAccounts = await fetchAccounts();
    }
    const bankAcc = currentAccounts.find((a) => a.code === '1010');
    const apAcc = currentAccounts.find((a) => a.code === '2010');
    const assetAcc = currentAccounts.find((a) => a.code === '1510') || currentAccounts.find((a) => a.accountSubClass === 'NON_CURRENT_ASSET');
    const overheadAcc = currentAccounts.find((a) => a.code === '6030') || currentAccounts.find((a) => a.accountSubClass === 'OPERATING_EXPENSE');

    if (!bankAcc) {
      toast.error('Bank Account not found in Chart of Accounts');
      return;
    }

    if (type === 'SUPPLIER_PAYMENT') {
      if (!apAcc) return;
      setDescription('Settlement of vendor trade payable invoice');
      setReference(`PAY-SUP-${Math.floor(100 + Math.random() * 900)}`);
      setLines([
        {
          id: 'row-preset-1',
          accountId: apAcc.id,
          accountCode: apAcc.code,
          accountName: apAcc.name,
          debit: 250000,
          credit: 0,
          description: 'Reduce Accounts Payable for supplier bill',
        },
        {
          id: 'row-preset-2',
          accountId: bankAcc.id,
          accountCode: bankAcc.code,
          accountName: bankAcc.name,
          debit: 0,
          credit: 250000,
          description: 'Bank payment remittance transfer',
        },
      ]);
      toast.info('Applied preset: Pay Supplier Bill (Dr Accounts Payable / Cr Bank)');
    } else if (type === 'ASSET_PURCHASE') {
      if (!assetAcc) return;
      setDescription('Purchase of capital equipment / delivery van asset');
      setReference(`CAPEX-${Math.floor(1000 + Math.random() * 9000)}`);
      setLines([
        {
          id: 'row-preset-1',
          accountId: assetAcc.id,
          accountCode: assetAcc.code,
          accountName: assetAcc.name,
          debit: 450000,
          credit: 0,
          description: 'Capitalize office equipment / vehicle asset',
        },
        {
          id: 'row-preset-2',
          accountId: bankAcc.id,
          accountCode: bankAcc.code,
          accountName: bankAcc.name,
          debit: 0,
          credit: 450000,
          description: 'Bank transfer settlement for capital purchase',
        },
      ]);
      toast.info('Applied preset: Buy Company Asset (Dr Non-Current Asset / Cr Bank)');
    } else if (type === 'OFFICE_OVERHEAD') {
      if (!overheadAcc) return;
      setDescription('Monthly office lease, utilities, and general facility overhead');
      setReference(`EXP-RENT-${new Date().toISOString().slice(0, 7)}`);
      setLines([
        {
          id: 'row-preset-1',
          accountId: overheadAcc.id,
          accountCode: overheadAcc.code,
          accountName: overheadAcc.name,
          debit: 120000,
          credit: 0,
          description: 'Monthly office rent & utility expenses',
        },
        {
          id: 'row-preset-2',
          accountId: bankAcc.id,
          accountCode: bankAcc.code,
          accountName: bankAcc.name,
          debit: 0,
          credit: 120000,
          description: 'Bank transfer payment for facility overhead',
        },
      ]);
      toast.info('Applied preset: Record Office Overhead (Dr Operating Expense / Cr Bank)');
    }
  };

  // Submit Journal Entry
  const handlePostEntry = async () => {
    if (!isValid) {
      toast.error('Please ensure all lines have selected accounts and Debits equal Credits.');
      return;
    }
    if (!description.trim()) {
      toast.error('Voucher description is required.');
      return;
    }

    try {
      setIsPosting(true);
      await postJournalEntry({
        date,
        description: description.trim(),
        reference: reference.trim() || undefined,
        source: 'MANUAL',
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description.trim() || undefined,
        })),
      });

      handleResetForm();
    } catch {
      // Handled in hook
    } finally {
      setIsPosting(false);
    }
  };

  // Active Debit / Credit lines for live narrative
  const activeDebitLines = lines.filter((l) => l.accountId && l.debit > 0);
  const activeCreditLines = lines.filter((l) => l.accountId && l.credit > 0);
  const hasActiveEntries = activeDebitLines.length > 0 || activeCreditLines.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">The Finance Desk</h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Universal Debit / Credit Entry
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Universal double-entry journal voucher form for miscellaneous expenses, fixed asset acquisitions, and manual ledger adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAccountModalOpen(true)}
            className="gap-1.5 text-xs text-primary-text border-primary-border hover:bg-primary-light"
          >
            <Plus className="h-4 w-4" />
            <span>New GL Account</span>
          </Button>
        </div>
      </div>

      {/* Quick Journal Presets Bar */}
      <Card className="p-3 bg-gradient-to-r from-primary-light/60 via-white to-slate-50 border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-slate-800">Quick Journal Presets:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => applyPreset('SUPPLIER_PAYMENT')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:border-primary-border hover:bg-primary-light/60 hover:text-primary-text transition-colors"
              title="Dr Accounts Payable (2010) | Cr Bank Account (1010)"
            >
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span>Pay Supplier Bill</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('ASSET_PURCHASE')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-700 transition-colors"
              title="Dr Capital Asset (1510) | Cr Bank Account (1010)"
            >
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Buy Company Asset</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('OFFICE_OVERHEAD')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:border-amber-300 hover:bg-amber-50/60 hover:text-amber-700 transition-colors"
              title="Dr Operating Expense (6030) | Cr Bank Account (1010)"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Record Office Overhead</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Main Journal Voucher Form */}
      <Card className="p-5 sm:p-6 border-slate-200 shadow-xs space-y-6 bg-white">
        {/* Top Voucher Metadata Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Posting Date <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference / Source Doc #
            </label>
            <Input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. RCPT-4401 or CHQ-9921"
              className="h-9 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Journal Description & Memo <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly showroom utilities and diesel settlement..."
              className="h-9 text-xs"
              required
            />
          </div>
        </div>

        {/* Double-Entry Ledger Lines Table */}
        <div className="space-y-2">
          {/* Strictly Aligned Single-Row Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <div className="col-span-4 flex items-center gap-1.5">
              <span>Account Title & Code</span>
            </div>
            <div className="col-span-3">Line Memo / Description</div>
            <div className="col-span-2 text-right text-primary">Debit (Dr LKR)</div>
            <div className="col-span-2 text-right text-emerald-600">Credit (Cr LKR)</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* Dynamic Table Rows */}
          <div className="space-y-2">
            {lines.map((line, index) => (
              <DebitCreditRow
                key={line.id}
                index={index}
                line={line}
                accounts={accounts}
                onChange={handleLineChange}
                onRemove={handleRemoveLine}
                onAddNewAccount={() => setAccountModalOpen(true)}
                canRemove={lines.length > 2}
              />
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="gap-1.5 text-xs text-primary hover:bg-primary-light border-dashed border-primary-border"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Journal Line</span>
            </Button>

            {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
              <button
                type="button"
                onClick={handleAutoBalance}
                className="text-xs font-semibold text-primary hover:text-primary-text underline underline-offset-2 flex items-center gap-1"
              >
                <span>Auto-balance remaining {formatCurrency(difference)}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Transaction Narrative / Explanation Summary */}
        {hasActiveEntries && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Info className="h-3.5 w-3.5 text-primary" />
              <span>Live Ledger Impact Preview:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[11px]">
              <div>
                <span className="font-semibold text-primary-text">Debiting (Dr):</span>
                {activeDebitLines.length === 0 ? (
                  <span className="text-slate-400 italic ml-1">None entered</span>
                ) : (
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                    {activeDebitLines.map((l) => (
                      <li key={l.id}>
                        <span className="font-mono font-bold text-slate-800">{l.accountCode}</span> ({l.accountName}):{' '}
                        <span className="font-bold text-primary-text">{formatCurrency(l.debit)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <span className="font-semibold text-emerald-700">Crediting (Cr):</span>
                {activeCreditLines.length === 0 ? (
                  <span className="text-slate-400 italic ml-1">None entered</span>
                ) : (
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                    {activeCreditLines.map((l) => (
                      <li key={l.id}>
                        <span className="font-mono font-bold text-slate-800">{l.accountCode}</span> ({l.accountName}):{' '}
                        <span className="font-bold text-emerald-700">{formatCurrency(l.credit)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Balancing Status & Posting Actions */}
        <BalancingBar
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          isSubmitting={isPosting}
          onPost={handlePostEntry}
          onReset={handleResetForm}
          onAutoBalance={!isBalanced && (totalDebit > 0 || totalCredit > 0) ? handleAutoBalance : undefined}
        />
      </Card>

      {/* Recent Posted General Journal Vouchers Audit Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-bold text-slate-900">Recent Posted Journal Vouchers</h2>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description & Reference</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Lines Summary</th>
                  <th className="px-4 py-3 text-right">Debit Total</th>
                  <th className="px-4 py-3 text-right">Credit Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {journals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      No journals posted yet.
                    </td>
                  </tr>
                ) : (
                  journals.slice(0, 8).map((je) => (
                    <tr key={je.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-primary">
                        <a
                          href={`/finance/journal/new?id=${je.id}`}
                          className="hover:underline flex items-center gap-1"
                          title="View Audit-Locked Voucher"
                        >
                          <Lock className="h-3 w-3 text-slate-400" />
                          <span>{je.entryNumber}</span>
                        </a>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(je.date)}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{je.description}</div>
                        {je.reference && (
                          <div className="font-mono text-[11px] text-slate-400">Ref: {je.reference}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 border-slate-200">
                          {je.source}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 space-y-0.5">
                        {je.lines.map((l) => (
                          <div key={l.id} className="text-[11px] text-slate-600">
                            <span className="font-mono text-primary">{l.accountCode}</span>: {l.accountName}{' '}
                            {l.debit > 0 ? `(Dr ${formatCurrency(l.debit)})` : `(Cr ${formatCurrency(l.credit)})`}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(je.totalDebit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(je.totalCredit)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {je.status === 'VOIDED' ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Voided
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            <span>Posted</span>
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/finance/journal/new?id=${je.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inline Account Creation Modal */}
      <AccountModal
        open={accountModalOpen}
        onOpenChange={setAccountModalOpen}
        onCreate={createAccount}
        existingAccounts={accounts}
      />
    </div>
  );
}
