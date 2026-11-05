import React, { useState, useMemo } from 'react';
import { SubordinateRepPerformanceItem } from '../../types/commission';
import { formatCurrency } from '../../utils/formatters';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Eye } from 'lucide-react';

interface SubordinateRepsTableProps {
  reps: SubordinateRepPerformanceItem[];
  onViewRep: (repId: string) => void;
}

export function SubordinateRepsTable({ reps, onViewRep }: SubordinateRepsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReps = useMemo(() => {
    return reps.filter((rep) =>
      rep.repName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [reps, searchQuery]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header & Search */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Sales Representative Performance & Incentive Leaderboard
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ranked by cash collected and realization rate. Click "View Ledger" to inspect individual deal records.
          </p>
        </div>

        <div className="relative min-w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search representative..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs border-slate-200"
          />
        </div>
      </div>

      {/* Leaderboard Table (No Target Column, No Gimmick Badges) */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/75">
            <TableRow className="border-b border-slate-200">
              <TableHead className="w-16 text-center text-xs font-semibold text-slate-600">Rank</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">Representative</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 text-right">Sales Generated</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 text-right">Cash Collected</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 min-w-36">Collection Rate</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 text-right">Rep Earned Incentive</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 text-right w-28">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-xs text-slate-500">
                  No sales representatives found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredReps.map((rep) => {
                return (
                  <TableRow key={rep.repId} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                    {/* Rank */}
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center justify-center h-6 w-6 rounded-md text-xs font-semibold ${
                          rep.rank === 1
                            ? 'bg-slate-900 text-white'
                            : rep.rank === 2
                            ? 'bg-slate-200 text-slate-800'
                            : rep.rank === 3
                            ? 'bg-slate-100 text-slate-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {rep.rank}
                      </span>
                    </TableCell>

                    {/* Rep Name */}
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900">{rep.repName}</div>
                      <div className="text-[11px] text-slate-500">Sales Representative</div>
                    </TableCell>

                    {/* Sales Generated */}
                    <TableCell className="text-xs font-medium text-slate-800 text-right">
                      {formatCurrency(rep.actualSales)}
                    </TableCell>

                    {/* Cash Collected */}
                    <TableCell className="text-xs font-semibold text-slate-900 text-right">
                      {formatCurrency(rep.collectedCash)}
                    </TableCell>

                    {/* Collection Rate */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-700">{rep.cashRealizationPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${Math.min(rep.cashRealizationPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* Rep Earned Incentive */}
                    <TableCell className="text-xs font-bold text-emerald-600 text-right">
                      {formatCurrency(rep.earnedCommission)}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewRep(rep.repId)}
                        className="h-7 text-xs px-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" /> View Ledger
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
