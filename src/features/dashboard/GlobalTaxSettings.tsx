import { useState, useEffect } from 'react';
import { useTax } from '../../hooks/useTax';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/AuthService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Percent,
  Check,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Calculator,
  Info,
  Building,
  FileSpreadsheet,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'sonner';

export function GlobalTaxSettings() {
  const { role, currentUser } = useAuth();
  const {
    taxConfig,
    taxEnabled,
    taxRate,
    taxName,
    setTaxConfig,
    canConfigureTax: contextCanConfigure,
    resetDefaults,
  } = useTax();

  const effectiveRole = role || currentUser?.role || authService.getCurrentUser()?.role;
  const isDirector = effectiveRole === 'DIRECTOR';

  // Internal draft state
  const [draftEnabled, setDraftEnabled] = useState<boolean>(taxEnabled);
  const [draftRate, setDraftRate] = useState<number>(taxRate);
  const [draftName, setDraftName] = useState<string>(taxName || 'VAT');
  const [simulatedSubtotal, setSimulatedSubtotal] = useState<number>(100000);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync internal draft when external config updates
  useEffect(() => {
    setDraftEnabled(taxConfig.taxEnabled);
    setDraftRate(taxConfig.taxRate);
    setDraftName(taxConfig.taxName || 'VAT');
  }, [taxConfig]);

  // Access lockdown if not DIRECTOR
  if (!isDirector) {
    return (
      <Card className="border-rose-200 bg-rose-50/50 p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3 text-rose-700">
          <ShieldAlert className="h-6 w-6 shrink-0 text-rose-600" />
          <div>
            <h3 className="text-sm font-bold">Access Restricted</h3>
            <p className="text-xs text-rose-600 mt-0.5">
              Only authenticated users with the <span className="font-bold">Director</span> role are
              permitted to configure system-wide tax settings and statutory rates.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Live calculation preview values based on draft state
  const activeRate = draftEnabled ? draftRate : 0;
  const calculatedTax = draftEnabled ? Math.round(simulatedSubtotal * (draftRate / 100) * 100) / 100 : 0;
  const calculatedGrandTotal = simulatedSubtotal + calculatedTax;

  // Has unsaved changes?
  const hasChanges =
    draftEnabled !== taxConfig.taxEnabled ||
    draftRate !== taxConfig.taxRate ||
    draftName !== (taxConfig.taxName || 'VAT');

  const handleSave = () => {
    if (draftRate < 0 || draftRate > 100) {
      toast.error('Tax percentage must be between 0% and 100%.');
      return;
    }

    setIsSaving(true);
    const result = setTaxConfig({
      taxEnabled: draftEnabled,
      taxRate: draftRate,
      taxName: draftName.trim() || 'VAT',
    });

    setTimeout(() => {
      setIsSaving(false);
      if (result.success && result.config) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        toast.success(
          result.config.taxEnabled
            ? `Global Tax Enabled: Automatically applying ${result.config.taxRate}% ${result.config.taxName} to all new Quotations and Invoices.`
            : `Global Tax Disabled: No tax will be added to new Quotations and Invoices.`,
          {
            description: 'Global system-level tax configuration updated successfully.',
          }
        );
      } else {
        toast.error(result.error || 'Failed to update global tax configuration.');
      }
    }, 150);
  };

  const handleResetToDefault = () => {
    resetDefaults();
    setDraftEnabled(true);
    setDraftRate(18);
    setDraftName('VAT');
    toast.info('Tax configuration reset to statutory standard 18% VAT.');
  };

  const PRESET_RATES = [
    { label: '0% Exempt', rate: 0 },
    { label: '8% Reduced', rate: 8 },
    { label: '12% Standard', rate: 12 },
    { label: '15% Corporate', rate: 15 },
    { label: '18% Standard VAT (IRD)', rate: 18 },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Director Dashboard</span>
            <span className="text-slate-300">/</span>
            <span>Settings</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-semibold">Global Tax Configuration</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Global Tax Configuration System
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure system-wide tax enforcement and rates for all newly created Quotations and Invoices.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            className="text-xs gap-1.5 h-8 text-slate-600 hover:text-slate-900"
            title="Reset to 18% statutory default"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs gap-1.5 h-8 font-medium shadow-xs"
          >
            {isSaving ? (
              'Saving...'
            ) : saveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Tax Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Unsaved changes banner */}
      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>You have unsaved changes to the global tax configuration. Click "Save Tax Settings" to apply them system-wide.</span>
          </div>
          <Button size="sm" onClick={handleSave} className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0">
            Apply Now
          </Button>
        </div>
      )}

      {/* 2-Column Grid: Config Controls & Live Preview Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Configuration Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Control Card */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                  <Sliders className="h-4 w-4 text-primary" />
                  Tax Status & Rate Rules
                </CardTitle>
                {draftEnabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Tax Enabled ({draftRate}%)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Tax Disabled (0%)
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-5">
              {/* Section 1: Tax Enabled Toggle */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="tax-toggle" className="text-sm font-bold text-slate-900 cursor-pointer block">
                      Tax Enabled
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                      When enabled, tax is automatically calculated and added to <strong>all new Quotations and Invoices</strong>.
                      When disabled, tax is not added (calculated as Rs. 0).
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      id="tax-toggle"
                      type="checkbox"
                      checked={draftEnabled}
                      onChange={(e) => setDraftEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-xs"></div>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 text-xs text-slate-600">
                  <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    Current Setting:{' '}
                    <strong className={draftEnabled ? 'text-emerald-700' : 'text-slate-700'}>
                      {draftEnabled ? `Tax is ENABLED at ${draftRate}%` : 'Tax is DISABLED (0% Tax Amount)'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Section 2: Configurable Rate */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applicable Tax Percentage / Rate (%) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    The tax percentage applied to invoice and quotation line items when tax is enabled.
                  </p>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-xs">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={draftRate}
                        disabled={!draftEnabled}
                        onChange={(e) => setDraftRate(parseFloat(e.target.value) || 0)}
                        className={`h-9 font-mono font-bold text-sm pr-8 ${
                          !draftEnabled ? 'bg-slate-100 text-slate-400' : ''
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        %
                      </span>
                    </div>

                    <span className="text-xs text-slate-500">
                      {!draftEnabled && '(Inactive because tax is disabled)'}
                    </span>
                  </div>
                </div>

                {/* Preset Chips */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                    Quick Statutory Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_RATES.map((preset) => (
                      <button
                        key={preset.rate}
                        type="button"
                        disabled={!draftEnabled}
                        onClick={() => setDraftRate(preset.rate)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                          draftRate === preset.rate && draftEnabled
                            ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        } ${!draftEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 3: Tax Label / Identifier */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tax Nomenclature / Label
                </label>
                <div className="max-w-xs">
                  <Input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="e.g. VAT, GST, Sales Tax"
                    className="h-9 text-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Appears on official Quotation and Invoice PDF headers and financial breakdowns.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Historical Document Integrity Card */}
          <Card className="border-slate-200 bg-slate-50/50 shadow-xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <FileCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900">Historical Document Immutability & Audit Guarantee</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed text-[11.5px]">
                    <li>
                      This is a <strong>global system-level setting</strong>, not a per-invoice setting.
                    </li>
                    <li>
                      Changes <strong>automatically apply to all newly created Quotations and Invoices</strong>.
                    </li>
                    <li>
                      Existing quotations and invoices are <strong>never mutated retroactively</strong>. Historical documents retain their recorded tax rates and totals for tax compliance.
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (5 cols): Live Calculation Simulator */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-xs border-slate-200 overflow-hidden">
            <CardHeader className="pb-3 bg-slate-900 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                  <Calculator className="h-4 w-4 text-emerald-400" />
                  Live Calculation Simulator
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-700">
                  Real-time Math
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Verify exactly how newly created Quotations & Invoices will compute totals.
              </p>
            </CardHeader>

            <CardContent className="p-4 space-y-4 bg-white">
              {/* Test Subtotal Input */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Test Subtotal (LKR):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 font-mono">
                    Rs.
                  </span>
                  <Input
                    type="number"
                    min="1"
                    step="1000"
                    value={simulatedSubtotal}
                    onChange={(e) => setSimulatedSubtotal(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-9 pl-9 font-mono font-semibold text-sm tabular-nums"
                  />
                </div>
              </div>

              {/* Simulation Result Card Matching Prompt Example */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold pb-2 border-b border-slate-200">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px]">Document Line Item</span>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px]">Computed Value</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Subtotal:</span>
                    <strong className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(simulatedSubtotal)}
                    </strong>
                  </div>

                  {/* Tax Amount */}
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span>{draftName} ({activeRate}%):</span>
                      {!draftEnabled && (
                        <span className="text-[10px] text-slate-400 font-semibold">(Disabled)</span>
                      )}
                    </span>
                    <strong
                      className={`font-mono text-sm font-semibold tabular-nums ${
                        draftEnabled ? 'text-primary' : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(calculatedTax)}
                    </strong>
                  </div>

                  {/* Grand Total */}
                  <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-center text-slate-900 font-bold">
                    <span className="text-sm">Grand Total:</span>
                    <span className="text-base text-primary font-mono tabular-nums">
                      {formatCurrency(calculatedGrandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-side Comparative Visualizer (Prompt Example Spec) */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Reference Specification Contrast:
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Enabled Example Box */}
                  <div
                    className={`rounded-lg p-2.5 border transition-all ${
                      draftEnabled
                        ? 'border-emerald-300 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div className="font-bold text-slate-900 text-[11px] flex items-center justify-between">
                      <span>Tax Enabled ({draftRate}%)</span>
                      {draftEnabled && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                    </div>
                    <div className="text-[10.5px] font-mono text-slate-600 mt-1 space-y-0.5">
                      <div>Subtotal: Rs. 100,000</div>
                      <div className="text-emerald-700 font-semibold">
                        Tax ({draftRate}%): Rs. {(100000 * (draftRate / 100)).toLocaleString()}
                      </div>
                      <div className="font-bold text-slate-900 pt-0.5 border-t border-slate-200">
                        Total: Rs. {(100000 + 100000 * (draftRate / 100)).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Disabled Example Box */}
                  <div
                    className={`rounded-lg p-2.5 border transition-all ${
                      !draftEnabled
                        ? 'border-slate-400 bg-white ring-2 ring-slate-400/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div className="font-bold text-slate-900 text-[11px] flex items-center justify-between">
                      <span>Tax Disabled</span>
                      {!draftEnabled && <CheckCircle2 className="h-3 w-3 text-slate-700" />}
                    </div>
                    <div className="text-[10.5px] font-mono text-slate-600 mt-1 space-y-0.5">
                      <div>Subtotal: Rs. 100,000</div>
                      <div className="text-slate-500 font-semibold">Tax: Rs. 0</div>
                      <div className="font-bold text-slate-900 pt-0.5 border-t border-slate-200">
                        Total: Rs. 100,000
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quotations & Invoices Coverage Badge */}
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 flex items-center gap-3 text-xs text-primary">
                <div className="flex -space-x-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-xs">
                    <Receipt className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div>
                  <strong className="block text-slate-900 text-xs">Unified Document Coverage</strong>
                  <p className="text-[11px] text-slate-600">
                    Consistently applied to both <strong>Quotations</strong> and <strong>Invoices</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
