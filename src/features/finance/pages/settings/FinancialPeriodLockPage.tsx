import { useState, useEffect } from 'react';
import { periodLockService } from '../../services/periodLockService';
import { yearEndCloseService, YearEndClosePreview } from '../../services/yearEndCloseService';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { formatDate, formatCurrency } from '../../../../utils/formatters';
import {
  Lock,
  Unlock,
  ShieldAlert,
  Calendar,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export function FinancialPeriodLockPage() {
  const [enabled, setEnabled] = useState<boolean>(() => periodLockService.getConfig().enabled);
  const [standardLockDate, setStandardLockDate] = useState<string>(
    () => periodLockService.getConfig().standardLockDate || periodLockService.getConfig().lockDate || '2026-10-31'
  );
  const [adminLockDate, setAdminLockDate] = useState<string>(
    () => periodLockService.getConfig().adminLockDate || periodLockService.getConfig().lockDate || '2026-10-15'
  );

  // Simulation state
  const [testDate, setTestDate] = useState<string>('2026-10-20');
  const [testRole, setTestRole] = useState<'CLERK' | 'FINANCE_MANAGER'>('CLERK');
  const [testResult, setTestResult] = useState<{ allowed: boolean; message: string } | null>(null);

  // Year-End Close Wizard state
  const [fiscalYearEnd, setFiscalYearEnd] = useState<string>('2026-12-31');
  const [closingPreview, setClosingPreview] = useState<YearEndClosePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [executingClose, setExecutingClose] = useState<boolean>(false);
  const [closeSuccessMessage, setCloseSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const cfg = periodLockService.getConfig();
    setEnabled(cfg.enabled);
    if (cfg.standardLockDate) setStandardLockDate(cfg.standardLockDate);
    if (cfg.adminLockDate) setAdminLockDate(cfg.adminLockDate);
  }, []);

  const handleSave = () => {
    periodLockService.setConfig(
      enabled,
      enabled ? standardLockDate : null,
      enabled ? adminLockDate : null
    );
    toast.success(
      enabled
        ? `Dual period locks activated. Standard cut-off: ${formatDate(standardLockDate)} | Admin cut-off: ${formatDate(adminLockDate)}.`
        : 'Financial period locks disabled. All dates permitted.'
    );
  };

  const handleRunSimulation = () => {
    try {
      periodLockService.assertNotLocked(testDate, testRole === 'FINANCE_MANAGER' ? 'FINANCE_MANAGER' : undefined);
      setTestResult({
        allowed: true,
        message: `Transaction date (${formatDate(testDate)}) is within an open financial period for role [${testRole}]. Posting is allowed.`,
      });
    } catch (err: unknown) {
      setTestResult({
        allowed: false,
        message: err instanceof Error ? err.message : 'Transaction date is in a closed financial period.',
      });
    }
  };

  const handlePreviewYearEndClose = async () => {
    setLoadingPreview(true);
    setCloseSuccessMessage(null);
    try {
      const preview = await yearEndCloseService.previewClose(fiscalYearEnd);
      setClosingPreview(preview);
      if (!preview.canExecute) {
        toast.info(preview.reason || 'No nominal accounts require closing for this date.');
      } else {
        toast.success(`Calculated Year-End Close preview for FY ${preview.fiscalYear}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate closing preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecuteYearEndClose = async () => {
    setExecutingClose(true);
    try {
      const result = await yearEndCloseService.executeClose({
        fiscalYearEndDate: fiscalYearEnd,
        executedBy: 'Finance Director (System Close)',
        lockPeriodAfterClose: true,
      });

      setCloseSuccessMessage(
        `Year-End Close executed successfully! Voucher ${result.journalEntry.entryNumber} created with ${result.journalEntry.lines.length} lines. Net profit/loss swept into 3010 Retained Earnings.`
      );
      toast.success(`Fiscal year ${result.preview.fiscalYear} successfully closed!`);
      // Refresh preview to show updated zeroed balances
      const updatedPreview = await yearEndCloseService.previewClose(fiscalYearEnd);
      setClosingPreview(updatedPreview);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to execute Year-End Close');
    } finally {
      setExecutingClose(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Financial Lock Date Dashboard
            </h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Period Closing Controls
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Enforce audit boundary protection by locking books as of specified cut-off dates to prevent retrospective modifications.
          </p>
        </div>

        <Button
          onClick={handleSave}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs gap-1.5"
        >
          <Save className="h-4 w-4" />
          <span>Save Lock Settings</span>
        </Button>
      </div>

      {/* Main Lock Settings Card */}
      <Card className="p-6 border-slate-200 shadow-xs bg-white space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg text-white ${
                enabled ? 'bg-amber-600' : 'bg-slate-400'
              }`}
            >
              {enabled ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Period Lock Enforcement Status
              </h2>
              <p className="text-xs text-slate-500">
                {enabled
                  ? `Active: Standard ops locked &le; ${formatDate(standardLockDate)} | Finance Managers locked &le; ${formatDate(adminLockDate)}`
                  : 'Inactive: All past dates remain open for adjustments'}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 cursor-pointer">
              Enable Period Lock
            </label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Dual Lock Date Picker Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. standardLockDate */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                Standard Lock Date (Operational Cut-Off) <span className="text-rose-500">*</span>
              </label>
              <Badge variant="outline" className="text-[10px] bg-white">
                Sales / Warehouse / AP Clerks
              </Badge>
            </div>
            <Input
              type="date"
              value={standardLockDate}
              onChange={(e) => setStandardLockDate(e.target.value)}
              disabled={!enabled}
              className="h-9 text-xs bg-white"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Blocks operational clerks (Sales Reps, POS Cashiers, Storekeepers, and AP clerks) from posting invoices or GRNs on or prior to {standardLockDate}.
            </p>
          </div>

          {/* 2. adminLockDate */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                Admin Lock Date (Hard Financial Cut-Off) <span className="text-rose-500">*</span>
              </label>
              <Badge variant="outline" className="text-[10px] bg-white text-indigo-700 border-indigo-200">
                Finance Managers Grace Window
              </Badge>
            </div>
            <Input
              type="date"
              value={adminLockDate}
              onChange={(e) => setAdminLockDate(e.target.value)}
              disabled={!enabled}
              className="h-9 text-xs bg-white"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Allows Finance Managers extra days after month-end to post adjusting entries. Any attempt by anyone to post on or before {adminLockDate} is rejected.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Dual-Tier Period Lock Architecture</p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Between the Admin Lock Date ({adminLockDate}) and Standard Lock Date ({standardLockDate}), standard operations are prohibited while Finance Managers have authorized access to finalize accruals, landed cost settlements, and audit adjustments.
            </p>
          </div>
        </div>
      </Card>

      {/* Dual Lock Simulation Tester */}
      <Card className="p-6 border-slate-200 shadow-xs bg-white space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Audit Policy Simulation Tester</span>
        </div>
        <p className="text-xs text-slate-500">
          Simulate a transaction posting date against the current dual period lock configuration to verify role-based enforcement.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Transaction Date:
            </label>
            <Input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="h-9 text-xs w-44"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Simulated User Role:
            </label>
            <select
              value={testRole}
              onChange={(e) => setTestRole(e.target.value as 'CLERK' | 'FINANCE_MANAGER')}
              className="h-9 text-xs rounded-md border border-slate-300 bg-white px-3 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="CLERK">Standard Clerk (Sales/AP/Warehouse)</option>
              <option value="FINANCE_MANAGER">Finance Manager / Director</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRunSimulation}
              className="h-9 text-xs text-slate-700 font-medium mt-5"
            >
              Verify Date Policy
            </Button>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 animate-in fade-in-50 ${
              testResult.allowed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'
            }`}
          >
            {testResult.allowed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </Card>

      {/* YEAR-END CLOSE WIZARD CARD */}
      <Card className="p-6 border-slate-200 shadow-xs bg-white space-y-6">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Fiscal Year-End Close Wizard
              </h2>
              <p className="text-xs text-slate-500">
                Automated statutory routine executed on the final day of the fiscal year. Zeroes out all 4000 Revenue and 5000/6000 Expense accounts, sweeping net profit/loss into 3010 Retained Earnings.
              </p>
            </div>
          </div>

          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-xs font-semibold">
            Annual Statutory Close
          </Badge>
        </div>

        {/* Fiscal Date Picker & Preview Action */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50/70 p-4 rounded-lg border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Fiscal Year-End Closing Date:
            </label>
            <Input
              type="date"
              value={fiscalYearEnd}
              onChange={(e) => setFiscalYearEnd(e.target.value)}
              className="h-9 text-xs w-48 bg-white"
            />
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              onClick={handlePreviewYearEndClose}
              disabled={loadingPreview}
              className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
              <span>{loadingPreview ? 'Analyzing Nominal Ledgers...' : 'Preview Year-End Close'}</span>
            </Button>
          </div>
        </div>

        {closeSuccessMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{closeSuccessMessage}</span>
          </div>
        )}

        {/* Preview Details Display */}
        {closingPreview && (
          <div className="space-y-4 animate-in fade-in-50">
            {/* KPI summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Total Revenue (4000)</span>
                <p className="text-lg font-bold font-mono text-indigo-700 mt-1">
                  {formatCurrency(closingPreview.totalRevenue)}
                </p>
                <span className="text-[10px] text-slate-400">To be debited to 0.00</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Total Expenses (5000/6000)</span>
                <p className="text-lg font-bold font-mono text-rose-700 mt-1">
                  {formatCurrency(closingPreview.totalExpenses)}
                </p>
                <span className="text-[10px] text-slate-400">To be credited to 0.00</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Net Fiscal Income</span>
                <p className="text-lg font-bold font-mono text-emerald-700 mt-1">
                  {formatCurrency(closingPreview.netIncome)}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {closingPreview.isProfitable ? 'Net Operating Profit' : 'Net Operating Loss'}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Target Sweep Account</span>
                <p className="text-base font-bold text-slate-900 mt-1">
                  {closingPreview.retainedEarningsAccount.code}
                </p>
                <span className="text-[10px] text-slate-500">
                  {closingPreview.retainedEarningsAccount.name}
                </span>
              </div>
            </div>

            {/* Proposed Balanced Journal Lines Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100/80 px-4 py-2.5 flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Proposed Closing Journal Entry (Double-Entry Invariant: Balanced)</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                  Balanced: {formatCurrency(closingPreview.totalDebit)}
                </Badge>
              </div>

              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2">Action / Description</th>
                      <th className="px-3 py-2 text-right">Debit (LKR)</th>
                      <th className="px-3 py-2 text-right">Credit (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {closingPreview.journalLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-mono font-medium">{line.accountId}</td>
                        <td className="px-3 py-2">{line.description}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-300 bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 uppercase">Total Balanced Closing Entry</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(closingPreview.totalDebit)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(closingPreview.totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Execute Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleExecuteYearEndClose}
                disabled={!closingPreview.canExecute || executingClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 px-6"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {executingClose
                    ? 'Executing Closing Routine...'
                    : `Execute & Commit Year-End Close (${fiscalYearEnd})`}
                </span>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
