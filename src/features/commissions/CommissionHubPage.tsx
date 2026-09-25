import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { RepCommissionSummary, CommissionRule, SalesTarget } from '../../types/commission';
import { commissionService } from '../../services/CommissionService';
import { CreateTargetModal } from './CreateTargetModal';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/formatters';
import {
  TrendingUp,
  Target,
  Award,
  DollarSign,
  Trophy,
  CheckCircle,
  PlusCircle,
  BarChart2,
  Users,
} from 'lucide-react';

export function CommissionHubPage() {
  const { role, currentUser } = useAuth();
  const [selectedRepId, setSelectedRepId] = useState<string>(
    role === 'SALES_REP' ? currentUser.id : 'usr-106'
  );
  const [summary, setSummary] = useState<RepCommissionSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<RepCommissionSummary[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const canConfigure =
    role === 'DIRECTOR' || role === 'MANAGER' || role === 'SALES_MANAGER';

  const loadData = async () => {
    try {
      setLoading(true);
      const [sum, board, commissionRules] = await Promise.all([
        commissionService.getRepCommissionSummary(selectedRepId),
        commissionService.getLeaderboard(),
        commissionService.getRules(),
      ]);
      setSummary(sum);
      setLeaderboard(board);
      setRules(commissionRules);
    } catch (err) {
      console.error('Failed to load commission data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedRepId]);

  const achievementPct = summary?.achievementPercentage || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Sales Target & Commission Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tiered commission calculations, sales target tracking, and territory leaderboards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canConfigure && (
            <>
              <select
                value={selectedRepId}
                onChange={(e) => setSelectedRepId(e.target.value)}
                className="rounded-md border border-slate-300 text-xs h-9 px-2.5 bg-white text-slate-700 font-medium"
              >
                {leaderboard.map((r) => (
                  <option key={r.salesRepId} value={r.salesRepId}>
                    {r.salesRepName}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => setIsConfigOpen(true)}
                className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs h-9 gap-1.5 shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                Configure Target
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Target Progress & Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Assigned Target
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {formatCurrency(summary.targetAmount)}
            </span>
            <span className="text-[11px] text-slate-400 mt-2 block">
              Period: {summary.period}
            </span>
          </Card>

          <Card className="p-4 bg-white border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Sales Achieved
            </span>
            <span className="text-2xl font-bold text-primary mt-1 block">
              {formatCurrency(summary.achievedAmount)}
            </span>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Progress</span>
              <span className="font-bold text-primary-text">{summary.achievementPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  achievementPct >= 120
                    ? 'bg-purple-600'
                    : achievementPct >= 100
                    ? 'bg-emerald-600'
                    : achievementPct >= 80
                    ? 'bg-primary'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, achievementPct)}%` }}
              />
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Earned Commission
            </span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              {formatCurrency(summary.earnedCommission)}
            </span>
            <span className="text-[11px] font-semibold text-emerald-800 mt-2 inline-flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> {summary.tierName}
            </span>
          </Card>

          <Card className="p-4 bg-white border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Commission Payout Status
            </span>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Paid Out:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(summary.paidCommission)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pending Approval:</span>
                <span className="font-bold text-amber-700">
                  {formatCurrency(summary.pendingCommission)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tier Structure Ladder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Enterprise Sales Commission Tier Policy (Sections 24 & 45)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {rules.map((rule) => {
              const isCurrent =
                achievementPct >= rule.minAchievementPercentage &&
                achievementPct <= rule.maxAchievementPercentage;

              return (
                <div
                  key={rule.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'border-primary bg-primary-light/50 shadow-xs ring-1 ring-primary'
                      : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900">{rule.tierName}</span>
                    {isCurrent && (
                      <Badge variant="default" className="text-[10px] bg-primary">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Threshold: {rule.minAchievementPercentage}%
                    {rule.maxAchievementPercentage < 1000
                      ? ` - ${Math.floor(rule.maxAchievementPercentage)}%`
                      : '+'}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-800">
                    Rate: {rule.commissionRatePercentage}% of sales
                  </div>
                  {rule.bonusAmount > 0 && (
                    <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                      + {formatCurrency(rule.bonusAmount)} Bonus
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Sales Representative Performance Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading leaderboard...</div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] text-center">Rank</TableHead>
                    <TableHead>Sales Representative</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Sales Achieved</TableHead>
                    <TableHead className="text-center">Achievement %</TableHead>
                    <TableHead>Tier Bracket</TableHead>
                    <TableHead className="text-right">Earned Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((rep, idx) => (
                    <TableRow
                      key={rep.salesRepId}
                      className={rep.salesRepId === selectedRepId ? 'bg-primary-light/40 font-medium' : ''}
                    >
                      <TableCell className="text-center font-bold text-xs text-slate-500">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => setSelectedRepId(rep.salesRepId)}
                          className="text-xs font-semibold text-primary hover:underline text-left"
                        >
                          {rep.salesRepName}
                        </button>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-600">
                        {formatCurrency(rep.targetAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                        {formatCurrency(rep.achievedAmount)}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs">
                        <span
                          className={
                            rep.achievementPercentage >= 100
                              ? 'text-emerald-700'
                              : rep.achievementPercentage >= 80
                              ? 'text-blue-700'
                              : 'text-amber-700'
                          }
                        >
                          {rep.achievementPercentage}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {rep.tierName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-700">
                        {formatCurrency(rep.earnedCommission)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTargetModal
        open={isConfigOpen}
        onOpenChange={setIsConfigOpen}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
