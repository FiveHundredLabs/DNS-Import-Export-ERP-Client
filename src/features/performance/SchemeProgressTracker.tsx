import React from 'react';
import {
  RoleCommissionConfig,
  CommissionCalculationBreakdown,
} from '../../types/commissionConfig';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../../components/ui/badge';
import { CheckCircle2, Target, TrendingUp, Sparkles, Layers, DollarSign } from 'lucide-react';

interface SchemeProgressTrackerProps {
  actualSales: number;
  clearedCollections: number;
  targetAmount: number;
  roleConfig: RoleCommissionConfig;
  breakdown: CommissionCalculationBreakdown;
}

export function SchemeProgressTracker({
  actualSales,
  clearedCollections,
  targetAmount,
  roleConfig,
  breakdown,
}: SchemeProgressTrackerProps) {
  const scenario = roleConfig.activeScenario;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      {/* Tracker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            {scenario === 'TIER_BASED' ? (
              <Layers className="h-5 w-5" />
            ) : scenario === 'TARGET_BASED' ? (
              <Target className="h-5 w-5" />
            ) : (
              <DollarSign className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Active Incentive Scheme:{' '}
              {scenario === 'TIER_BASED'
                ? 'Tier-Based Sales Milestone'
                : scenario === 'TARGET_BASED'
                ? 'Target Threshold & Surplus Incentive'
                : 'Collection-Linked Commission'}
            </h3>
            <p className="text-xs text-slate-500">
              {breakdown.explanation || 'Track your monthly qualifying milestones in real time.'}
            </p>
          </div>
        </div>

        <div>
          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200 font-medium">
            {breakdown.rateOrTierApplied || 'Active Tier'}
          </Badge>
        </div>
      </div>

      {/* TIER-BASED PROGRESS TRACKER */}
      {scenario === 'TIER_BASED' && (
        <div className="space-y-4 pt-1">
          {(() => {
            const tiers = [...(roleConfig.tierConfig?.tiers || [])].sort(
              (a, b) => a.minSalesAmount - b.minSalesAmount
            );

            // Find current reached tier and next tier
            let reachedTierIndex = -1;
            for (let i = 0; i < tiers.length; i++) {
              if (actualSales >= tiers[i].minSalesAmount) {
                reachedTierIndex = i;
              }
            }

            const currentTier = reachedTierIndex >= 0 ? tiers[reachedTierIndex] : null;
            const nextTier =
              reachedTierIndex < tiers.length - 1 ? tiers[reachedTierIndex + 1] : null;
            const maxTierAmount = tiers.length > 0 ? tiers[tiers.length - 1].minSalesAmount : 50000;
            const progressPercentage = Math.min(
              Math.round((actualSales / maxTierAmount) * 100),
              100
            );

            return (
              <>
                {/* Milestone Nodes Bar */}
                <div className="relative pt-6 pb-4">
                  {/* Background Track */}
                  <div className="absolute top-10 left-4 right-4 h-2 bg-slate-100 rounded-full" />
                  {/* Filled Progress Track */}
                  <div
                    className="absolute top-10 left-4 h-2 bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `calc(${Math.min(progressPercentage, 100)}% - 2rem)` }}
                  />

                  {/* Tier Nodes Grid */}
                  <div className="relative flex justify-between items-start gap-2">
                    {tiers.map((tier, idx) => {
                      const isReached = actualSales >= tier.minSalesAmount;
                      const isCurrent = reachedTierIndex === idx;

                      return (
                        <div
                          key={tier.id}
                          className="flex flex-col items-center text-center flex-1 min-w-0 px-1"
                        >
                          {/* Node Circle */}
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                              isReached
                                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                                : 'bg-white border-2 border-slate-300 text-slate-500'
                            } ${isCurrent ? 'ring-4 ring-indigo-200 border-indigo-600' : ''}`}
                          >
                            {isReached ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <span>T{idx + 1}</span>
                            )}
                          </div>

                          {/* Node Labels */}
                          <div className="mt-2 space-y-0.5">
                            <p
                              className={`text-xs font-semibold truncate ${
                                isReached ? 'text-emerald-700' : 'text-slate-700'
                              }`}
                            >
                              {tier.tierLabel || `Tier ${idx + 1}`}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              ≥ {formatCurrency(tier.minSalesAmount)}
                            </p>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 mt-0.5 ${
                                isReached
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {formatCurrency(tier.commissionReward)} Payout
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Motivational Helper Box */}
                <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-indigo-900 leading-relaxed">
                    {nextTier ? (
                      <>
                        {currentTier ? (
                          <span>
                            You have unlocked <strong>{currentTier.tierLabel || `Tier ${reachedTierIndex + 1}`}</strong> ({formatCurrency(currentTier.commissionReward)} payout)! Sell{' '}
                            <strong className="text-indigo-700">
                              {formatCurrency(nextTier.minSalesAmount - actualSales)}
                            </strong>{' '}
                            more to unlock <strong>{nextTier.tierLabel || `Tier ${reachedTierIndex + 2}`}</strong> ({formatCurrency(nextTier.commissionReward)} payout).
                          </span>
                        ) : (
                          <span>
                            Sell{' '}
                            <strong className="text-indigo-700">
                              {formatCurrency(nextTier.minSalesAmount - actualSales)}
                            </strong>{' '}
                            more to unlock your first milestone (<strong>{nextTier.tierLabel}</strong>) and secure a{' '}
                            <strong>{formatCurrency(nextTier.commissionReward)}</strong> commission payout!
                          </span>
                        )}
                      </>
                    ) : (
                      <span>
                        🎉 <strong>Maximum Sales Tier Achieved!</strong> You have reached the highest milestone with an earned commission payout of{' '}
                        <strong>{formatCurrency(currentTier?.commissionReward || 0)}</strong>.
                      </span>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* TARGET-BASED PROGRESS TRACKER */}
      {scenario === 'TARGET_BASED' && (
        <div className="space-y-4 pt-1">
          {(() => {
            const target = roleConfig.targetConfig?.targetSalesAmount || targetAmount || 50000;
            const rate = roleConfig.targetConfig?.commissionPercentage || 3.0;
            const progressPct = target > 0 ? Math.round((actualSales / target) * 100) : 0;
            const isExceeded = actualSales > target;
            const surplusAmount = Math.max(0, actualSales - target);
            const surplusEarned = Math.round(surplusAmount * (rate / 100));

            return (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-700">
                      Target Baseline: {formatCurrency(target)}
                    </span>
                    <span className="font-bold text-slate-900">
                      Current Sales: {formatCurrency(actualSales)} ({progressPct}%)
                    </span>
                  </div>

                  {/* Progress Bar with Surplus Zone */}
                  <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isExceeded ? 'bg-indigo-600' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    />
                    {isExceeded && (
                      <div
                        className="h-full bg-emerald-500 animate-pulse"
                        style={{ width: `${Math.min(progressPct - 100, 100)}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Helper Box */}
                <div
                  className={`p-3.5 rounded-lg border flex items-start gap-3 ${
                    isExceeded
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/70 border-amber-200 text-amber-950'
                  }`}
                >
                  <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-xs leading-relaxed">
                    {isExceeded ? (
                      <span>
                        🎯 <strong>Target Exceeded!</strong> You have surpassed your target by{' '}
                        <strong>{formatCurrency(surplusAmount)}</strong>. With a {rate}% surplus rate, you have earned{' '}
                        <strong>{formatCurrency(surplusEarned)}</strong> in surplus incentive bonus!
                      </span>
                    ) : (
                      <span>
                        You are at <strong>{progressPct}%</strong> of your monthly target. Sell{' '}
                        <strong>{formatCurrency(target - actualSales)}</strong> more to cross the target threshold and begin earning a{' '}
                        <strong>{rate}% bonus</strong> on surplus sales.
                      </span>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* COLLECTION-BASED PROGRESS TRACKER */}
      {scenario === 'COLLECTION_BASED' && (
        <div className="space-y-4 pt-1">
          {(() => {
            const rate = roleConfig.collectionConfig?.commissionPercentage || 2.5;
            const earned = Math.round(clearedCollections * (rate / 100));

            return (
              <>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Monthly Cleared Collections</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(clearedCollections)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Effective Rate</p>
                    <p className="text-sm font-bold text-indigo-600">{rate}% Direct Payout</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Earned Incentive</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(earned)}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
                  <DollarSign className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-indigo-900 leading-relaxed">
                    Every cleared dealer payment directly contributes <strong>{rate}%</strong> towards your monthly commission payout. Uncollected or pending cheques do not qualify until verified and deposited.
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
