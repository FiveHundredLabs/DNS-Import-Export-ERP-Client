import React, { useState, useEffect } from 'react';
import { salesManagerDashboardService } from '../../services/SalesManagerDashboardService';
import { AreaTerritoryPerformanceData } from '../../types/commission';
import { SubordinateRepsTable } from './SubordinateRepsTable';
import { PerformanceAuditDrawer } from './PerformanceAuditDrawer';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { MOCK_AREAS } from '../../mock/mockAreas';
import {
  MapPin,
  TrendingUp,
  Target,
  Sparkles,
  Banknote,
  Users,
  ShieldCheck,
  Award,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';

interface ManagerTerritoryViewProps {
  areaId: string;
  month: string;
  canSwitchArea?: boolean;
  onAreaChange?: (areaId: string) => void;
}

export function ManagerTerritoryView({
  areaId,
  month,
  canSwitchArea = false,
  onAreaChange,
}: ManagerTerritoryViewProps) {
  const [data, setData] = useState<AreaTerritoryPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audit drawer state
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTerritoryData() {
      try {
        setLoading(true);
        setError(null);
        const result = await salesManagerDashboardService.getAreaPerformance(areaId, month);
        if (isMounted) {
          setData(result);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load territory performance.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTerritoryData();
    return () => {
      isMounted = false;
    };
  }, [areaId, month]);

  const selectedRep = data?.subordinateReps.find((r) => r.repId === selectedRepId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="text-xs text-slate-500 font-medium">Aggregating territory performance & subordinate ledger...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <p className="text-sm font-semibold text-rose-900">Territory Data Unavailable</p>
        <p className="text-xs text-rose-600">{error || 'Could not locate area records.'}</p>
      </div>
    );
  }

  const {
    areaName,
    region,
    managerName,
    territoryTarget,
    territorySales,
    territoryAchievementPercentage,
    territoryCollections,
    surplusSales,
    managerCommission,
    managerBreakdown,
    subordinateReps,
  } = data;

  const isTerritoryTargetMet = territoryAchievementPercentage >= 100;

  return (
    <div className="space-y-6">
      {/* SECTION 1: MANAGER INCENTIVE BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 shadow-md border border-slate-800">
        <div className="relative z-10 space-y-5">
          {/* Top Bar: Territory Title & Area Switcher if permitted */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                  <MapPin className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-bold tracking-tight">
                  {areaName} Territory Oversight
                </h2>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                  {region}
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                Area Manager: <strong className="text-white">{managerName}</strong> | Period:{' '}
                <span className="text-indigo-200 font-semibold">{month}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {canSwitchArea && onAreaChange && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-medium">Territory:</span>
                  <Select value={areaId} onValueChange={onAreaChange}>
                    <SelectTrigger className="h-8 text-xs bg-white/10 border-white/20 text-white min-w-36">
                      <SelectValue placeholder="Switch Area" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_AREAS.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 font-medium text-xs">
                <ShieldCheck className="h-3 w-3 mr-1 inline" /> Territory Boundary Enforced
              </Badge>
            </div>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 1. Territory Sales vs Target */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
                Territory Sales Volume
                <Target className="h-4 w-4 text-indigo-400" />
              </span>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(territorySales)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Target: {formatCurrency(territoryTarget)}</span>
                <Badge
                  className={`text-[10px] font-bold ${
                    isTerritoryTargetMet
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                  }`}
                >
                  {territoryAchievementPercentage}% Achieved
                </Badge>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isTerritoryTargetMet ? 'bg-emerald-400' : 'bg-indigo-400'
                  }`}
                  style={{ width: `${Math.min(territoryAchievementPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* 2. Surplus Volume */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
                Territory Surplus Volume
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </span>
              <div className="text-2xl font-bold text-emerald-400">
                {formatCurrency(surplusSales)}
              </div>
              <p className="text-xs text-slate-300">
                {surplusSales > 0
                  ? `Sales exceeding target threshold by ${formatCurrency(surplusSales)}`
                  : 'Target threshold not yet crossed'}
              </p>
            </div>

            {/* 3. Regional Collections */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
                Cleared Regional Collections
                <Banknote className="h-4 w-4 text-indigo-400" />
              </span>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(territoryCollections)}
              </div>
              <p className="text-xs text-slate-300">
                Total settled receipts across all assigned dealers
              </p>
            </div>

            {/* 4. Personal Manager Incentive Payout */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900/60 to-purple-900/50 border border-indigo-400/30 space-y-2 shadow-inner">
              <span className="text-xs text-indigo-200 font-semibold flex items-center justify-between">
                My Manager Incentive Payout
                <Sparkles className="h-4 w-4 text-amber-300" />
              </span>
              <div className="text-2xl font-extrabold text-amber-300">
                {formatCurrency(managerCommission)}
              </div>
              <p className="text-xs text-slate-200 font-medium leading-tight">
                {managerBreakdown.rateOrTierApplied || 'Territory Incentive Scheme'}
              </p>
            </div>
          </div>

          {/* Formula Breakdown Callout */}
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 flex items-start gap-2.5">
            <Award className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Manager Scheme Formula:</strong>{' '}
              {managerBreakdown.explanation ||
                `Commission is earned as a bonus on territory sales exceeding target.`}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: SUBORDINATE REPS TABLE */}
      <SubordinateRepsTable
        reps={subordinateReps}
        onViewRep={(repId) => setSelectedRepId(repId)}
      />

      {/* SECTION 3: AUDIT SLIDE-OVER DRAWER */}
      <PerformanceAuditDrawer
        open={Boolean(selectedRepId)}
        onClose={() => setSelectedRepId(null)}
        repId={selectedRepId}
        repName={selectedRep?.repName}
        month={month}
      />
    </div>
  );
}
