import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { creditTermsConfigService } from '../../services/CreditTermsConfigService';
import { CustomerCreditTermsConfig } from '../../types/creditTerms';
import { determineCustomerApprovalRoute } from '../../rules/approvalRules';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'sonner';
import {
  CreditCard,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Building2,
  Users2,
  ArrowRight,
  FileCheck2,
  Sparkles,
  Percent,
} from 'lucide-react';

const CREDIT_DAYS_PRESETS = [
  { label: '7 Days (Weekly)', value: 7 },
  { label: '14 Days (Fortnightly)', value: 14 },
  { label: '30 Days (Standard Month)', value: 30 },
  { label: '45 Days (Extended)', value: 45 },
  { label: '60 Days (2 Months)', value: 60 },
  { label: '90 Days (Quarterly)', value: 90 },
];

const CREDIT_LIMIT_PRESETS = [
  { label: 'LKR 250,000', value: 250000 },
  { label: 'LKR 500,000', value: 500000 },
  { label: 'LKR 1,000,000', value: 1000000 },
  { label: 'LKR 2,500,000', value: 2500000 },
  { label: 'LKR 5,000,000', value: 5000000 },
];

export function CustomerCreditTermsSettings() {
  const { role, currentUser } = useAuth();
  const isAuthorized = role === 'DIRECTOR' || role === 'MANAGER';

  const [config, setConfig] = useState<CustomerCreditTermsConfig>(() =>
    creditTermsConfigService.getCreditTermsConfig()
  );

  // Form draft state
  const [draftDays, setDraftDays] = useState<number>(config.defaultCreditDays);
  const [draftLimit, setDraftLimit] = useState<number>(config.defaultCreditLimit);
  const [draftGraceDays, setDraftGraceDays] = useState<number>(config.gracePeriodDays);
  const [draftDiscount, setDraftDiscount] = useState<number>(config.defaultDiscountPercentage);
  const [draftMaxDiscount, setDraftMaxDiscount] = useState<number>(config.maxDiscountPercentage);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Sync draft state with service
  useEffect(() => {
    const current = creditTermsConfigService.getCreditTermsConfig();
    setConfig(current);
    setDraftDays(current.defaultCreditDays);
    setDraftLimit(current.defaultCreditLimit);
    setDraftGraceDays(current.gracePeriodDays);
    setDraftDiscount(current.defaultDiscountPercentage);
    setDraftMaxDiscount(current.maxDiscountPercentage);
  }, []);

  // Access Control Guard
  if (!isAuthorized) {
    return (
      <Card className="border-rose-200 bg-rose-50/50 p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3 text-rose-700">
          <ShieldAlert className="h-6 w-6 shrink-0 text-rose-600" />
          <div>
            <h3 className="text-sm font-bold">Access Restricted</h3>
            <p className="text-xs text-rose-600 mt-0.5">
              Only users with the <span className="font-bold">Director</span> or{' '}
              <span className="font-bold">Manager</span> role are authorized to configure default customer credit terms and system-wide limits.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Live approval evaluation based on draft values
  const approvalEvaluation = determineCustomerApprovalRoute(draftDays, draftLimit);

  const handleSave = () => {
    if (draftDays <= 0 || draftDays > 365) {
      toast.error('Default Credit Days must be between 1 and 365 days.');
      return;
    }
    if (draftLimit <= 0) {
      toast.error('Default Credit Limit must be greater than zero.');
      return;
    }
    if (draftDiscount < 0 || draftDiscount > 50) {
      toast.error('Standard discount must be between 0% and 50%.');
      return;
    }
    if (draftMaxDiscount < draftDiscount || draftMaxDiscount > 60) {
      toast.error('Maximum discount cap must be greater than or equal to standard discount.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = creditTermsConfigService.updateCreditTermsConfig(
        {
          defaultCreditDays: draftDays,
          defaultCreditLimit: draftLimit,
          gracePeriodDays: draftGraceDays,
          defaultDiscountPercentage: draftDiscount,
          maxDiscountPercentage: draftMaxDiscount,
        },
        currentUser
      );
      setConfig(updated);
      setIsSaved(true);
      toast.success(
        `Default credit terms updated: ${draftDays} Days, ${formatCurrency(draftLimit)} limit.`
      );
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save credit terms configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const res = creditTermsConfigService.resetToDefaults(currentUser);
    setConfig(res);
    setDraftDays(res.defaultCreditDays);
    setDraftLimit(res.defaultCreditLimit);
    setDraftGraceDays(res.gracePeriodDays);
    setDraftDiscount(res.defaultDiscountPercentage);
    setDraftMaxDiscount(res.maxDiscountPercentage);
    toast.info('Restored default corporate credit terms (30 Days, LKR 500,000 Limit).');
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ── 1. Page Header & Purpose Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                Customer Credit Terms Configuration
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure default Credit Days and Credit Limit automatically assigned to every newly created customer account.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs px-2.5 py-1 font-semibold flex items-center gap-1"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Manager &amp; Director Access
          </Badge>
          <Badge
            variant="outline"
            className="bg-primary/5 text-primary border-primary/20 text-xs px-2.5 py-1 font-semibold flex items-center gap-1"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Auto-Assigned on Registration
          </Badge>
        </div>
      </div>

      {/* ── 2. Summary KPI Metric Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Default Credit Period
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono">{draftDays}</span>
            <span className="text-xs font-semibold text-slate-500">Days</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Settlement window applied to new customer sales invoices
          </p>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Default Credit Ceiling
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
              {formatCurrency(draftLimit)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Maximum credit headroom for uncollected receivables
          </p>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Registration Approval Tier
            </span>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                approvalEvaluation.isExceptional
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span
              className={`text-sm font-bold block ${
                approvalEvaluation.isExceptional ? 'text-amber-800' : 'text-indigo-800'
              }`}
            >
              {approvalEvaluation.targetRole} APPROVAL
            </span>
            <span className="text-[11px] text-slate-500 block truncate mt-0.5">
              {approvalEvaluation.isExceptional ? 'Director Tier Required' : 'Standard Commercial Route'}
            </span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Auto-Assignment Status
            </span>
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300 font-bold text-[11px]">
              Active &amp; Enforced
            </Badge>
            <span className="text-[10px] text-slate-400 block mt-1 font-mono">
              Updated by {config.updatedBy}
            </span>
          </div>
        </Card>
      </div>

      {/* ── 3. Main Form Configuration Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD A: Default Credit Days */}
        <Card className="border-slate-200/90 shadow-xs bg-white flex flex-col justify-between">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  1. Default Credit Days
                </CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {draftDays} Days
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              The number of calendar days allowed for newly registered customers to settle credit invoices before entering overdue aging buckets.
            </p>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Quick Presets */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                Quick Preset Selection
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CREDIT_DAYS_PRESETS.map((preset) => {
                  const isSelected = draftDays === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setDraftDays(preset.value)}
                      className={`px-3 py-2 text-xs rounded-xl border text-left font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary font-bold shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                      }`}
                    >
                      <span className="block text-xs font-bold leading-tight">{preset.value} Days</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight truncate">
                        {preset.label.split('(')[1]?.replace(')', '') || 'Custom'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Custom Credit Period (Days)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={draftDays || ''}
                  onChange={(e) => setDraftDays(Math.max(1, parseInt(e.target.value) || 0))}
                  className="font-mono text-sm h-10 pr-16 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  DAYS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Standard corporate terms are 30 days. Credit periods exceeding 30 days automatically trigger Director Approval.
              </p>
            </div>

            {/* Informational Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-[11px]">
                <Info className="h-3.5 w-3.5 text-primary" />
                Automatic Due Date Rule
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                When a Sales Representative or Showroom Cashier creates an invoice for a customer, the due date will be calculated as:{' '}
                <span className="font-mono font-semibold text-slate-800">
                  Due Date = Invoice Date + {draftDays} Days
                </span>
                .
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CARD B: Default Credit Limit */}
        <Card className="border-slate-200/90 shadow-xs bg-white flex flex-col justify-between">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  2. Default Credit Limit
                </CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-700">
                {formatCurrency(draftLimit)}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              The maximum total outstanding credit balance allowed for a newly registered customer before sales order credit checks block dispatch.
            </p>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Quick Presets */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                Quick Preset Selection (LKR)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CREDIT_LIMIT_PRESETS.map((preset) => {
                  const isSelected = draftLimit === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setDraftLimit(preset.value)}
                      className={`px-3 py-2 text-xs rounded-xl border text-left font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 font-bold shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                      }`}
                    >
                      <span className="block text-xs font-bold leading-tight">
                        {formatCurrency(preset.value).replace('.00', '')}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">
                        {preset.value >= 1000000 ? 'Director Tier' : 'Manager Tier'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Custom Maximum Credit Limit (LKR)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="50000"
                  min="50000"
                  value={draftLimit || ''}
                  onChange={(e) => setDraftLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-mono text-sm h-10 pr-16 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  LKR
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Formatted: {formatCurrency(draftLimit)}
              </p>
            </div>

            {/* Threshold Notice */}
            {draftLimit > 1000000 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px]">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Director Authorization Threshold Triggered
                </div>
                <p className="text-amber-700 text-[11px] leading-relaxed">
                  Default credit limit of {formatCurrency(draftLimit)} exceeds the standard LKR 1,000,000 ceiling. All new customer profiles created will require formal{' '}
                  <span className="font-bold underline">Director Approval</span> before activation.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Standard Commercial Tier
                </div>
                <p className="text-emerald-700 text-[11px] leading-relaxed">
                  Default credit limit is within the standard LKR 1,000,000 threshold. Initial commercial terms can be validated by the{' '}
                  <span className="font-bold">Manager</span>.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Action Suite & Audit Trail ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200">
        <div className="text-xs text-slate-500 space-y-0.5 text-center sm:text-left">
          <div>
            Last configured by:{' '}
            <span className="font-semibold text-slate-800">{config.updatedBy}</span>{' '}
            <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 ml-1">
              {config.updatedByRole}
            </Badge>
          </div>
          <div className="text-[11px] text-slate-400">
            Last updated: {formatDate(config.updatedAt)}
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="text-xs h-9 gap-1.5 flex-1 sm:flex-initial"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            Reset Defaults
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`text-xs h-9 gap-1.5 font-bold flex-1 sm:flex-initial px-4 ${
              isSaved
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-primary hover:bg-primary-hover text-white shadow-xs'
            }`}
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Configuration Saved
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CustomerCreditTermsSettings;

