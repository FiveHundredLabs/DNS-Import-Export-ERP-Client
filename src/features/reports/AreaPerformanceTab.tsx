import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { MapPin, Target, Users, Building2, TrendingUp, Trophy } from 'lucide-react';
import { AreaPerformanceReport } from '../../types/reports';
import { User } from '../../types/auth';
import { MOCK_AREAS } from '../../mock/mockAreas';
import { formatCurrencyLKR } from '../../utils/exportUtils';

interface AreaPerformanceTabProps {
  areaPerformance: AreaPerformanceReport | null;
  selectedAreaId: string;
  onAreaSelect: (areaId: string) => void;
  user: User | null;
}

export function AreaPerformanceTab({
  areaPerformance,
  selectedAreaId,
  onAreaSelect,
  user,
}: AreaPerformanceTabProps) {
  const isAreaLocked = user?.role === 'AREA_MANAGER';

  if (!areaPerformance) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
        <p className="text-sm text-slate-500">No regional performance data found for this territory.</p>
      </div>
    );
  }

  const isTargetAchieved = areaPerformance.achievementPercentage >= 100;

  return (
    <div className="space-y-6">
      {/* Area Selector & Header Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{areaPerformance.areaName}</h2>
              <p className="text-xs text-slate-500">
                Region: {areaPerformance.region} | Area Manager: {areaPerformance.areaManagerName || 'Assigned Manager'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isAreaLocked && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Switch Territory:</span>
              <select
                value={selectedAreaId}
                onChange={(e) => onAreaSelect(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {MOCK_AREAS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>
          )}
          {isAreaLocked && (
            <Badge variant="outline" className="text-xs font-semibold text-indigo-700 bg-indigo-50">
              Territory Locked to Assigned Area
            </Badge>
          )}
        </div>
      </div>

      {/* Target vs Achievement Banner */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Territory Target
              </span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {formatCurrencyLKR(areaPerformance.totalTarget)}
              </p>
              <span className="text-xs text-slate-400 mt-1 block">Aggregated monthly goal</span>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Achieved Sales
              </span>
              <p className="text-2xl font-extrabold text-indigo-600 mt-1">
                {formatCurrencyLKR(areaPerformance.totalSales)}
              </p>
              <span className="text-xs text-slate-400 mt-1 block">Invoices + Territory POS</span>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Collections
              </span>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                {formatCurrencyLKR(areaPerformance.totalCollections)}
              </p>
              <span className="text-xs text-slate-400 mt-1 block">Approved payment receipts</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-semibold text-slate-500">Achievement Rate</span>
              <p
                className={`text-2xl font-black mt-1 ${
                  isTargetAchieved ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {areaPerformance.achievementPercentage}%
              </p>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isTargetAchieved ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, areaPerformance.achievementPercentage)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Rep Leaderboard in Territory */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Sales Rep Territory Performance</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {areaPerformance.repPerformance.length} Reps
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaPerformance.repPerformance.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No sales representatives active in this area.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Sales Rep</th>
                      <th className="py-2.5 px-3 text-right">Target (LKR)</th>
                      <th className="py-2.5 px-3 text-right">Sales (LKR)</th>
                      <th className="py-2.5 px-3 text-center">% Achieved</th>
                      <th className="py-2.5 px-3 text-right">Collections</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {areaPerformance.repPerformance.map((rep) => (
                      <tr key={rep.repId} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{rep.repName}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {formatCurrencyLKR(rep.target)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrencyLKR(rep.sales)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant={rep.achievementPercentage >= 100 ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {rep.achievementPercentage}%
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                          {formatCurrencyLKR(rep.collections)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Territory Dealers / Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Top Regional Dealers & Accounts</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {areaPerformance.topCustomers.length} Accounts
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaPerformance.topCustomers.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No customer accounts found in this territory.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3 text-right">Purchases (LKR)</th>
                      <th className="py-2.5 px-3 text-right">Outstanding (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {areaPerformance.topCustomers.slice(0, 10).map((c) => (
                      <tr key={c.customerId} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{c.customerName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{c.customerCode}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrencyLKR(c.totalSales)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                          {formatCurrencyLKR(c.outstandingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
