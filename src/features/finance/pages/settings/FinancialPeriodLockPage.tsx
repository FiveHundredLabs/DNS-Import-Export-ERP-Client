import { useState, useEffect } from 'react';
import { periodLockService } from '../../services/periodLockService';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { formatDate } from '../../../../utils/formatters';
import {
  Lock,
  Unlock,
  ShieldAlert,
  Calendar,
  Save,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export function FinancialPeriodLockPage() {
  const [enabled, setEnabled] = useState<boolean>(() => periodLockService.getConfig().enabled);
  const [lockDate, setLockDate] = useState<string>(
    () => periodLockService.getConfig().lockDate || '2026-10-31'
  );
  const [testDate, setTestDate] = useState<string>('2026-10-15');
  const [testResult, setTestResult] = useState<{ allowed: boolean; message: string } | null>(null);

  useEffect(() => {
    const cfg = periodLockService.getConfig();
    setEnabled(cfg.enabled);
    if (cfg.lockDate) setLockDate(cfg.lockDate);
  }, []);

  const handleSave = () => {
    periodLockService.setConfig(enabled, enabled ? lockDate : null);
    toast.success(
      enabled
        ? `Financial period lock activated up to ${formatDate(lockDate)}. Transactions on or before this date are strictly prohibited.`
        : 'Financial period lock disabled. All dates permitted.'
    );
  };

  const handleRunSimulation = () => {
    try {
      periodLockService.assertNotLocked(testDate);
      setTestResult({
        allowed: true,
        message: `Transaction date (${formatDate(testDate)}) is within an open financial period. Posting is allowed.`,
      });
    } catch (err: unknown) {
      setTestResult({
        allowed: false,
        message: err instanceof Error ? err.message : 'Transaction date is in a closed financial period.',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
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
            Enforce audit boundary protection by locking books as of a specified cut-off date to prevent retrospective modifications.
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
                  ? `Active: No transactions permitted on or prior to ${formatDate(lockDate)}`
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

        {/* Lock Date Picker Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lock Date <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              value={lockDate}
              onChange={(e) => setLockDate(e.target.value)}
              disabled={!enabled}
              className="h-9 text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Any attempt to post, edit, or void a voucher with date &le; {lockDate} will raise a system error.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-1 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              Statutory Period Close Policy
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Once an accounting period is locked following external audit verification or VAT submission, journal entries, supplier invoices, and bank adjustments within that period become strictly immutable.
            </p>
          </div>
        </div>
      </Card>

      {/* Hard Error Verification & Simulation Box */}
      <Card className="p-6 border-slate-200 shadow-xs bg-white space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Audit Policy Simulation Tester</span>
        </div>
        <p className="text-xs text-slate-500">
          Simulate a transaction posting date against the current period lock configuration to verify hard error enforcement.
        </p>

        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="h-9 text-xs w-48"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunSimulation}
            className="text-xs text-slate-700 font-medium"
          >
            Verify Date Policy
          </Button>
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
    </div>
  );
}
