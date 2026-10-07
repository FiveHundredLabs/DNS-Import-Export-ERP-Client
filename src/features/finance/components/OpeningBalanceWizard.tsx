import { useState, useMemo } from 'react';
import Decimal from 'decimal.js';
import { Account } from '../api/types';
import { CurrencyInput } from './CurrencyInput';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { formatCurrency } from '../../../utils/formatters';
import {
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Save,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

export interface OpeningBalanceRow {
  accountId: string;
  code: string;
  name: string;
  accountClass: string;
  debit: number;
  credit: number;
}

interface OpeningBalanceWizardProps {
  accounts: Account[];
  onSave: (lines: { accountId: string; debit: number; credit: number; description?: string }[]) => Promise<void>;
  onClose: () => void;
}

export function OpeningBalanceWizard({ accounts, onSave, onClose }: OpeningBalanceWizardProps) {
  // Only Asset, Liability, and Equity accounts are eligible for opening balance setup
  const eligibleAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.isActive &&
        (a.accountClass === 'ASSET' ||
          a.accountClass === 'LIABILITY' ||
          a.accountClass === 'EQUITY')
    );
  }, [accounts]);

  const [rowValues, setRowValues] = useState<Record<string, { debit: number; credit: number }>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleDebitChange = (accountId: string, val: number) => {
    setRowValues((prev) => ({
      ...prev,
      [accountId]: {
        debit: val,
        credit: val > 0 ? 0 : prev[accountId]?.credit || 0,
      },
    }));
  };

  const handleCreditChange = (accountId: string, val: number) => {
    setRowValues((prev) => ({
      ...prev,
      [accountId]: {
        debit: val > 0 ? 0 : prev[accountId]?.debit || 0,
        credit: val,
      },
    }));
  };

  // Compute totals using decimal.js for guaranteed precision
  const { totalDebit, totalCredit, difference, differenceAbs } = useMemo(() => {
    let deb = new Decimal(0);
    let cred = new Decimal(0);

    for (const acc of eligibleAccounts) {
      const row = rowValues[acc.id];
      if (row?.debit) deb = deb.plus(new Decimal(row.debit));
      if (row?.credit) cred = cred.plus(new Decimal(row.credit));
    }

    const diff = deb.minus(cred);
    return {
      totalDebit: deb.toNumber(),
      totalCredit: cred.toNumber(),
      difference: diff.toNumber(),
      differenceAbs: diff.abs().toNumber(),
    };
  }, [eligibleAccounts, rowValues]);

  const hasAnyValues = totalDebit > 0 || totalCredit > 0;

  const handleSave = async () => {
    if (!hasAnyValues) {
      toast.error('Please enter at least one opening balance value.');
      return;
    }

    try {
      setSubmitting(true);
      const lines: { accountId: string; debit: number; credit: number; description?: string }[] = [];

      // Collect entered rows
      for (const acc of eligibleAccounts) {
        const row = rowValues[acc.id];
        if (row && (row.debit > 0 || row.credit > 0)) {
          lines.push({
            accountId: acc.id,
            debit: row.debit > 0 ? row.debit : 0,
            credit: row.credit > 0 ? row.credit : 0,
            description: `Opening balance for ${acc.code} - ${acc.name}`,
          });
        }
      }

      // Check if there is an unbalancing difference
      // System automatically allocates balancing amount to 3020 Opening Balance Equity / Retained Earnings
      if (Math.abs(difference) > 0.001) {
        const equityAccount =
          accounts.find((a) => a.code === '3020') ||
          accounts.find((a) => a.code === '3010') ||
          eligibleAccounts.find((a) => a.accountClass === 'EQUITY');

        if (!equityAccount) {
          toast.error('Could not locate 3020 Opening Balance Equity account to balance ledger.');
          return;
        }

        if (difference > 0) {
          // Debits > Credits -> Credit 3020 by difference
          lines.push({
            accountId: equityAccount.id,
            debit: 0,
            credit: Number(new Decimal(differenceAbs).toFixed(2)),
            description: 'Automatic Balancing Allocation to Opening Balance Equity',
          });
        } else {
          // Credits > Debits -> Debit 3020 by difference
          lines.push({
            accountId: equityAccount.id,
            debit: Number(new Decimal(differenceAbs).toFixed(2)),
            credit: 0,
            description: 'Automatic Balancing Allocation to Opening Balance Equity',
          });
        }
      }

      await onSave(lines);
      toast.success('Opening balances saved and balanced successfully!');
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save opening balances');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Opening Balance Setup Wizard
            </h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Initial Ledger Setup
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1 ml-10">
            Enter starting balance figures for balance sheet accounts. Any discrepancy will be automatically balanced against <span className="font-semibold text-slate-700">3020 Opening Balance Equity</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasAnyValues || submitting}
            className="gap-1.5 bg-primary hover:bg-primary-hover text-white"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Posting...' : 'Save Opening Balances'}</span>
          </Button>
        </div>
      </div>

      {/* Info Notice */}
      <Card className="p-3.5 bg-sky-50/70 border-sky-200 text-xs text-sky-900 flex items-start gap-3">
        <Info className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold">Double-Entry Assurance:</span> Asset accounts normally carry Debit opening balances, whereas Liability and Equity accounts normally carry Credit opening balances. The system will ensure Σ Debits = Σ Credits upon saving.
        </div>
      </Card>

      {/* Grid of Eligible Accounts */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Account Code</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3 text-right">Debit (Dr LKR)</th>
                <th className="px-4 py-3 text-right">Credit (Cr LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eligibleAccounts.map((account) => {
                const current = rowValues[account.id] || { debit: 0, credit: 0 };
                return (
                  <tr key={account.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                      {account.code}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900">{account.name}</div>
                      {account.description && (
                        <div className="text-[11px] text-slate-400">{account.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-[10px] font-medium uppercase">
                        {account.accountClass}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right w-44">
                      <CurrencyInput
                        value={current.debit || ''}
                        onChange={(val) => handleDebitChange(account.id, val)}
                        disabled={submitting}
                        placeholder="0.00"
                        className="text-right"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right w-44">
                      <CurrencyInput
                        value={current.credit || ''}
                        onChange={(val) => handleCreditChange(account.id, val)}
                        disabled={submitting}
                        placeholder="0.00"
                        className="text-right"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Calculation Footer */}
      <div className="sticky bottom-4 z-20 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold uppercase">Total Debits</span>
              <span className="text-base font-bold font-mono text-primary tabular-nums">
                {formatCurrency(totalDebit)}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold uppercase">Total Credits</span>
              <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                {formatCurrency(totalCredit)}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold uppercase">Ledger Difference</span>
              <div className="flex items-center gap-1.5">
                {Math.abs(difference) <= 0.001 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle className="h-4 w-4" /> Balanced (0.00)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-bold tabular-nums font-mono">
                    <AlertTriangle className="h-4 w-4" /> Difference: {formatCurrency(differenceAbs)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {Math.abs(difference) > 0.001 && hasAnyValues && (
              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                Auto-allocating {formatCurrency(differenceAbs)} to 3020 Opening Balance Equity
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasAnyValues || submitting}
              className="bg-primary hover:bg-primary-hover text-white shadow-xs font-semibold gap-1.5"
            >
              <Save className="h-4 w-4" />
              <span>Save Opening Balances</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
