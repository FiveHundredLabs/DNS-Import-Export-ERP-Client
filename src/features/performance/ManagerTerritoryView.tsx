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
  Banknote,
  ShieldCheck,
  AlertCircle,
  Coins,
  Percent,
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
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading territory performance & team leaderboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-white border border-rose-200 rounded-xl text-center space-y-2">
        <AlertCircle className="h-6 w-6 text-rose-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-900">Territory Data Unavailable</p>
        <p className="text-xs text-rose-600">{error || 'Could not locate area records.'}</p>
      </div>
    );
  }

  const {
    areaName,
    region,
    managerName,
    territorySales,
    territoryCollections,
    territoryCashRealizationPercentage,
    managerCommission,
    managerIncentiveRate,
    managerFormulaExplanation,
    subordinateReps,
  } = data;

  return (
    <div className="space-y-6">
      {/* SECTION 1: MANAGER INCENTIVE & TERRITORY SUMMARY (Clean Enterprise Surface) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">
                {areaName} Territory Overview
              </h2>
              <Badge variant="outline" className="text-[11px] font-normal border-slate-200 text-slate-600 bg-slate-50">
                {region}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Area Manager: <strong className="text-slate-800">{managerName}</strong> | Accounting Period: <span className="font-medium text-slate-700">{month}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canSwitchArea && onAreaChange && (
              <Select value={areaId} onValueChange={onAreaChange}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-200 text-slate-700 min-w-36">
                  <SelectValue placeholder="Switch Territory" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_AREAS.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name} ({a.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Badge variant="outline" className="text-xs font-normal border-slate-200 text-slate-600 bg-slate-50">
              <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600 inline" /> Territory Scoped
            </Badge>
          </div>
        </div>

        {/* 4 Clean Metric Cards (No gradients, no dark backgrounds) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Team Sales Generated */}
          <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1.5">
            <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Team Sales Generated
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </span>
            <div className="text-xl font-bold text-slate-900">
              {formatCurrency(territorySales)}
            </div>
            <p className="text-[11px] text-slate-500">
              Total invoiced sales delivered by team
            </p>
          </div>

          {/* Card 2: Team Cash Collected */}
          <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1.5">
            <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Team Cash Realized
              <Banknote className="h-4 w-4 text-slate-400" />
            </span>
            <div className="text-xl font-bold text-slate-900">
              {formatCurrency(territoryCollections)}
            </div>
            <p className="text-[11px] text-slate-500">
              Verified collections settled this month
            </p>
          </div>

          {/* Card 3: Collection Realization Rate */}
          <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1.5">
            <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Collection Realization
              <Percent className="h-4 w-4 text-slate-400" />
            </span>
            <div className="text-xl font-bold text-slate-900">
              {territoryCashRealizationPercentage}%
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full"
                style={{ width: `${Math.min(territoryCashRealizationPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Card 4: Manager Incentive Payout */}
          <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-200/80 space-y-1.5">
            <span className="text-xs font-semibold text-indigo-900 flex items-center justify-between">
              Manager Incentive Payout
              <Coins className="h-4 w-4 text-indigo-600" />
            </span>
            <div className="text-xl font-bold text-indigo-700">
              {formatCurrency(managerCommission)}
            </div>
            <p className="text-[11px] text-indigo-800">
              Based on team collected cash ({managerIncentiveRate}% rate)
            </p>
          </div>
        </div>

        {/* Informational Calculation Note */}
        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200/70 flex items-center gap-2">
          <Coins className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>{managerFormulaExplanation}</span>
        </div>
      </div>

      {/* SECTION 2: SALES REP PERFORMANCE & INCENTIVE LEADERBOARD */}
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
