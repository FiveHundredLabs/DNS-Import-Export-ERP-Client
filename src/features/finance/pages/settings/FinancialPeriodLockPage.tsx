import { useState, useEffect, useMemo } from 'react';
import { periodLockService } from '../../services/periodLockService';
import { yearEndCloseService, YearEndClosePreview } from '../../services/yearEndCloseService';
import { Button } from '../../../../components/ui/button';
import { ConfirmButton } from '../../../../components/ui/confirm-button';
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
  ShieldCheck,
  Ban,
  Clock,
  History,
  Check,
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

  // Financial Year Lock state
  const [fyLockEnabled, setFyLockEnabled] = useState<boolean>(
    () => !!periodLockService.getConfig().financialYearLockEnabled
  );
  const [fyLockDate, setFyLockDate] = useState<string>(
    () => periodLockService.getConfig().financialYearLockDate || '2025-12-31'
  );
  const [lockedYears, setLockedYears] = useState<number[]>(
    () => periodLockService.getConfig().lockedFiscalYears || [2024]
  );

  // Monthly Period Quick Selector Helper state
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const cur = new Date();
    return cur.getMonth() + 1; // 1-12
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return new Date().getFullYear();
  });

  // Simulation state
  const [testDate, setTestDate] = useState<string>('2026-10-20');
  const [testRole, setTestRole] = useState<'CLERK' | 'FINANCE_MANAGER'>('CLERK');
  const [testAction, setTestAction] = useState<'POST' | 'EDIT_VOID'>('EDIT_VOID');
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
    setFyLockEnabled(!!cfg.financialYearLockEnabled);
    if (cfg.financialYearLockDate) setFyLockDate(cfg.financialYearLockDate);
    if (cfg.lockedFiscalYears) setLockedYears(cfg.lockedFiscalYears);
  }, []);

  // Quick Monthly Cut-off helpers
  const handleSetEndOfLastMonth = () => {
    const now = new Date();
    // First day of current month minus 1 day = last day of previous month
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const dateStr = lastDayPrevMonth.toISOString().slice(0, 10);
    setStandardLockDate(dateStr);
    // Set admin lock date to 15 days prior or same
    const adminDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    setAdminLockDate(adminDate.toISOString().slice(0, 10));
    toast.info(`Set monthly closing cut-off to ${formatDate(dateStr)}`);
  };

  const handleApplySelectedMonthEnd = () => {
    // Last day of selectedMonth in selectedYear
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    const dateStr = lastDay.toISOString().slice(0, 10);
    setStandardLockDate(dateStr);
    const midMonth = new Date(selectedYear, selectedMonth - 1, 15);
    setAdminLockDate(midMonth.toISOString().slice(0, 10));
    toast.info(`Configured period closing for ${selectedYear}-${String(selectedMonth).padStart(2, '0')}: Cut-off is ${dateStr}`);
  };

  const handleSave = () => {
    periodLockService.setConfig(
      enabled,
      enabled ? standardLockDate : null,
      enabled ? adminLockDate : null,
      fyLockEnabled ? fyLockDate : null,
      lockedYears
    );
    periodLockService.setFinancialYearLock(
      fyLockEnabled,
      fyLockEnabled ? fyLockDate : null,
      lockedYears
    );

    toast.success(
      enabled
        ? `Dual period locks activated. Standard cut-off: ${formatDate(standardLockDate)} | Admin cut-off: ${formatDate(adminLockDate)}.`
        : 'Financial period locks disabled. All dates permitted.'
    );
  };

  const handleToggleLockFiscalYear = (year: number) => {
    if (lockedYears.includes(year)) {
      periodLockService.unlockFiscalYear(year);
      setLockedYears((prev) => prev.filter((y) => y !== year));
      toast.success(`Fiscal Year ${year} has been unlocked for authorized adjustments.`);
    } else {
      periodLockService.lockFiscalYear(year, `${year}-12-31`);
      setLockedYears((prev) => [...prev, year].sort());
      setFyLockEnabled(true);
      toast.success(`Fiscal Year ${year} has been permanently locked against edits, voids, and backdated postings.`);
    }
  };

  const handleRunSimulation = () => {
    try {
      if (testAction === 'EDIT_VOID') {
        periodLockService.assertCanEditOrVoid(testDate, testRole === 'FINANCE_MANAGER' ? 'FINANCE_MANAGER' : undefined);
        setTestResult({
          allowed: true,
          message: `Transaction date (${formatDate(testDate)}) is within an open financial period for role [${testRole}]. Editing and voiding are allowed.`,
        });
      } else {
        periodLockService.assertNotLocked(testDate, testRole === 'FINANCE_MANAGER' ? 'FINANCE_MANAGER' : undefined);
        setTestResult({
          allowed: true,
          message: `Transaction date (${formatDate(testDate)}) is within an open financial period for role [${testRole}]. Posting is allowed.`,
        });
      }
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

      // Update locked fiscal years state
      const closedYear = result.preview.fiscalYear;
      setLockedYears((prev) => Array.from(new Set([...prev, closedYear])).sort());
      setFyLockEnabled(true);

      setCloseSuccessMessage(
        `Year-End Close executed successfully! Voucher ${result.journalEntry.entryNumber} created with ${result.journalEntry.lines.length} lines. Net profit/loss swept into 3010 Retained Earnings and FY ${closedYear} locked.`
      );
      toast.success(`Fiscal year ${result.preview.fiscalYear} successfully closed and locked!`);
      // Refresh preview to show updated zeroed balances
      const updatedPreview = await yearEndCloseService.previewClose(fiscalYearEnd);
      setClosingPreview(updatedPreview);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to execute Year-End Close');
    } finally {
      setExecutingClose(false);
    }
  };

  const fiscalYearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
    return years.map((y) => {
      const isLocked = lockedYears.includes(y);
      const isCurrent = y === currentYear;
      return {
        year: y,
        range: `01 Jan ${y} — 31 Dec ${y}`,
        isLocked,
        isCurrent,
      };
    });
  }, [lockedYears]);

  return (
    <div className="space-y-6 w-full">
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
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure monthly financial period closing dates, audit-lock past transactions against edits and voids, and manage financial year locks.
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

      {/* Main Lock Settings Card: Monthly Period Closing */}
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
                  ? `Active: Standard ops locked \u2264 ${formatDate(standardLockDate)} | Finance Managers locked \u2264 ${formatDate(adminLockDate)}`
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

        {/* Quick Month-End Cut-off Helper Toolbar */}
        <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Clock className="h-4 w-4 text-primary" />
            <span>Monthly Period Closing Quick Presets:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSetEndOfLastMonth}
              disabled={!enabled}
              className="h-8 text-xs bg-white text-slate-700 hover:bg-slate-100"
            >
              End of Last Month
            </Button>

            <div className="flex items-center gap-1.5 border-l border-slate-300 pl-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                disabled={!enabled}
                className="h-8 text-xs rounded border border-slate-300 bg-white px-2 text-slate-700"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                disabled={!enabled}
                className="h-8 text-xs rounded border border-slate-300 bg-white px-2 text-slate-700"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplySelectedMonthEnd}
                disabled={!enabled}
                className="h-8 text-xs bg-primary/10 text-primary hover:bg-primary/20 border-primary/30 font-medium"
              >
                Set Month Cut-Off
              </Button>
            </div>
          </div>
        </div>

        {/* Dual Lock Date Picker Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. standardLockDate */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                Standard Lock Date (Operational Cut-Off / Monthly Closing Date) <span className="text-rose-500">*</span>
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
              Blocks operational clerks (Sales Reps, POS Cashiers, Storekeepers, and AP clerks) from posting invoices, GRNs, or voiding past entries on or prior to {standardLockDate}.
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
              Allows Finance Managers extra days after month-end to finalize accruals and audit journals. Any attempt by anyone to post, edit, or void on or before {adminLockDate} is rejected.
            </p>
          </div>
        </div>

        {/* Edit & Void Prohibited Notice */}
        <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-950 flex items-start gap-3">
          <Ban className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-rose-900">Past Transactions Editing & Voiding Restrictions</p>
            <p className="text-rose-800 text-[11px] leading-relaxed">
              Transactions dated on or prior to the closing date are <strong>strictly locked</strong>: users cannot edit line items, modify pricing, alter quantities, or void posted journal entries, vendor bills, receipts, or customer credit notes. All retrospective modifications must be recorded as adjusting counter-entries in the current open financial period.
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

      {/* FINANCIAL YEAR LOCKING CARD */}
      <Card className="p-6 border-slate-200 shadow-xs bg-white space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg text-white ${fyLockEnabled ? 'bg-indigo-600' : 'bg-slate-400'}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Financial Year Locking & Audit Sealing
                </h2>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                  Annual Governance
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Lock entire fiscal years to prevent all transactions, retrospective edits, adjustments, and voids across closed accounting years.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 cursor-pointer">
              Enable Financial Year Locking
            </label>
            <input
              type="checkbox"
              checked={fyLockEnabled}
              onChange={(e) => setFyLockEnabled(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Fiscal Year Hard Cut-off Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-2">
            <label className="block text-xs font-bold text-slate-900">
              Fiscal Year Lock Cut-Off Date
            </label>
            <Input
              type="date"
              value={fyLockDate}
              onChange={(e) => setFyLockDate(e.target.value)}
              disabled={!fyLockEnabled}
              className="h-9 text-xs bg-white"
            />
            <p className="text-[11px] text-slate-500">
              Transactions on or before this annual date are frozen permanently for audit review.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900">Currently Locked Fiscal Years</span>
              <p className="text-[11px] text-slate-500 mt-1">
                {lockedYears.length > 0
                  ? `FY ${lockedYears.join(', FY ')} are completely sealed.`
                  : 'No individual fiscal years explicitly sealed.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {lockedYears.map((yr) => (
                <Badge key={yr} variant="outline" className="bg-white text-indigo-700 border-indigo-300 text-xs gap-1">
                  <Lock className="h-3 w-3" /> FY {yr}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Fiscal Year Register Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-100/80 px-4 py-2.5 flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Fiscal Year Lock Register</span>
            <span className="text-[11px] text-slate-500 font-normal">Audit-grade annual protection</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Fiscal Year</th>
                  <th className="px-4 py-2.5">Accounting Period</th>
                  <th className="px-4 py-2.5">Lock Status</th>
                  <th className="px-4 py-2.5">Audit Protection</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {fiscalYearsList.map((row) => (
                  <tr key={row.year} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold font-mono text-slate-900">FY {row.year}</td>
                    <td className="px-4 py-3 text-slate-600">{row.range}</td>
                    <td className="px-4 py-3">
                      {row.isLocked ? (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 gap-1 text-[11px]">
                          <Lock className="h-3 w-3" /> Locked & Sealed
                        </Badge>
                      ) : row.isCurrent ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px]">
                          <Check className="h-3 w-3" /> Current Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 text-[11px]">
                          Open
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {row.isLocked
                        ? 'Edits, voids, and backdating blocked'
                        : 'Transactions and journals permitted'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.isLocked ? (
                        <ConfirmButton
                          variant="outline"
                          size="sm"
                          confirmTitle={`Unlock Fiscal Year ${row.year}?`}
                          confirmMessage={`Unlocking FY ${row.year} will allow authorized adjustments to be made to sealed accounts. Ensure all changes are properly audited.`}
                          confirmText="Confirm Unlock"
                          onConfirm={() => handleToggleLockFiscalYear(row.year)}
                          className="h-7 text-[11px] text-amber-700 border-amber-300 hover:bg-amber-50"
                        >
                          <Unlock className="h-3 w-3 mr-1" /> Unlock FY
                        </ConfirmButton>
                      ) : (
                        <ConfirmButton
                          variant="outline"
                          size="sm"
                          confirmTitle={`Lock Fiscal Year ${row.year}?`}
                          confirmMessage={`Locking FY ${row.year} will permanently block all creation, editing, and voiding of transactions dated in ${row.year}. Proceed?`}
                          confirmText="Lock Financial Year"
                          onConfirm={() => handleToggleLockFiscalYear(row.year)}
                          className="h-7 text-[11px] text-rose-700 border-rose-300 hover:bg-rose-50 font-medium"
                        >
                          <Lock className="h-3 w-3 mr-1" /> Lock FY
                        </ConfirmButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          Simulate a transaction date against the current monthly period closing and financial year lock configuration to verify role-based enforcement for posting, editing, and voiding.
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
              Action to Verify:
            </label>
            <select
              value={testAction}
              onChange={(e) => setTestAction(e.target.value as 'POST' | 'EDIT_VOID')}
              className="h-9 text-xs rounded-md border border-slate-300 bg-white px-3 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="EDIT_VOID">Edit or Void Past Transaction</option>
              <option value="POST">Post New Transaction</option>
            </select>
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
                Automated statutory routine executed on the final day of the fiscal year. Zeroes out all 4000 Revenue and 5000/6000 Expense accounts, sweeping net profit/loss into 3010 Retained Earnings and locking the fiscal year.
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

              <div className="max-h-60 overflow-auto w-full">
                <table className="w-full min-w-[600px] text-left text-xs">
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
              <ConfirmButton
                type="button"
                confirmTitle={`Execute Year-End Close (${fiscalYearEnd})?`}
                confirmMessage="This will balance all temporary revenue and expense accounts to Retained Earnings, record closing journal entries, and lock the closed fiscal year. This action cannot be undone."
                confirmLabel="Confirm & Execute Close"
                variant="destructive"
                onConfirm={handleExecuteYearEndClose}
                disabled={!closingPreview.canExecute || executingClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 px-6"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {executingClose
                    ? 'Executing Closing Routine...'
                    : `Execute & Commit Year-End Close (${fiscalYearEnd})`}
                </span>
              </ConfirmButton>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
