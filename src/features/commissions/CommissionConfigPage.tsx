import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  CommissionRole,
  COMMISSION_ROLES,
  COMMISSION_ROLE_LABELS,
  COMMISSION_ROLE_DESCRIPTIONS,
  CommissionScenarioType,
  COMMISSION_SCENARIO_INFO,
  RoleCommissionConfig,
  CommissionTier,
  MonthlyCommissionReport,
  UserCommissionReportItem,
} from '../../types/commissionConfig';
import { commissionConfigService } from '../../services/CommissionConfigService';
import { formatCurrency } from '../../utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { toast } from 'sonner';
import {
  Award,
  Sliders,
  Calendar,
  DollarSign,
  TrendingUp,
  Target,
  Layers,
  Banknote,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Download,
  Printer,
  ChevronRight,
  Eye,
  Info,
  Search,
  Filter,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

export function CommissionConfigPage() {
  const { currentUser, role } = useAuth();

  // Role verification: Accessible to Manager and Director roles
  const canAccess =
    role === 'DIRECTOR' ||
    role === 'MANAGER' ||
    role === 'SALES_MANAGER' ||
    role === 'AREA_MANAGER' ||
    role === 'FINANCE_MANAGER';

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<'config' | 'reports'>('config');

  // Configuration State
  const [configs, setConfigs] = useState<Record<CommissionRole, RoleCommissionConfig> | null>(null);
  const [selectedRole, setSelectedRole] = useState<CommissionRole>('SALES_REP');
  const [workingConfig, setWorkingConfig] = useState<RoleCommissionConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add / Edit Tier Modal state
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierMinSales, setTierMinSales] = useState<number>(0);
  const [tierReward, setTierReward] = useState<number>(0);
  const [tierLabel, setTierLabel] = useState<string>('');

  // Simulation test amounts for live preview
  const [simSales, setSimSales] = useState<number>(35000);
  const [simCollections, setSimCollections] = useState<number>(45000);

  // Monthly Report State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });
  const [monthlyReport, setMonthlyReport] = useState<MonthlyCommissionReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [reportRoleFilter, setReportRoleFilter] = useState<string>('ALL');
  const [breakdownModalItem, setBreakdownModalItem] = useState<UserCommissionReportItem | null>(null);

  // Generate list of previous 12 months for selector
  const availableMonths = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lbl = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({ value: val, label: lbl });
    }
    return list;
  }, []);

  // Load configs on mount
  useEffect(() => {
    loadAllConfigs();
  }, []);

  const loadAllConfigs = async () => {
    try {
      const data = await commissionConfigService.getAllRoleConfigs();
      setConfigs(data);
      if (data[selectedRole]) {
        setWorkingConfig(JSON.parse(JSON.stringify(data[selectedRole])));
      }
    } catch (e: any) {
      toast.error('Failed to load commission configurations: ' + e.message);
    }
  };

  // Sync working config when selected role changes
  useEffect(() => {
    if (configs && configs[selectedRole]) {
      setWorkingConfig(JSON.parse(JSON.stringify(configs[selectedRole])));
      setHasUnsavedChanges(false);
    }
  }, [selectedRole, configs]);

  // Load Monthly Report when activeTab is reports or selectedMonth changes
  useEffect(() => {
    if (activeTab === 'reports') {
      loadMonthlyReport(selectedMonth);
    }
  }, [activeTab, selectedMonth]);

  const loadMonthlyReport = async (monthStr: string) => {
    try {
      setReportLoading(true);
      const report = await commissionConfigService.getMonthlyCommissionReport(monthStr);
      setMonthlyReport(report);
    } catch (e: any) {
      toast.error('Failed to generate monthly commission report: ' + e.message);
    } finally {
      setReportLoading(false);
    }
  };

  // Switch scenario for current working config
  const handleScenarioChange = (scenario: CommissionScenarioType) => {
    if (!workingConfig) return;
    setWorkingConfig({
      ...workingConfig,
      activeScenario: scenario,
    });
    setHasUnsavedChanges(true);
  };

  // Save current working config
  const handleSaveConfig = async () => {
    if (!workingConfig) return;
    try {
      setIsSaving(true);
      await commissionConfigService.updateRoleConfig(
        selectedRole,
        workingConfig,
        currentUser?.name || 'Executive User'
      );
      toast.success(
        `Commission rules for ${COMMISSION_ROLE_LABELS[selectedRole]} saved successfully!`
      );
      setHasUnsavedChanges(false);
      await loadAllConfigs();
      if (activeTab === 'reports') {
        loadMonthlyReport(selectedMonth);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all roles back to system default commission rules?')) return;
    try {
      setIsSaving(true);
      const res = await commissionConfigService.resetToDefaults();
      setConfigs(res);
      setWorkingConfig(JSON.parse(JSON.stringify(res[selectedRole])));
      setHasUnsavedChanges(false);
      toast.success('All commission rules reset to defaults');
      if (activeTab === 'reports') {
        loadMonthlyReport(selectedMonth);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to reset rules');
    } finally {
      setIsSaving(false);
    }
  };

  // Tier management helpers
  const handleOpenAddTier = () => {
    setEditingTierId(null);
    setTierMinSales(30000);
    setTierReward(6000);
    setTierLabel('');
    setTierModalOpen(true);
  };

  const handleOpenEditTier = (tier: CommissionTier) => {
    setEditingTierId(tier.id);
    setTierMinSales(tier.minSalesAmount);
    setTierReward(tier.commissionReward);
    setTierLabel(tier.tierLabel || '');
    setTierModalOpen(true);
  };

  const handleSaveTier = () => {
    if (!workingConfig) return;
    if (tierMinSales <= 0) {
      toast.error('Minimum sales threshold must be greater than zero.');
      return;
    }
    if (tierReward <= 0) {
      toast.error('Commission reward amount must be greater than zero.');
      return;
    }

    const currentTiers = [...workingConfig.tierConfig.tiers];
    if (editingTierId) {
      // Edit
      const index = currentTiers.findIndex((t) => t.id === editingTierId);
      if (index !== -1) {
        currentTiers[index] = {
          ...currentTiers[index],
          minSalesAmount: tierMinSales,
          commissionReward: tierReward,
          tierLabel: tierLabel.trim() || `Tier: Sales ≥ ${formatCurrency(tierMinSales)}`,
        };
      }
    } else {
      // Add new
      currentTiers.push({
        id: `tier-custom-${Date.now()}`,
        minSalesAmount: tierMinSales,
        commissionReward: tierReward,
        tierLabel: tierLabel.trim() || `Tier: Sales ≥ ${formatCurrency(tierMinSales)}`,
      });
    }

    // Sort ascending
    currentTiers.sort((a, b) => a.minSalesAmount - b.minSalesAmount);

    setWorkingConfig({
      ...workingConfig,
      tierConfig: {
        ...workingConfig.tierConfig,
        tiers: currentTiers,
      },
    });
    setHasUnsavedChanges(true);
    setTierModalOpen(false);
  };

  const handleDeleteTier = (id: string) => {
    if (!workingConfig) return;
    if (workingConfig.tierConfig.tiers.length <= 1) {
      toast.error('You must have at least one tier configured.');
      return;
    }
    const filtered = workingConfig.tierConfig.tiers.filter((t) => t.id !== id);
    setWorkingConfig({
      ...workingConfig,
      tierConfig: {
        ...workingConfig.tierConfig,
        tiers: filtered,
      },
    });
    setHasUnsavedChanges(true);
    toast.info('Tier removed. Remember to click Save Configuration.');
  };

  // Filtered report items
  const filteredReportItems = useMemo(() => {
    if (!monthlyReport) return [];
    return monthlyReport.items.filter((item) => {
      if (reportRoleFilter !== 'ALL' && item.commissionRole !== reportRoleFilter) {
        return false;
      }
      if (reportSearch.trim()) {
        const q = reportSearch.toLowerCase().trim();
        const matchesName = item.userName.toLowerCase().includes(q);
        const matchesRole = item.userRole.toLowerCase().includes(q);
        const matchesMethod = item.calculationMethod.toLowerCase().includes(q);
        return matchesName || matchesRole || matchesMethod;
      }
      return true;
    });
  }, [monthlyReport, reportRoleFilter, reportSearch]);

  // Export report to CSV
  const handleExportCSV = () => {
    if (!monthlyReport || filteredReportItems.length === 0) {
      toast.error('No report data to export.');
      return;
    }

    const headers = [
      'User Name',
      'User Role',
      'Month',
      'Total Sales (LKR)',
      'Total Collections (LKR)',
      'Calculation Method',
      'Applicable Tier or Rate',
      'Commission Earned (LKR)',
      'Status',
    ];

    const rows = filteredReportItems.map((item) => [
      `"${item.userName}"`,
      `"${COMMISSION_ROLE_LABELS[item.commissionRole] || item.userRole}"`,
      item.month,
      item.totalSales,
      item.totalCollections,
      `"${item.calculationMethod}"`,
      `"${item.applicableRateOrTier}"`,
      item.commissionEarned,
      item.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Commission_Report_${monthlyReport.month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Commission report CSV downloaded.');
  };

  // Print Report
  const handlePrintReport = () => {
    window.print();
  };

  // Restrict access for non-management
  if (!canAccess) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Restricted Access</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          The Commission Configuration and Monthly Audit Reports module is restricted exclusively
          to executive management (Directors, General Managers, and Sales Management).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Commission Configuration & Reports
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider">
                  Manager & Director
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Dynamic role-based commission scenarios (Collections, Tiers, Targets) and monthly payout audits.
              </p>
            </div>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'config'
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Commission Configuration</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'reports'
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Monthly Commission Reports</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: COMMISSION CONFIGURATION                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Section 1: Role Selector Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Select Role to Configure
              </span>
              {hasUnsavedChanges && (
                <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <AlertCircle className="h-3 w-3" />
                  Unsaved changes in {COMMISSION_ROLE_LABELS[selectedRole]}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {COMMISSION_ROLES.map((r) => {
                const isSelected = selectedRole === r;
                const rConfig = configs ? configs[r] : null;
                const activeScenario = rConfig?.activeScenario;

                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[92px] ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {COMMISSION_ROLE_LABELS[r]}
                        </span>
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {COMMISSION_ROLE_DESCRIPTIONS[r]}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[9px] font-semibold uppercase text-slate-400">
                        Method:
                      </span>
                      {activeScenario ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold px-1.5 py-0 bg-slate-50 text-slate-700"
                        >
                          {COMMISSION_SCENARIO_INFO[activeScenario].badge}
                        </Badge>
                      ) : (
                        <span className="text-[9px] text-slate-400">Loading…</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Active Scenario Configuration Card */}
          {workingConfig && (
            <Card className="border border-slate-200/90 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-100 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                        <span>Configuring: {COMMISSION_ROLE_LABELS[selectedRole]}</span>
                        <Badge className="bg-primary text-white text-[10px] px-2 py-0.5">
                          {COMMISSION_SCENARIO_INFO[workingConfig.activeScenario].badge}
                        </Badge>
                      </CardTitle>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose which commission calculation scenario applies to all users with the{' '}
                      <strong>{COMMISSION_ROLE_LABELS[selectedRole]}</strong> role.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetDefaults}
                      disabled={isSaving}
                      className="text-xs h-8 gap-1.5 text-slate-600"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset Defaults
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveConfig}
                      disabled={isSaving || !hasUnsavedChanges}
                      className="text-xs h-8 px-4 gap-1.5 font-bold shadow-xs bg-primary hover:bg-primary-hover text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isSaving ? 'Saving…' : hasUnsavedChanges ? 'Save Configuration *' : 'Saved'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-6">
                {/* 3 Scenario Switcher Radio Cards */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                    Select Active Commission Scenario
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Scenario 1: Collection-Based */}
                    <div
                      onClick={() => handleScenarioChange('COLLECTION_BASED')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        workingConfig.activeScenario === 'COLLECTION_BASED'
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.03] shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Banknote className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-black text-slate-900">
                            Scenario 1: Collection-Based
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="scenario-radio"
                          checked={workingConfig.activeScenario === 'COLLECTION_BASED'}
                          onChange={() => handleScenarioChange('COLLECTION_BASED')}
                          className="text-primary focus:ring-primary h-4 w-4"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                        {COMMISSION_SCENARIO_INFO.COLLECTION_BASED.description}
                      </p>
                      <div className="p-2 rounded bg-slate-100/70 border border-slate-200/60 font-mono text-[10px] text-slate-700">
                        {COMMISSION_SCENARIO_INFO.COLLECTION_BASED.formulaPreview}
                      </div>
                    </div>

                    {/* Scenario 2: Tier-Based */}
                    <div
                      onClick={() => handleScenarioChange('TIER_BASED')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        workingConfig.activeScenario === 'TIER_BASED'
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.03] shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Layers className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-black text-slate-900">
                            Scenario 2: Tier-Based
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="scenario-radio"
                          checked={workingConfig.activeScenario === 'TIER_BASED'}
                          onChange={() => handleScenarioChange('TIER_BASED')}
                          className="text-primary focus:ring-primary h-4 w-4"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                        {COMMISSION_SCENARIO_INFO.TIER_BASED.description}
                      </p>
                      <div className="p-2 rounded bg-slate-100/70 border border-slate-200/60 font-mono text-[10px] text-slate-700">
                        {COMMISSION_SCENARIO_INFO.TIER_BASED.formulaPreview}
                      </div>
                    </div>

                    {/* Scenario 3: Target-Based */}
                    <div
                      onClick={() => handleScenarioChange('TARGET_BASED')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        workingConfig.activeScenario === 'TARGET_BASED'
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.03] shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                            <Target className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-black text-slate-900">
                            Scenario 3: Target-Based
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="scenario-radio"
                          checked={workingConfig.activeScenario === 'TARGET_BASED'}
                          onChange={() => handleScenarioChange('TARGET_BASED')}
                          className="text-primary focus:ring-primary h-4 w-4"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                        {COMMISSION_SCENARIO_INFO.TARGET_BASED.description}
                      </p>
                      <div className="p-2 rounded bg-slate-100/70 border border-slate-200/60 font-mono text-[10px] text-slate-700">
                        {COMMISSION_SCENARIO_INFO.TARGET_BASED.formulaPreview}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── DETAIL CONFIGURATION FOR SELECTED SCENARIO ── */}
                <div className="pt-4 border-t border-slate-100">
                  {/* DETAIL: SCENARIO 1 (COLLECTION BASED) */}
                  {workingConfig.activeScenario === 'COLLECTION_BASED' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-emerald-600" />
                            Collection-Based Commission Parameters
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Set the percentage of total monthly cash and payments collected by the employee.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Commission Percentage Rate (%)
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.25}
                                value={workingConfig.collectionConfig.commissionPercentage}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setWorkingConfig({
                                    ...workingConfig,
                                    collectionConfig: { commissionPercentage: val },
                                  });
                                  setHasUnsavedChanges(true);
                                }}
                                className="h-9 font-bold text-slate-900 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                %
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 shrink-0">of Collections</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Standard company range: 0.50% - 5.00%
                          </p>
                        </div>

                        {/* Interactive live test simulator */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200/80 text-xs space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            Live Formula Preview
                          </span>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Sample Monthly Collections:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {formatCurrency(simCollections)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Rate ({workingConfig.collectionConfig.commissionPercentage}%):</span>
                            <span className="font-mono font-bold text-emerald-600">
                              {formatCurrency(
                                Math.round(
                                  simCollections *
                                    (workingConfig.collectionConfig.commissionPercentage / 100)
                                )
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DETAIL: SCENARIO 2 (TIER BASED) */}
                  {workingConfig.activeScenario === 'TIER_BASED' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Layers className="h-4 w-4 text-blue-600" />
                            Tier-Based Sales Thresholds & Fixed Rewards
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Predefined default tiers with option to add custom tiers. Highest reached tier applies.
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleOpenAddTier}
                          className="text-xs h-8 gap-1.5 text-primary border-primary/30 hover:bg-primary/5 shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Additional Tier
                        </Button>
                      </div>

                      {/* Tiers Table */}
                      <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <div className="overflow-x-auto [scrollbar-width:thin]">
                          <Table className="min-w-[650px]">
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="w-16 font-bold text-slate-700">Tier #</TableHead>
                              <TableHead className="font-bold text-slate-700">Tier Label / Description</TableHead>
                              <TableHead className="font-bold text-slate-700">Minimum Sales Required</TableHead>
                              <TableHead className="font-bold text-slate-700">Commission Reward</TableHead>
                              <TableHead className="text-right w-24 font-bold text-slate-700">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workingConfig.tierConfig.tiers.map((tier, idx) => (
                              <TableRow key={tier.id} className="hover:bg-slate-50/60">
                                <TableCell className="font-bold text-slate-900">
                                  Tier {idx + 1}
                                </TableCell>
                                <TableCell className="text-xs font-semibold text-slate-700">
                                  {tier.tierLabel || `Tier ${idx + 1}`}
                                </TableCell>
                                <TableCell className="font-mono text-xs font-bold text-slate-900">
                                  Sales ≥ {formatCurrency(tier.minSalesAmount)}
                                </TableCell>
                                <TableCell className="font-mono text-xs font-bold text-emerald-600">
                                  {formatCurrency(tier.commissionReward)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => handleOpenEditTier(tier)}
                                      className="text-slate-500 hover:text-slate-900"
                                      title="Edit Tier"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => handleDeleteTier(tier.id)}
                                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                      title="Delete Tier"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      </div>

                      {/* Interactive Tier Simulator */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <span className="text-xs font-bold text-slate-700 shrink-0">
                            Test Sales Amount:
                          </span>
                          <Input
                            type="number"
                            value={simSales}
                            onChange={(e) => setSimSales(parseFloat(e.target.value) || 0)}
                            className="h-8 w-36 font-mono text-xs font-bold bg-white"
                          />
                        </div>
                        {(() => {
                          const sorted = [...workingConfig.tierConfig.tiers].sort(
                            (a, b) => a.minSalesAmount - b.minSalesAmount
                          );
                          const reached = [...sorted].reverse().find((t) => simSales >= t.minSalesAmount);
                          return (
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-500">Tier Achieved:</span>
                              {reached ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono font-bold">
                                  {reached.tierLabel}: +{formatCurrency(reached.commissionReward)}
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-200 text-slate-700 border-slate-300">
                                  Below Minimum Tier (LKR 0)
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* DETAIL: SCENARIO 3 (TARGET BASED) */}
                  {workingConfig.activeScenario === 'TARGET_BASED' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Target className="h-4 w-4 text-purple-600" />
                          Target-Based Commission Parameters
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Set the quota target. Once the employee surpasses this target, they earn the configured
                          percentage on subsequent sales.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Predefined Monthly Sales Target (LKR)
                            </label>
                            <Input
                              type="number"
                              min={0}
                              step={5000}
                              value={workingConfig.targetConfig.targetSalesAmount}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setWorkingConfig({
                                  ...workingConfig,
                                  targetConfig: { ...workingConfig.targetConfig, targetSalesAmount: val },
                                });
                                setHasUnsavedChanges(true);
                              }}
                              className="h-9 font-bold text-slate-900 font-mono"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                              e.g. LKR 50,000 threshold to qualify for bonus
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Commission Percentage on Subsequent Sales (%)
                            </label>
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={workingConfig.targetConfig.commissionPercentage}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setWorkingConfig({
                                    ...workingConfig,
                                    targetConfig: { ...workingConfig.targetConfig, commissionPercentage: val },
                                  });
                                  setHasUnsavedChanges(true);
                                }}
                                className="h-9 font-bold text-slate-900 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                %
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              e.g. 5% applied strictly to sales exceeding the target
                            </p>
                          </div>
                        </div>

                        {/* Interactive live test simulator */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200/80 text-xs space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            Live Target Simulator
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs shrink-0">Simulated Sales:</span>
                            <Input
                              type="number"
                              value={simSales}
                              onChange={(e) => setSimSales(parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs font-bold font-mono"
                            />
                          </div>

                          {(() => {
                            const tgt = workingConfig.targetConfig.targetSalesAmount;
                            const rate = workingConfig.targetConfig.commissionPercentage;
                            const isAbove = simSales > tgt;
                            const surplus = Math.max(0, simSales - tgt);
                            const earned = Math.round(surplus * (rate / 100));

                            return (
                              <div className="space-y-1 pt-2 border-t border-slate-100">
                                <div className="flex justify-between text-slate-600">
                                  <span>Target Status:</span>
                                  {isAbove ? (
                                    <span className="font-bold text-emerald-600">
                                      Surpassed by {formatCurrency(surplus)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">
                                      Below Target ({Math.round((simSales / (tgt || 1)) * 100)}%)
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-between font-bold text-slate-900">
                                  <span>Earned Commission:</span>
                                  <span className="font-mono text-purple-600">
                                    {formatCurrency(earned)}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 3: Master Role Assignment Matrix */}
          <Card className="border border-slate-200/90 shadow-2xs">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                Active Role-Based Commission Assignment Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto [scrollbar-width:thin]">
              <Table className="min-w-[850px]">
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Role</TableHead>
                    <TableHead className="font-bold text-slate-700">Assigned Method</TableHead>
                    <TableHead className="font-bold text-slate-700">Configured Rule Parameters</TableHead>
                    <TableHead className="font-bold text-slate-700">Last Updated</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Quick Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMMISSION_ROLES.map((r) => {
                    const c = configs ? configs[r] : null;
                    if (!c) return null;
                    const scenarioInfo = COMMISSION_SCENARIO_INFO[c.activeScenario];

                    return (
                      <TableRow key={r} className="hover:bg-slate-50/60">
                        <TableCell className="font-bold text-slate-900 text-xs">
                          {COMMISSION_ROLE_LABELS[r]}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                            {scenarioInfo.label.split(':')[1]?.trim() || scenarioInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-mono">
                          {c.activeScenario === 'COLLECTION_BASED' && (
                            <span>{c.collectionConfig.commissionPercentage}% of Collections</span>
                          )}
                          {c.activeScenario === 'TIER_BASED' && (
                            <span>
                              {c.tierConfig.tiers.length} Tiers (Max: +
                              {formatCurrency(
                                Math.max(...c.tierConfig.tiers.map((t) => t.commissionReward))
                              )}
                              )
                            </span>
                          )}
                          {c.activeScenario === 'TARGET_BASED' && (
                            <span>
                              Target: {formatCurrency(c.targetConfig.targetSalesAmount)} @{' '}
                              {c.targetConfig.commissionPercentage}%
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          {new Date(c.updatedAt).toLocaleDateString()} by {c.updatedBy}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => setSelectedRole(r)}
                            className="text-primary hover:text-primary font-bold gap-1"
                          >
                            <span>Configure</span>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: MONTHLY COMMISSION REPORTS                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Header Controls: Month Selector & Export / Print */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                Audit Month:
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 px-3 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.value})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintReport}
                className="text-xs h-8 gap-1.5 text-slate-700"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Statement
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="text-xs h-8 gap-1.5 text-slate-700"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          {monthlyReport && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="border border-slate-200/90 shadow-2xs bg-gradient-to-br from-emerald-50/50 via-white to-white">
                <CardContent className="p-4 sm:p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Total Commission Payable
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1">
                    {formatCurrency(monthlyReport.totalCommissionPayable)}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Across {monthlyReport.beneficiariesCount} qualifying beneficiaries
                  </span>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/90 shadow-2xs">
                <CardContent className="p-4 sm:p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Total Qualifying Sales
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                    {formatCurrency(monthlyReport.totalSalesVolume)}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Recorded in {monthlyReport.monthLabel}
                  </span>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/90 shadow-2xs">
                <CardContent className="p-4 sm:p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Total Collections Volume
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                    {formatCurrency(monthlyReport.totalCollectionsVolume)}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Cash & cheque settlements
                  </span>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/90 shadow-2xs bg-gradient-to-br from-primary/5 via-white to-white">
                <CardContent className="p-4 sm:p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Top Commission Earner
                  </span>
                  {monthlyReport.topEarner ? (
                    <>
                      <div className="text-sm font-black text-slate-900 truncate mt-1">
                        {monthlyReport.topEarner.userName}
                      </div>
                      <div className="text-xs font-bold text-primary font-mono">
                        {formatCurrency(monthlyReport.topEarner.amount)}{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({monthlyReport.topEarner.role})
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 mt-1">No commissions logged</div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters: Search & Role Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search staff name or role…"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                className="pl-8.5 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold shrink-0">Filter Role:</span>
              <select
                value={reportRoleFilter}
                onChange={(e) => setReportRoleFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800"
              >
                <option value="ALL">All Configured Roles</option>
                {COMMISSION_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {COMMISSION_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Table */}
          <Card className="border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <Table className="min-w-[950px]">
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">User / Employee</TableHead>
                    <TableHead className="font-bold text-slate-700">Role</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Total Sales</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Total Collections</TableHead>
                    <TableHead className="font-bold text-slate-700">Calculation Method</TableHead>
                    <TableHead className="font-bold text-slate-700">Tier / Applicable Rate</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Commission Earned</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Breakdown</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                        Generating monthly commission audits…
                      </TableCell>
                    </TableRow>
                  ) : filteredReportItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                        No commission records match your filter for this month.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReportItems.map((item) => (
                      <TableRow key={item.userId} className="hover:bg-slate-50/70">
                        <TableCell>
                          <div className="font-bold text-slate-900 text-xs">
                            {item.userName}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {item.userId}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold">
                            {COMMISSION_ROLE_LABELS[item.commissionRole] || item.userRole}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                          {formatCurrency(item.totalSales)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                          {formatCurrency(item.totalCollections)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          <span className="font-semibold">{item.calculationMethod}</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">
                          {item.applicableRateOrTier}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-black text-emerald-700">
                          {formatCurrency(item.commissionEarned)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => setBreakdownModalItem(item)}
                            className="font-semibold text-primary hover:bg-primary/10 gap-1"
                            title="Inspect step-by-step calculation breakdown"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Details</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DIALOG 1: ADD / EDIT TIER MODAL                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={tierModalOpen} onOpenChange={setTierModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            {editingTierId ? 'Edit Sales Commission Tier' : 'Add Additional Sales Commission Tier'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Define the minimum sales threshold (LKR) and the fixed commission reward payable when reached.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Minimum Sales Threshold (LKR) *
            </label>
            <Input
              type="number"
              min={1}
              step={5000}
              value={tierMinSales}
              onChange={(e) => setTierMinSales(parseFloat(e.target.value) || 0)}
              className="h-9 font-mono font-bold text-slate-900"
              placeholder="e.g. 20000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Commission Reward (LKR) *
            </label>
            <Input
              type="number"
              min={1}
              step={500}
              value={tierReward}
              onChange={(e) => setTierReward(parseFloat(e.target.value) || 0)}
              className="h-9 font-mono font-bold text-emerald-600"
              placeholder="e.g. 4000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Tier Label (Optional)
            </label>
            <Input
              type="text"
              value={tierLabel}
              onChange={(e) => setTierLabel(e.target.value)}
              className="h-9 text-xs"
              placeholder="e.g. Tier 2: Sales Above LKR 20,000"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTierModalOpen(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveTier}
            className="text-xs font-bold bg-primary text-white"
          >
            {editingTierId ? 'Save Changes' : 'Add Tier'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DIALOG 2: STEP-BY-STEP CALCULATION AUDIT BREAKDOWN                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {breakdownModalItem && (
        <Dialog open={Boolean(breakdownModalItem)} onOpenChange={() => setBreakdownModalItem(null)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-primary" />
              Commission Calculation Breakdown
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Audit for {breakdownModalItem.userName} ({COMMISSION_ROLE_LABELS[breakdownModalItem.commissionRole]}) for period {breakdownModalItem.month}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Summary Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Commission Awarded
                </span>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {formatCurrency(breakdownModalItem.commissionEarned)}
                </div>
              </div>
              <Badge className="bg-white/10 text-white border-white/20 text-xs font-bold">
                {breakdownModalItem.breakdown.scenarioLabel}
              </Badge>
            </div>

            {/* Performance Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Total Monthly Sales:
                </span>
                <p className="font-mono font-bold text-slate-800 text-sm">
                  {formatCurrency(breakdownModalItem.totalSales)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Total Monthly Collections:
                </span>
                <p className="font-mono font-bold text-slate-800 text-sm">
                  {formatCurrency(breakdownModalItem.totalCollections)}
                </p>
              </div>
            </div>

            {/* Formula Explanation */}
            <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/50 space-y-1.5 text-xs text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <Info className="h-4 w-4 text-blue-600" />
                Calculation Logic & Math:
              </div>
              <p className="leading-relaxed">
                {breakdownModalItem.breakdown.explanation}
              </p>
            </div>

            {/* Target Progress Bar if Target-Based */}
            {breakdownModalItem.breakdown.thresholdProgress && (
              <div className="p-3 rounded-xl border border-slate-200/80 bg-white space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Target Pace:</span>
                  <span className="font-mono font-bold text-purple-700">
                    {breakdownModalItem.breakdown.thresholdProgress.percentage}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        breakdownModalItem.breakdown.thresholdProgress.percentage,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              size="sm"
              onClick={() => setBreakdownModalItem(null)}
              className="text-xs font-semibold"
            >
              Close
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
export default CommissionConfigPage;

